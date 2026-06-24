#!/usr/bin/env bash
# Setup Workload Identity Federation + IAM for GitHub Actions CD (single GCP project).
#
# Target layout: dx-logivoice (build + Artifact Registry + Cloud Run deploy in one project).
# Implements: google-cloud/cloudbuild/GITHUB_ACTIONS_WIF.md
#
# Prerequisites:
#   - gcloud CLI authenticated (roles/owner or equivalent on PROJECT_ID)
#   - Bootstrap Terraform applied (Artifact Registry repo {project_id}-docker)
#
# Usage:
#   ./google-cloud/scripts/setup-github-actions-wif.sh
#   ./google-cloud/scripts/setup-github-actions-wif.sh --dry-run
#   GITHUB_REPO=TeckVeho/LogiVoice ./google-cloud/scripts/setup-github-actions-wif.sh
#
# Override defaults via environment:
#   PROJECT_ID, REGION, GITHUB_REPO, POOL_ID, PROVIDER_ID, SA_ID, ARTIFACT_REPO_ID

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Defaults (dx-logivoice single-project) ---
PROJECT_ID="${PROJECT_ID:-dx-logivoice}"
REGION="${REGION:-asia-northeast1}"
GITHUB_REPO="${GITHUB_REPO:-TeckVeho/LogiVoice}"
POOL_ID="${POOL_ID:-github-pool}"
PROVIDER_ID="${PROVIDER_ID:-github-provider}"
SA_ID="${SA_ID:-github-actions-logivoice}"
ARTIFACT_REPO_ID="${ARTIFACT_REPO_ID:-${PROJECT_ID}-docker}"

DRY_RUN=false

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  echo
  echo "Options:"
  echo "  --dry-run          Print commands without executing"
  echo "  --project-id ID    GCP project (default: dx-logivoice)"
  echo "  --github-repo O/R  GitHub repo for WIF (default: TeckVeho/LogiVoice)"
  echo "  --sa-id ID         Service account id (default: github-actions-logivoice)"
  echo "  -h, --help         Show this help"
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }

