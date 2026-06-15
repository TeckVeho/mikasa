# Common stack — shared Artifact Registry + Cloud Build staging cleanup

Creates a **Docker Artifact Registry** in the **common** project so dev / stg / prod **pull** from the same host (`asia-northeast1-docker.pkg.dev/<common-project>/logivoice-docker/...`) without cross-project IAM between environment projects beyond reader grants managed here.

Also applies **mandatory cleanup**:

- **Artifact Registry** — cleanup policies run with `cleanup_policy_dry_run = false` (images are deleted per policy; defaults in `variables.tf`).
- **Cloud Build staging bucket** — GCS lifecycle deletes objects under `source/` older than **7 days** (default).

## Variables

| Variable | Purpose |
|----------|---------|
| `project_id` | Common GCP project |
| `reader_project_ids` | App project IDs (dev, stg, prod) — Terraform grants `roles/artifactregistry.reader` to each project's default runtime service account |
| `additional_artifact_registry_reader_members` | Extra members with `roles/artifactregistry.reader` |
| `additional_artifact_registry_writer_members` | Members with `roles/artifactregistry.writer` (e.g. Cloud Build SAs that `docker push` to this repo) |

Cleanup tuning (`artifact_cleanup_*`, `cloudbuild_source_retention_days`) has defaults; override in `terraform.tfvars` only if needed.

## Order of operations

1. (Optional) [`../bootstrap/`](../bootstrap/) — create the state bucket if needed.
2. Apply this stack (`common/`).
3. Apply [`../network/`](../network/) and the app stack with `create_artifact_registry = false` and `container_image` pointing at the URL prefix from output `docker_repository_url_prefix`.

## Cloud Build staging bucket (`{project_id}_cloudbuild`)

`gcloud builds submit` uploads source to `gs://{project_id}_cloudbuild/source/`. GCP does **not** delete these objects automatically.

This stack applies a GCS **lifecycle rule**: delete objects under `source/` older than **7 days** (configurable via `cloudbuild_source_retention_days`).

### First apply when the bucket already exists

Import the bucket once (created by Cloud Build on first submit), then apply:

```bash
cd infra/terraform/common
terraform import \
  'google_storage_bucket.cloudbuild_staging' \
  PROJECT_ID_cloudbuild
```

Example:

```bash
terraform import \
  'google_storage_bucket.cloudbuild_staging' \
  dx-logivoice-common_cloudbuild
```

Replace the bucket name if `project_id` in `terraform.tfvars` differs.

Then `terraform plan` / `apply`. Expect the plan to add `lifecycle_rule` only; other bucket settings are ignored via `lifecycle.ignore_changes`.

## Backend

Copy [`backend.tf.example`](backend.tf.example) → `backend.tf`, set `bucket`, and keep `prefix = "common/main"` (or equivalent).
