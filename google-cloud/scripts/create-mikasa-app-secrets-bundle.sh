#!/usr/bin/env bash
# Create or update mikasa app-secrets bundle (issue #28). Values must NOT be committed.
#
# Usage:
#   ENV_SUFFIX=dev REGION=asia-northeast1 ./create-mikasa-app-secrets-bundle.sh /path/to/app.env
#
# app.env example:
#   FIREBASE_CLIENT_EMAIL=...
#   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-mikasa-load-management}"
ENV_SUFFIX="${ENV_SUFFIX:-dev}"
REGION="${REGION:-asia-northeast1}"
SECRET_ID="${SECRET_ID:-mikasa-app-secrets-${ENV_SUFFIX}}"
BUNDLE_FILE="${1:-}"

if [[ -z "${BUNDLE_FILE}" || ! -f "${BUNDLE_FILE}" ]]; then
  echo "Usage: $0 /path/to/app.env" >&2
  exit 1
fi

if ! gcloud secrets describe "${SECRET_ID}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud secrets create "${SECRET_ID}" \
    --project="${PROJECT_ID}" \
    --replication-policy="user-managed" \
    --locations="${REGION}"
fi

gcloud secrets versions add "${SECRET_ID}" \
  --project="${PROJECT_ID}" \
  --data-file="${BUNDLE_FILE}"

echo "Added version to ${SECRET_ID}. Disable old ENABLED versions after cutover smoke pass."
