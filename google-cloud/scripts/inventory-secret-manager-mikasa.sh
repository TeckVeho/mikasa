#!/usr/bin/env bash
# Inventory Secret Manager for mikasa-load-management (issue #28).
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-mikasa-load-management}"

echo "==> Project: ${PROJECT_ID}"
echo "==> Secrets"
gcloud secrets list --project="${PROJECT_ID}" --format="table(name,replication.automatic,createTime)"

echo ""
echo "==> ENABLED versions per secret"
while IFS= read -r secret; do
  [[ -z "${secret}" ]] && continue
  count="$(gcloud secrets versions list "${secret}" --project="${PROJECT_ID}" --filter="state=ENABLED" --format="value(name)" | wc -l | tr -d ' ')"
  echo "${secret}: ENABLED versions=${count}"
done < <(gcloud secrets list --project="${PROJECT_ID}" --format="value(name)")
