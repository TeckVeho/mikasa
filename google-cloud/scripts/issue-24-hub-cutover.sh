#!/usr/bin/env bash
# Issue #24 Wave 2 — import to hub + update Dev Cloud Run Cloud SQL + hub VPC + domain smoke.
# Prereq: Wave 0 dump, Wave 1 hub DB/user, hub IAM for runtime SA (roles/cloudsql.client on gcp-dev-sql-hub).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/load-env.sh"

HUB_PROJECT="${HUB_PROJECT:-gcp-dev-sql-hub}"
HUB_INSTANCE="${HUB_INSTANCE:-dev-sql-hub}"
HUB_CONNECTION="${HUB_CONNECTION:-gcp-dev-sql-hub:asia-northeast1:dev-sql-hub}"
HUB_DB="${HUB_DB:-mikasa_load_management_dev}"
HUB_NETWORK="${HUB_NETWORK:-projects/gcp-dev-sql-hub/global/networks/dev-sql-hub-vpc}"
HUB_SUBNET="${HUB_SUBNET:-projects/gcp-dev-sql-hub/regions/asia-northeast1/subnetworks/dev-sql-hub-subnet}"
REGION="${GCP_REGION:-asia-northeast1}"
IMPORT_GCS_URI="${IMPORT_GCS_URI:-gs://mikasa-load-management-sql-migrate/issue-24/mikasa-dev.sql}"
API_SERVICE="${API_SERVICE:-mikasa-load-management-api-dev}"
MIGRATE_JOB="${MIGRATE_JOB:-mikasa-load-management-migrate-dev}"
SECRET_ID="${SECRET_ID:-mikasa-load-management-database-url-dev}"
WEB_LOGIN_URL="${WEB_LOGIN_URL:-https://mikasa.vw-dev.com/login}"
API_HEALTH_URL="${API_HEALTH_URL:-https://mikasa-api.vw-dev.com/health}"
API_ME_URL="${API_ME_URL:-https://mikasa-api.vw-dev.com/v1/auth/me}"
API_PROJECTS_URL="${API_PROJECTS_URL:-https://mikasa-api.vw-dev.com/v1/projects}"
DEV_TENANT="${DEV_TENANT:-01HZXEXAMPLE00000000000000}"
DEV_USER="${DEV_USER:-dev-user}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL (hub socket URL) before running cutover secret update." >&2
  echo 'Example: mysql://USER:PASS@localhost/mikasa_load_management_dev?socket=/cloudsql/gcp-dev-sql-hub:asia-northeast1:dev-sql-hub' >&2
  exit 1
fi

DATABASE_URL="$(
  python3 - "$DATABASE_URL" <<'PY'
import sys, urllib.parse, re
url = sys.argv[1].strip()
m = re.match(r'^(mysql://)([^/@]+)(@.+)$', url)
if not m:
    print(url)
    raise SystemExit
prefix, userinfo, rest = m.groups()
if ':' in userinfo:
    user, pwd = userinfo.split(':', 1)
    pwd = urllib.parse.quote(pwd, safe='')
    print(f"{prefix}{user}:{pwd}{rest}")
else:
    print(url)
PY
)"

if [[ "${SKIP_IMPORT:-}" != "1" ]]; then
  echo "==> Import into hub ${HUB_INSTANCE}/${HUB_DB}"
  gcloud sql import sql "$HUB_INSTANCE" "$IMPORT_GCS_URI" \
    --database="$HUB_DB" --project="$HUB_PROJECT" --quiet
else
  echo "==> SKIP_IMPORT=1 — skipping SQL import"
fi

echo "==> Update Secret Manager ${SECRET_ID}"
echo -n "$DATABASE_URL" | gcloud secrets versions add "$SECRET_ID" \
  --project="$GCP_PROJECT_ID" --data-file=-

echo "==> Cloud Run API + migrate job → hub connection + hub VPC"
for target in service:"$API_SERVICE" job:"$MIGRATE_JOB"; do
  kind="${target%%:*}"
  name="${target#*:}"
  if [[ "$kind" == "service" ]]; then
    gcloud run services update "$name" \
      --project="$GCP_PROJECT_ID" --region="$REGION" \
      --network="$HUB_NETWORK" --subnet="$HUB_SUBNET" \
      --vpc-egress=private-ranges-only \
      --set-cloudsql-instances="$HUB_CONNECTION"
  else
    if gcloud run jobs describe "$name" --project="$GCP_PROJECT_ID" --region="$REGION" &>/dev/null; then
      gcloud run jobs update "$name" \
        --project="$GCP_PROJECT_ID" --region="$REGION" \
        --network="$HUB_NETWORK" --subnet="$HUB_SUBNET" \
        --vpc-egress=private-ranges-only \
        --set-cloudsql-instances="$HUB_CONNECTION"
    else
      echo "Skip missing job ${name}"
    fi
  fi
done

echo "==> Pause dev SQL schedule jobs (if present)"
for job in mikasa-load-management-sql-start-dev mikasa-load-management-sql-stop-dev; do
  if gcloud scheduler jobs describe "$job" --project="$GCP_PROJECT_ID" --location="$REGION" &>/dev/null; then
    gcloud scheduler jobs pause "$job" --project="$GCP_PROJECT_ID" --location="$REGION" || true
  fi
done

smoke_check() {
  local label="$1"
  local url="$2"
  shift 2
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" "$@")
  echo "${label} → HTTP ${code}"
  [[ "$code" == "200" ]] || return 1
}

echo "==> Domain smoke (vw-dev.com)"
smoke_check "GET /login" "$WEB_LOGIN_URL"
smoke_check "GET /health" "$API_HEALTH_URL"
smoke_check "GET /v1/auth/me" "$API_ME_URL" \
  -H "X-Dev-Tenant-Id: ${DEV_TENANT}" -H "X-Dev-User-Id: ${DEV_USER}"
smoke_check "GET /v1/projects" "$API_PROJECTS_URL" \
  -H "X-Dev-Tenant-Id: ${DEV_TENANT}" -H "X-Dev-User-Id: ${DEV_USER}"

echo "Cutover complete. Next: Wave 3 terragrunt apply (cloud_sql_source = external) + decommission script after stable."