run() {
  if [[ "$DRY_RUN" == true ]]; then
    printf '[dry-run] %q' "$1"
    shift
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

ensure_api_enabled() {
  local api="$1"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud services enable "$api" --project="$PROJECT_ID"
    return
  fi
  if gcloud services list --enabled --project="$PROJECT_ID" --filter="name:$api" --format='value(name)' | grep -q "$api"; then
    log "API already enabled: $api"
  else
    log "Enabling API: $api"
    gcloud services enable "$api" --project="$PROJECT_ID"
  fi
}

ensure_project_iam_binding() {
  local member="$1"
  local role="$2"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="$member" --role="$role" --condition=None
    return
  fi
  if gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" \
    --filter="bindings.role:$role AND bindings.members:$member" --format='value(bindings.role)' \
    | grep -q "$role"; then
    log "Project IAM already has $role for $member"
  else
    log "Granting $role to $member on $PROJECT_ID"
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="$member" --role="$role" --condition=None >/dev/null
  fi
}

ensure_artifact_repo_writer() {
  local member="$1"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO_ID" \
      --project="$PROJECT_ID" --location="$REGION" \
      --member="$member" --role="roles/artifactregistry.writer"
    return
  fi
  if gcloud artifacts repositories get-iam-policy "$ARTIFACT_REPO_ID" \
    --project="$PROJECT_ID" --location="$REGION" \
    --flatten="bindings[].members" \
    --filter="bindings.role:roles/artifactregistry.writer AND bindings.members:$member" \
    --format='value(bindings.role)' 2>/dev/null | grep -q artifactregistry.writer; then
    log "Artifact Registry writer already granted for $member on $ARTIFACT_REPO_ID"
  else
    log "Granting roles/artifactregistry.writer on $ARTIFACT_REPO_ID to $member"
    gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO_ID" \
      --project="$PROJECT_ID" --location="$REGION" \
      --member="$member" --role="roles/artifactregistry.writer" >/dev/null
  fi
}

normalize_sa_email() {
  local raw="$1"
  # gcloud builds list may return full resource name:
  #   projects/PROJECT/serviceAccounts/EMAIL
  if [[ "$raw" == projects/*/serviceAccounts/* ]]; then
    raw="${raw##*/}"
  fi
  # Strip optional serviceAccount: prefix if present.
  raw="${raw#serviceAccount:}"
  printf '%s' "$raw"
}

detect_cloudbuild_execution_sa() {
  local sa=""
  if [[ "$DRY_RUN" != true ]]; then
    sa="$(gcloud builds list --project="$PROJECT_ID" --limit=1 \
      --format='value(serviceAccount)' 2>/dev/null || true)"
    sa="$(normalize_sa_email "$sa")"
  fi
  if [[ -n "$sa" ]]; then
    if [[ "$DRY_RUN" == true ]] || gcloud iam service-accounts describe "$sa" --project="$PROJECT_ID" >/dev/null 2>&1; then
      printf '%s' "$sa"
      return
    fi
    warn "Build history SA not found in project, falling back: $sa"
  fi

  local candidates=(
    "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
  )
  for sa in "${candidates[@]}"; do
    if [[ "$DRY_RUN" == true ]] || gcloud iam service-accounts describe "$sa" --project="$PROJECT_ID" >/dev/null 2>&1; then
      printf '%s' "$sa"
      return
    fi
  done

  # Default for new projects (Compute Engine default SA).
  printf '%s' "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --project-id) PROJECT_ID="$2"; shift ;;
    --github-repo) GITHUB_REPO="$2"; shift ;;
    --sa-id) SA_ID="$2"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

ARTIFACT_REPO_ID="${ARTIFACT_REPO_ID:-${PROJECT_ID}-docker}"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

log "Project: $PROJECT_ID | GitHub repo: $GITHUB_REPO | SA: $SA_EMAIL"
[[ "$DRY_RUN" == true ]] && warn "Dry-run mode — no changes will be applied"

if [[ "$DRY_RUN" == true ]]; then
  PROJECT_NUMBER="${PROJECT_NUMBER:-000000000000}"
else
  if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Cannot access project '$PROJECT_ID'. Run: gcloud auth login && gcloud config set project $PROJECT_ID" >&2
    exit 1
  fi
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
fi
WIF_PROVIDER="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

# --- Step 0: Enable APIs ---
log "Step 0 — Enable required APIs"
for api in \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  run.googleapis.com \
  logging.googleapis.com; do
  ensure_api_enabled "$api"
done

# --- Step 1: Workload Identity Pool ---
log "Step 1 — Workload Identity pool: $POOL_ID"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" --location="global" --display-name="GitHub Actions"
else
  if gcloud iam workload-identity-pools describe "$POOL_ID" \
    --project="$PROJECT_ID" --location="global" >/dev/null 2>&1; then
    log "Pool already exists: $POOL_ID"
  else
    gcloud iam workload-identity-pools create "$POOL_ID" \
      --project="$PROJECT_ID" --location="global" --display-name="GitHub Actions"
  fi
fi

# --- Step 2: OIDC provider ---
log "Step 2 — OIDC provider: $PROVIDER_ID (repo: $GITHUB_REPO)"
ATTR_CONDITION="assertion.repository == '${GITHUB_REPO}'"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" --location="global" \
    --workload-identity-pool="$POOL_ID" --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
    --attribute-condition="$ATTR_CONDITION"
else
  if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project="$PROJECT_ID" --location="global" \
    --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
    log "Provider already exists: $PROVIDER_ID (update attribute-condition manually if repo changed)"
  else
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
      --project="$PROJECT_ID" --location="global" \
      --workload-identity-pool="$POOL_ID" --display-name="GitHub OIDC" \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
      --attribute-condition="$ATTR_CONDITION"
  fi
fi

# --- Step 4: Service account ---
log "Step 4 — Service account: $SA_EMAIL"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam service-accounts create "$SA_ID" \
    --project="$PROJECT_ID" --display-name="GitHub Actions LogiVoice"
else
  if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Service account already exists: $SA_EMAIL"
  else
    gcloud iam service-accounts create "$SA_ID" \
      --project="$PROJECT_ID" --display-name="GitHub Actions LogiVoice"
  fi
fi

# --- Step 5: WIF → SA binding ---
log "Step 5 — Allow $GITHUB_REPO to impersonate $SA_EMAIL"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project="$PROJECT_ID" --role="roles/iam.workloadIdentityUser" \
    --member="$WIF_MEMBER"
else
  gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project="$PROJECT_ID" --role="roles/iam.workloadIdentityUser" \
    --member="$WIF_MEMBER" >/dev/null
fi

# --- Step 6a: Federated SA (submits Cloud Build) ---
log "Step 6a — IAM for federated SA (GitHub Actions submitter)"
FED_MEMBER="serviceAccount:${SA_EMAIL}"
for role in \
  roles/serviceusage.serviceUsageConsumer \
  roles/cloudbuild.builds.editor \
  roles/iam.serviceAccountUser \
  roles/artifactregistry.writer \
  roles/storage.admin \
  roles/run.admin; do
  ensure_project_iam_binding "$FED_MEMBER" "$role"
done

# --- Step 6b: Cloud Build execution SA (build steps + gcloud run deploy) ---
CLOUDBUILD_SA="$(detect_cloudbuild_execution_sa)"
log "Step 6b — IAM for Cloud Build execution SA: $CLOUDBUILD_SA"
CB_MEMBER="serviceAccount:${CLOUDBUILD_SA}"
for role in \
  roles/storage.objectAdmin \
  roles/artifactregistry.writer \
  roles/logging.logWriter \
  roles/run.admin \
  roles/iam.serviceAccountUser; do
  ensure_project_iam_binding "$CB_MEMBER" "$role"
done

log "Step 6c — Artifact Registry repo writer on $ARTIFACT_REPO_ID"
ensure_artifact_repo_writer "$CB_MEMBER"
ensure_artifact_repo_writer "$FED_MEMBER"

# --- Summary ---
cat <<EOF

================================================================================
Setup complete for single-project layout: ${PROJECT_ID}
================================================================================

GitHub → Settings → Environments → [develop | staging | production]

Secrets (per environment):
  GCP_WORKLOAD_IDENTITY_PROVIDER=${WIF_PROVIDER}
  GCP_SERVICE_ACCOUNT=${SA_EMAIL}
  GCP_PROJECT_ID=${PROJECT_ID}

Variables (single-project — leave AR/DEPLOY empty or set both to ${PROJECT_ID}):
  GCP_AR_PROJECT_ID=${PROJECT_ID}          # optional; omit for workflow default
  GCP_DEPLOY_PROJECT_ID=${PROJECT_ID}      # optional; omit for workflow default
  GCP_NEXT_PUBLIC_API_URL=<your-api-url>   # required for full/web builds
  GCP_NEXT_PUBLIC_BASE_URL=<your-web-url>
  GCP_NEXT_PUBLIC_FIREBASE_API_KEY=<...>
  GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com
  GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}
  GCP_WORKER_SERVICE_NAME=dx-logivoice-worker-dev   # develop env only

Cloud Build execution SA used: ${CLOUDBUILD_SA}
If builds fail with storage/run errors, verify in Console: Cloud Build → Settings.

Optional (IaC): add to google-cloud/terraform/environments/bootstrap/terraform.tfvars:
  additional_artifact_registry_writer_members = [
    "serviceAccount:${CLOUDBUILD_SA}",
  ]

Docs: ${SCRIPT_DIR}/../cloudbuild/GITHUB_ACTIONS_WIF.md
Workflow: .github/workflows/cd-gcp.yml
================================================================================
EOF
