#!/usr/bin/env bash
# Issue #24 Wave 3 — remove legacy dev Cloud SQL after hub cutover is stable (24–48h).
# Run ONLY after terragrunt apply with cloud_sql_source = external and domain smoke passes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/load-env.sh"

INSTANCE="${INSTANCE:-mikasa-load-management-mysql-dev}"
REGION="${GCP_REGION:-asia-northeast1}"
WEB_LOGIN_URL="${WEB_LOGIN_URL:-https://mikasa.vw-dev.com/login}"
API_HEALTH_URL="${API_HEALTH_URL:-https://mikasa-api.vw-dev.com/health}"
API_ME_URL="${API_ME_URL:-https://mikasa-api.vw-dev.com/v1/auth/me}"
API_PROJECTS_URL="${API_PROJECTS_URL:-https://mikasa-api.vw-dev.com/v1/projects}"
DEV_TENANT="${DEV_TENANT:-01HZXEXAMPLE00000000000000}"
DEV_USER="${DEV_USER:-dev-user}"

smoke_check() {
  local label="$1"
  local url="$2"
  shift 2
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" "$@")
  echo "${label} → HTTP ${code}"
  [[ "$code" == "200" ]] || return 1
}

echo "==> Confirm dev app is on hub (domain smoke)"
smoke_check "GET /login" "$WEB_LOGIN_URL"
smoke_check "GET /health" "$API_HEALTH_URL"
smoke_check "GET /v1/auth/me" "$API_ME_URL" \
  -H "X-Dev-Tenant-Id: ${DEV_TENANT}" -H "X-Dev-User-Id: ${DEV_USER}"
smoke_check "GET /v1/projects" "$API_PROJECTS_URL" \
  -H "X-Dev-Tenant-Id: ${DEV_TENANT}" -H "X-Dev-User-Id: ${DEV_USER}"

echo "==> Disable deletion protection on ${INSTANCE}"
if ! gcloud sql instances describe "$INSTANCE" --project="$GCP_PROJECT_ID" &>/dev/null; then
  echo "Instance ${INSTANCE} not found — already decommissioned (OK)."
  exit 0
fi
gcloud sql instances patch "$INSTANCE" \
  --project="$GCP_PROJECT_ID" \
  --no-deletion-protection \
  --quiet

echo "==> Delete instance ${INSTANCE}"
gcloud sql instances delete "$INSTANCE" \
  --project="$GCP_PROJECT_ID" \
  --quiet

echo "Decommission complete. Terraform state should already omit managed dev SQL (cloud_sql_source = external)."
