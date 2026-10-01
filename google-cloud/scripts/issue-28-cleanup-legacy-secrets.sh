#!/usr/bin/env bash
# Disable extra ENABLED versions / delete legacy secrets after bundle cutover (issue #28).
# Default: DRY_RUN=1 (print only). Set DRY_RUN=0 to execute.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-mikasa-load-management}"
DRY_RUN="${DRY_RUN:-1}"

legacy_secrets=(
  "mikasa-firebase-private-key-dev"
  "mikasa-firebase-client-email-dev"
)

for secret in "${legacy_secrets[@]}"; do
  if ! gcloud secrets describe "${secret}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "skip (missing): ${secret}"
    continue
  fi
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] would delete secret: ${secret}"
  else
    gcloud secrets delete "${secret}" --project="${PROJECT_ID}" --quiet
    echo "deleted: ${secret}"
  fi
done

echo "Remember: keep only 1 ENABLED version per remaining secret (gcloud secrets versions disable ...)."
