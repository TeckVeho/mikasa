# Per-env Cloud Run runtime service account ({project}-run-{env}).
# Isolates workload identity in a shared project so dev cannot use prod's identity (and vice versa).

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "runtime" {
  account_id   = substr("${replace(var.project_id, "_", "-")}-run-${var.env_suffix}", 0, 30)
  display_name = "Kumu Cloud Run runtime (${var.env_suffix})"

  depends_on = [google_project_service.iam]
}

# Minimum roles the default compute SA had implicitly; grant explicitly to the dedicated SA.
resource "google_project_iam_member" "runtime_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}
