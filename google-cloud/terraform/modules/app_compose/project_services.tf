# Shared project APIs used by multiple modules (single resource per API).

locals {
  cloud_scheduler_api_needed  = var.enable_cron_cloud_scheduler || (var.enable_cloud_sql && var.enable_sql_night_weekend_schedule)
  artifactregistry_api_needed = var.enable_cloud_sql && var.enable_sql_night_weekend_schedule
}

resource "google_project_service" "cloudscheduler" {
  count   = local.cloud_scheduler_api_needed ? 1 : 0
  service = "cloudscheduler.googleapis.com"
  # Single-project, many-env: destroying one env must not disable the API for others.
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  count              = local.artifactregistry_api_needed ? 1 : 0
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}
