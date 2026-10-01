#!/usr/bin/env bash
# Disable extra ENABLED secret versions (issue #28). Keeps VERSION_TO_KEEP if set.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-mikasa-load-management}"
SECRET_ID="${1:-}"
VERSION_TO_KEEP="${VERSION_TO_KEEP:-}"

if [[ -z "${SECRET_ID}" ]]; then
  echo "Usage: VERSION_TO_KEEP=3 $0 mikasa-load-management-database-url-dev" >&2
  exit 1
fi

while IFS= read -r ver; do
  [[ -z "${ver}" ]] && continue
  if [[ -n "${VERSION_TO_KEEP}" && "${ver}" == "${VERSION_TO_KEEP}" ]]; then
    continue
  fi
  echo "Disabling version ${ver} on ${SECRET_ID}"
  gcloud secrets versions disable "${ver}" --secret="${SECRET_ID}" --project="${PROJECT_ID}"
done < <(gcloud secrets versions list "${SECRET_ID}" --project="${PROJECT_ID}" --filter="state=ENABLED" --format="value(name)" | tr -d '\r')
