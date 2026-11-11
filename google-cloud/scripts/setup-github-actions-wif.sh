#!/usr/bin/env bash
# Setup Workload Identity Federation + IAM for GitHub Actions CD (single GCP project).
#
# Target layout: mikasa-load-management (build + Artifact Registry + Cloud Run deploy in one project).
# Implements: google-cloud/cloudbuild/GITHUB_ACTIONS_WIF.md
#
# Prerequisites:
#   - gcloud CLI authenticated (roles/owner or equivalent on PROJECT_ID)
#   - Bootstrap Terraform applied (Artifact Registry repo {project_id}-docker)
#
# Usage:
#   ./google-cloud/scripts/setup-github-actions-wif.sh
#   ./google-cloud/scripts/setup-github-actions-wif.sh --dry-run
#
# Edit the CONFIG block below per GCP project (no exports in your shell).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# CONFIG — edit for each project / GitHub repo, then run this script
# =============================================================================
export PROJECT_ID="mikasa-load-management"
export REGION="asia-northeast1"
export GITHUB_REPO="TeckVeho/mikasa"
export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
# Live federated SA (GitHub secret GCP_SERVICE_ACCOUNT) — do not rename without updating Environments.
export SA_ID="github-actions-mikasa"
export ARTIFACT_REPO_ID="mikasa-load-management-docker"
export CD_BUILD_SA_ID="mikasa-load-mana-cd-build"
export LISTER_ROLE_ID="mikasaloadmanagementCloudBuildSubmitLister"
export RUN_SA_DEV_ID="mikasa-load-management-run-dev"
export RUN_SA_STG_ID="mikasa-load-management-run-stg"
# Terraform account_id max 30 chars (prod suffix truncates).
export RUN_SA_PROD_ID="mikasa-load-management-run-pro"
export WIF_DEPLOY_REFS="develop,staging,production"
# =============================================================================

DRY_RUN=false

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  echo
  echo "Options:"
  echo "  --dry-run          Print commands without executing"
  echo "  --project-id ID    Override CONFIG PROJECT_ID"
  echo "  --github-repo O/R  Override CONFIG GITHUB_REPO"
  echo "  --sa-id ID         Override CONFIG SA_ID"
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

