#!/usr/bin/env bash
# Post-cutover smoke for issue #28 (health check).
set -euo pipefail

API_URL="${API_URL:-}"

if [[ -z "${API_URL}" ]]; then
  echo "Set API_URL (e.g. https://mikasa-load-management-api-dev-....run.app)" >&2
  exit 1
fi

code="$(curl -sS -o /tmp/mikasa-health.json -w "%{http_code}" "${API_URL%/}/health")"
echo "GET /health -> ${code}"
cat /tmp/mikasa-health.json
echo ""
[[ "${code}" == "200" ]] || exit 1
