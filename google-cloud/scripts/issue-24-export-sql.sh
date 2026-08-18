#!/usr/bin/env bash
# Issue #24 Wave 0 — export Dev Cloud SQL to local disk (+ GCS).
# Prereq: gcloud auth login; source google-cloud/scripts/load-env.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=load-env.sh
source "${SCRIPT_DIR}/load-env.sh"

REGION="${GCP_REGION:-asia-northeast1}"
DUMP_DIR="${DUMP_DIR:-./backups/issue-24-$(date +%Y%m%d)}"
DEV_INSTANCE="${DEV_INSTANCE:-mikasa-load-management-mysql-dev}"
DEV_DB="${DEV_DB:-mikasa-load-management-mysql-dev}"
DEV_GCS_URI="${DEV_GCS_URI:-gs://mikasa-load-management-sql-migrate/issue-24/mikasa-dev.sql}"

mkdir -p "$DUMP_DIR"

strip_mysqldump_db_header() {
  local f="$1"
  python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8", errors="replace").read()
pat = r"\n--\n-- Current Database: `[^`]+`\n--\n\nCREATE DATABASE[^;]+;\n\nUSE `[^`]+`;\n"
new, n = re.subn(pat, "\n", text, count=1)
if n != 1:
    sys.exit(f"strip_mysqldump_db_header: expected 1 match in {path}, got {n}")
open(path, "w", encoding="utf-8").write(new)
PY
}

echo "==> Export Dev: ${DEV_INSTANCE} / ${DEV_DB}"
gcloud sql export sql "$DEV_INSTANCE" "$DEV_GCS_URI" \
  --database="$DEV_DB" --project="$GCP_PROJECT_ID" --offload

echo "==> Download to ${DUMP_DIR}"
gcloud storage cp "$DEV_GCS_URI" "${DUMP_DIR}/mikasa-dev.sql"

strip_mysqldump_db_header "${DUMP_DIR}/mikasa-dev.sql"

gcloud storage cp "${DUMP_DIR}/mikasa-dev.sql" "$DEV_GCS_URI"

size=$(wc -c <"${DUMP_DIR}/mikasa-dev.sql" | tr -d ' ')
if [[ "$size" -le 0 ]]; then
  echo "ERROR: dump empty: ${DUMP_DIR}/mikasa-dev.sql" >&2
  exit 1
fi
echo "OK: ${DUMP_DIR}/mikasa-dev.sql ($size bytes)"
echo "Dumps ready in ${DUMP_DIR}"