remove_project_iam_binding() {
  local member="$1"
  local role="$2"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
      --member="$member" --role="$role" --condition=None 2>/dev/null || true
    return
  fi
  if gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" \
    --filter="bindings.role:$role AND bindings.members:$member" --format='value(bindings.role)' \
    | grep -q "$role"; then
    log "Removing $role from $member on $PROJECT_ID"
    gcloud projects remove-iam-policy-binding "$PROJECT_ID" \
      --member="$member" --role="$role" --condition=None >/dev/null 2>&1 || true
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

ensure_sa_iam_binding() {
  local sa_email="$1"
  local member="$2"
  local role="$3"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud iam service-accounts add-iam-policy-binding "$sa_email" \
      --project="$PROJECT_ID" --member="$member" --role="$role"
    return
  fi
  if gcloud iam service-accounts get-iam-policy "$sa_email" --project="$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.role:$role AND bindings.members:$member" \
    --format='value(bindings.role)' 2>/dev/null | grep -q "$role"; then
    log "SA IAM already has $role for $member on $sa_email"
  else
    log "Granting $role to $member on SA $sa_email"
    gcloud iam service-accounts add-iam-policy-binding "$sa_email" \
      --project="$PROJECT_ID" --member="$member" --role="$role" >/dev/null
  fi
}

LISTER_PERMISSIONS="storage.buckets.list,storage.buckets.get"

ensure_cloud_build_submit_lister_role() {
  local member="$1"
  local role="projects/${PROJECT_ID}/roles/${LISTER_ROLE_ID}"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud iam roles create "$LISTER_ROLE_ID" \
      --project="$PROJECT_ID" --title="Cloud Build submit — list buckets" \
      --permissions="$LISTER_PERMISSIONS" --stage=GA
    run gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="$member" --role="$role" --condition=None
    return
  fi
  if ! gcloud iam roles describe "$LISTER_ROLE_ID" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Creating custom role $LISTER_ROLE_ID ($LISTER_PERMISSIONS)"
    gcloud iam roles create "$LISTER_ROLE_ID" \
      --project="$PROJECT_ID" --title="Cloud Build submit — list buckets" \
      --permissions="$LISTER_PERMISSIONS" --stage=GA
  else
    log "Updating custom role $LISTER_ROLE_ID permissions ($LISTER_PERMISSIONS)"
    gcloud iam roles update "$LISTER_ROLE_ID" \
      --project="$PROJECT_ID" --permissions="$LISTER_PERMISSIONS" --stage=GA
  fi
  ensure_project_iam_binding "$member" "$role"
}

bind_cd_build_runtime_actas() {
  local cb_member="$1"
  shift
  local run_email
  for run_email in "$@"; do
    [[ -z "$run_email" ]] && continue
    if [[ "$DRY_RUN" == true ]]; then
      ensure_sa_iam_binding "$run_email" "$cb_member" "roles/iam.serviceAccountUser"
      continue
    fi
    if gcloud iam service-accounts describe "$run_email" --project="$PROJECT_ID" >/dev/null 2>&1; then
      ensure_sa_iam_binding "$run_email" "$cb_member" "roles/iam.serviceAccountUser"
    else
      warn "Skipping actAs (runtime SA not found yet): $run_email"
    fi
  done
}

ensure_cloud_build_submit_storage() {
  local member="$1"
  ensure_cloud_build_submit_lister_role "$member"
  ensure_staging_bucket_object_admin "$member"
}

ensure_staging_bucket_object_admin() {
  local member="$1"
  local bucket="gs://${PROJECT_ID}_cloudbuild"
  if [[ "$DRY_RUN" == true ]]; then
    run gcloud storage buckets add-iam-policy-binding "$bucket" \
      --member="$member" --role="roles/storage.objectAdmin"
    return
  fi
  log "Granting roles/storage.objectAdmin on $bucket to $member"
  gcloud storage buckets add-iam-policy-binding "$bucket" \
    --member="$member" --role="roles/storage.objectAdmin" >/dev/null 2>&1 \
    || gcloud storage buckets add-iam-policy-binding "$bucket" \
      --member="$member" --role="roles/storage.objectAdmin"
}

wif_attribute_condition() {
  local refs_clause=""
  local part
  local first=true
  IFS=',' read -ra REF_PARTS <<< "$WIF_DEPLOY_REFS"
  for part in "${REF_PARTS[@]}"; do
    part="$(echo "$part" | xargs)"
    [[ -z "$part" ]] && continue
    if [[ "$first" == true ]]; then
      refs_clause="assertion.ref == 'refs/heads/${part}'"
      first=false
    else
      refs_clause="${refs_clause} || assertion.ref == 'refs/heads/${part}'"
    fi
  done
  if [[ -z "$refs_clause" ]]; then
    printf "assertion.repository == '%s'" "$GITHUB_REPO"
  else
    printf "assertion.repository == '%s' && (%s)" "$GITHUB_REPO" "$refs_clause"
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

SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
CD_BUILD_SA_EMAIL="${CD_BUILD_SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
RUN_SA_DEV_EMAIL="${RUN_SA_DEV_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
RUN_SA_STG_EMAIL="${RUN_SA_STG_ID:-}@${PROJECT_ID}.iam.gserviceaccount.com"
[[ -z "${RUN_SA_STG_ID:-}" ]] && RUN_SA_STG_EMAIL=""
RUN_SA_PROD_EMAIL="${RUN_SA_PROD_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
ATTR_CONDITION="$(wif_attribute_condition)"

log "Project: $PROJECT_ID | GitHub repo: $GITHUB_REPO | Federated SA: $SA_EMAIL"
log "Cloud Build execution SA: $CD_BUILD_SA_EMAIL | WIF refs: $WIF_DEPLOY_REFS"
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
CLOUDBUILD_AGENT_SA="service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com"
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
log "Step 2 — OIDC provider: $PROVIDER_ID (repo: $GITHUB_REPO, condition: $ATTR_CONDITION)"
WIF_ATTR_MAPPING="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" --location="global" \
    --workload-identity-pool="$POOL_ID" --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="$WIF_ATTR_MAPPING" \
    --attribute-condition="$ATTR_CONDITION"
else
  if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project="$PROJECT_ID" --location="global" \
    --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
    log "Updating provider attribute-condition: $PROVIDER_ID"
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
      --project="$PROJECT_ID" --location="global" \
      --workload-identity-pool="$POOL_ID" \
      --attribute-condition="$ATTR_CONDITION"
  else
    gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
      --project="$PROJECT_ID" --location="global" \
      --workload-identity-pool="$POOL_ID" --display-name="GitHub OIDC" \
      --issuer-uri="https://token.actions.githubusercontent.com" \
      --attribute-mapping="$WIF_ATTR_MAPPING" \
      --attribute-condition="$ATTR_CONDITION"
  fi
fi

# --- Step 4: Service account ---
log "Step 4 — Service account: $SA_EMAIL"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam service-accounts create "$SA_ID" \
      --project="$PROJECT_ID" --display-name="GitHub Actions Mikasa"
else
  if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Service account already exists: $SA_EMAIL"
  else
    gcloud iam service-accounts create "$SA_ID" \
      --project="$PROJECT_ID" --display-name="GitHub Actions Mikasa"
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

# --- Step 6a: Federated SA (submits Cloud Build only — least privilege) ---
FED_MEMBER="serviceAccount:${SA_EMAIL}"

log "Step 6a-revoke — remove deprecated wide project roles on federated SA (if present)"
for role in \
  roles/run.admin \
  roles/storage.admin \
  roles/iam.serviceAccountUser \
  roles/storage.objectCreator \
  roles/storage.objectAdmin; do
  remove_project_iam_binding "$FED_MEMBER" "$role"
done

log "Step 6a — Project IAM for federated SA (no run.admin / storage.admin / project serviceAccountUser)"
for role in \
  roles/serviceusage.serviceUsageConsumer \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer; do
  ensure_project_iam_binding "$FED_MEMBER" "$role"
done

log "Step 6a-storage — ${LISTER_ROLE_ID} + bucket objectAdmin on gs://${PROJECT_ID}_cloudbuild"
ensure_cloud_build_submit_storage "$FED_MEMBER"

# §8.1 — create cd-build SA before federated actAs (avoids Unknown service account mid-script).
log "Step 6b-create — Service account: $CD_BUILD_SA_EMAIL"
if [[ "$DRY_RUN" == true ]]; then
  run gcloud iam service-accounts create "$CD_BUILD_SA_ID" \
    --project="$PROJECT_ID" --display-name="Cloud Build CD execution"
else
  if gcloud iam service-accounts describe "$CD_BUILD_SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "Cloud Build execution SA already exists: $CD_BUILD_SA_EMAIL"
  else
    gcloud iam service-accounts create "$CD_BUILD_SA_ID" \
      --project="$PROJECT_ID" --display-name="Cloud Build CD execution"
  fi
fi

log "Step 6a-actAs — federated SA can actAs user-managed Cloud Build execution SA"
ensure_sa_iam_binding "$CD_BUILD_SA_EMAIL" "$FED_MEMBER" "roles/iam.serviceAccountUser"

log "Step 6b — Project IAM on Cloud Build execution SA (run.developer — gcloud run in cloudbuild YAML)"
CB_EXEC_MEMBER="serviceAccount:${CD_BUILD_SA_EMAIL}"
remove_project_iam_binding "$CB_EXEC_MEMBER" "roles/run.admin"
for role in \
  roles/logging.logWriter \
  roles/artifactregistry.writer \
  roles/run.developer; do
  ensure_project_iam_binding "$CB_EXEC_MEMBER" "$role"
done

log "Step 6b-storage — same lister + bucket objectAdmin as submitter (read staging source)"
remove_project_iam_binding "$CB_EXEC_MEMBER" "roles/storage.objectAdmin"
remove_project_iam_binding "$CB_EXEC_MEMBER" "roles/storage.admin"
ensure_cloud_build_submit_storage "$CB_EXEC_MEMBER"

log "Step 6b-agent — Cloud Build service agent can actAs execution SA"
ensure_sa_iam_binding "$CD_BUILD_SA_EMAIL" "serviceAccount:${CLOUDBUILD_AGENT_SA}" "roles/iam.serviceAccountUser"

log "Step 6b-runtime — scoped actAs Cloud Run runtime SAs (CONFIG + cloudbuild YAML)"
RUNTIME_FROM_YAML=()
if [[ -d "${SCRIPT_DIR}/../cloudbuild" ]]; then
  while IFS= read -r sa_id; do
    [[ -z "$sa_id" ]] && continue
    RUNTIME_FROM_YAML+=("${sa_id}@${PROJECT_ID}.iam.gserviceaccount.com")
  done < <(grep -rhE '(--service-account=|serviceAccount:)[[:space:]]*[^[:space:]]+' "${SCRIPT_DIR}/../cloudbuild/" 2>/dev/null \
    | sed -E 's/.*(--service-account=|serviceAccount:[[:space:]]*)//' \
    | sed -E 's|^.*/||; s/@.*//' | sort -u || true)
fi
bind_cd_build_runtime_actas "$CB_EXEC_MEMBER" \
  "$RUN_SA_DEV_EMAIL" "$RUN_SA_STG_EMAIL" "$RUN_SA_PROD_EMAIL" "${RUNTIME_FROM_YAML[@]}"

warn "Do NOT grant roles/iam.serviceAccountUser at project scope to ${CD_BUILD_SA_EMAIL} (security monitoring alert)."

log "Step 6c — Artifact Registry repo writer on $ARTIFACT_REPO_ID"
ensure_artifact_repo_writer "$CB_EXEC_MEMBER"
ensure_artifact_repo_writer "$FED_MEMBER"

warn "After first green build using serviceAccount in cloudbuild YAML (${CD_BUILD_SA_EMAIL}), remove IAM on default compute@ if unused (playbook Bước 5 / gcp-monitoring wif-security-audit)."

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
  GCP_NEXT_PUBLIC_API_URL=<api-origin-only>   # e.g. https://mikasa-load-management-api-dev-xxx.run.app
  GCP_NEXT_PUBLIC_BASE_URL=<your-web-url>
  GCP_NEXT_PUBLIC_FIREBASE_API_KEY=<...>
  GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com
  GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}
  # GCP_WORKER_SERVICE_NAME=   # optional; dev stack may have enable_worker=false

Cloud Build execution SA (serviceAccount in google-cloud/cloudbuild/*.yaml): ${CD_BUILD_SA_EMAIL}

WIF attribute-condition (deploy branches): ${ATTR_CONDITION}

After first successful CD with the execution SA above, decommission legacy
${LEGACY_CB_SA:-compute default} project roles if no longer used.

Optional (IaC): add to google-cloud/terraform/environments/bootstrap/terraform.tfvars:
  additional_artifact_registry_writer_members = [
    "serviceAccount:${CD_BUILD_SA_EMAIL}",
  ]

Docs: ${SCRIPT_DIR}/../cloudbuild/GITHUB_ACTIONS_WIF.md
Workflow: .github/workflows/cd-gcp.yml
================================================================================
EOF
