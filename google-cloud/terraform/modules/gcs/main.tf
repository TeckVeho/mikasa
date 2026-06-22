# Optional GCS bucket per environment (env_suffix in tfvars: dev | prod).

resource "google_project_service" "storage" {
  count   = var.enable_gcs ? 1 : 0
  service = "storage.googleapis.com"
  # Avoid GCP error when disabling storage.googleapis.com (depends on cloudapis, etc.)
  disable_on_destroy = false
}

# Required for GCS V4 signed URLs on Cloud Run (ADC uses IAM signBlob via this API).
resource "google_project_service" "iamcredentials" {
  count              = var.enable_gcs ? 1 : 0
  service            = "iamcredentials.googleapis.com"
  disable_on_destroy = false
}

locals {
  name_prefix               = replace(var.project_id, "_", "-")
  gcs_bucket_name_effective = substr(
    replace(lower("${local.name_prefix}-uploads-${var.env_suffix}"), "_", "-"),
    0,
    63,
  )
}

resource "google_storage_bucket" "uploads" {
  count = var.enable_gcs ? 1 : 0

  name                        = local.gcs_bucket_name_effective
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  depends_on = [google_project_service.storage]
}

resource "google_storage_bucket_iam_member" "cloudrun_gcs_admin" {
  count = var.enable_gcs ? 1 : 0

  bucket = google_storage_bucket.uploads[0].name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.cloud_run_service_account}"
}

# GCS V4 signed URLs (getSignedUrl) call IAM signBlob; runtime SA must be able to sign as itself.
resource "google_service_account_iam_member" "cloudrun_sign_blob_self" {
  count = var.enable_gcs ? 1 : 0

  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.cloud_run_service_account}"
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${var.cloud_run_service_account}"

  depends_on = [google_project_service.iamcredentials[0]]
}
