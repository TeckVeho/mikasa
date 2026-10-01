# Grant Cloud Run runtime SA access to secrets referenced by api_secret_env_from_sm / web_secret_env_from_sm.

locals {
  app_bundle_secret_ids = trimspace(var.app_secrets_bundle_secret_id) != "" ? [var.app_secrets_bundle_secret_id] : []
  distinct_sm_secret_ids_for_runtime = distinct(concat(
    [for s in var.api_secret_env_from_sm : s.secret_id],
    [for s in var.web_secret_env_from_sm : s.secret_id],
    [for s in var.worker_secret_env_from_sm : s.secret_id],
    local.app_bundle_secret_ids,
  ))
}

resource "google_secret_manager_secret_iam_member" "cloudrun_secret_accessor" {
  for_each = toset(local.distinct_sm_secret_ids_for_runtime)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account}"
}
