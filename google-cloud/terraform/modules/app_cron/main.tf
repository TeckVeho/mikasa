resource "google_service_account" "cron_api_scheduler" {
  count = var.enable_cron_cloud_scheduler ? 1 : 0

  account_id   = local.cron_api_sa_id
  display_name = "LogiVoice Cloud Scheduler → API cron (OIDC)"
  project      = var.project_id
}

resource "google_cloud_run_v2_service_iam_member" "cron_scheduler_invokes_api" {
  count = var.enable_cron_cloud_scheduler ? 1 : 0

  project  = var.project_id
  location = var.cloud_run_api_location
  name     = var.cloud_run_api_service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cron_api_scheduler[0].email}"
}

locals {
  name_prefix      = replace(var.project_id, "_", "-")
  cron_api_sa_id   = substr("${local.name_prefix}-cron-api-${var.env_suffix}", 0, 30)
  cron_api_base_url = trimsuffix(var.cloud_run_api_url, "/")
}

resource "google_cloud_scheduler_job" "cron_cleanup_tokens" {
  count = var.enable_cron_cloud_scheduler ? 1 : 0

  name        = substr("${local.name_prefix}-cron-cleanup-${var.env_suffix}", 0, 63)
  description = "POST /internal/cron/cleanup-tokens"
  schedule    = var.cron_schedule_cleanup_tokens
  time_zone   = var.cron_timezone
  region      = var.region
  paused      = false

  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${local.cron_api_base_url}/internal/cron/cleanup-tokens"
    oidc_token {
      service_account_email = google_service_account.cron_api_scheduler[0].email
      audience              = var.cloud_run_api_url
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.cron_scheduler_invokes_api,
  ]
}

resource "google_cloud_scheduler_job" "cron_tbs_batch" {
  count = var.enable_cron_cloud_scheduler ? 1 : 0

  name        = substr("${local.name_prefix}-cron-tbs-${var.env_suffix}", 0, 63)
  description = "POST /internal/cron/tbs-batch (skipped when RUN_TBS_CRON unset)"
  schedule    = var.cron_schedule_tbs_batch
  time_zone   = var.cron_timezone
  region      = var.region
  paused      = false

  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${local.cron_api_base_url}/internal/cron/tbs-batch"
    oidc_token {
      service_account_email = google_service_account.cron_api_scheduler[0].email
      audience              = var.cloud_run_api_url
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.cron_scheduler_invokes_api,
  ]
}

resource "google_cloud_scheduler_job" "cron_recommendations" {
  count = var.enable_cron_cloud_scheduler ? 1 : 0

  name        = substr("${local.name_prefix}-cron-rec-${var.env_suffix}", 0, 63)
  description = "POST /internal/cron/recommendations"
  schedule    = var.cron_schedule_recommendations
  time_zone   = var.cron_timezone
  region      = var.region
  paused      = false

  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${local.cron_api_base_url}/internal/cron/recommendations"
    oidc_token {
      service_account_email = google_service_account.cron_api_scheduler[0].email
      audience              = var.cloud_run_api_url
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.cron_scheduler_invokes_api,
  ]
}
