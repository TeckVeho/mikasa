# Cloud SQL night/weekend stop (JST) via Cloud Scheduler + Functions Gen2.
# Enable only for dev: enable_sql_night_weekend_schedule = true (requires enable_cloud_sql).

locals {
  name_prefix                 = replace(var.project_id, "_", "-")
  sql_schedule_enabled        = var.enable_cloud_sql && var.enable_sql_night_weekend_schedule
  sql_schedule_fn_name        = substr("${local.name_prefix}-sql-sched-${var.env_suffix}", 0, 63)
  sql_instance_name_effective = var.scheduled_sql_instance_name != "" ? var.scheduled_sql_instance_name : var.sql_instance_name
  sql_activation_zip_relpath  = "./.build/sql-activation-${var.env_suffix}.zip"
  sql_fn_sa_id                = substr("${local.name_prefix}-sql-sched-${var.env_suffix}", 0, 30)
  sched_invoker_sa_id         = substr("${local.name_prefix}-sched-sql-${var.env_suffix}", 0, 30)
  cf_source_bucket_name       = substr(replace(lower("${local.name_prefix}-cf-src-${var.env_suffix}"), "_", "-"), 0, 63)
}

check "sql_schedule_requires_cloud_sql" {
  assert {
    condition     = !var.enable_sql_night_weekend_schedule || var.enable_cloud_sql
    error_message = "enable_sql_night_weekend_schedule requires enable_cloud_sql = true."
  }
}

resource "google_project_service" "cloudfunctions" {
  count   = local.sql_schedule_enabled ? 1 : 0
  service = "cloudfunctions.googleapis.com"
  # Single-project, many-env: destroying one env must not disable the API for others.
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  count              = local.sql_schedule_enabled ? 1 : 0
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "sql_schedule_fn" {
  count = local.sql_schedule_enabled ? 1 : 0

  account_id   = local.sql_fn_sa_id
  display_name = "Kumu Cloud SQL schedule (Functions Gen2)"
  project      = var.project_id
}

resource "google_project_iam_member" "sql_schedule_fn_sql_editor" {
  count = local.sql_schedule_enabled ? 1 : 0

  project = var.project_id
  role    = "roles/cloudsql.editor"
  member  = "serviceAccount:${google_service_account.sql_schedule_fn[0].email}"
}

# The default compute service account needs these roles to build Gen2 Functions
# if the project has default role grants disabled by org policy.
resource "google_project_iam_member" "cf_build_logging" {
  count   = local.sql_schedule_enabled ? 1 : 0
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${var.cloud_run_service_account}"
}

resource "google_project_iam_member" "cf_build_ar" {
  count   = local.sql_schedule_enabled ? 1 : 0
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${var.cloud_run_service_account}"
}

resource "google_project_iam_member" "cf_build_storage" {
  count   = local.sql_schedule_enabled ? 1 : 0
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${var.cloud_run_service_account}"
}

resource "google_service_account" "scheduler_invoker" {
  count = local.sql_schedule_enabled ? 1 : 0

  account_id   = local.sched_invoker_sa_id
  display_name = "Kumu Cloud Scheduler → SQL schedule function (OIDC)"
  project      = var.project_id
}

resource "google_storage_bucket" "cf_source" {
  count = local.sql_schedule_enabled ? 1 : 0

  name                        = local.cf_source_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
  ]
}

data "archive_file" "sql_activation" {
  count = local.sql_schedule_enabled ? 1 : 0

  type        = "zip"
  source_dir  = "${path.root}/../../../functions/sql-activation"
  output_path = "${path.root}/${local.sql_activation_zip_relpath}"
  excludes    = ["node_modules", ".git"]
}

resource "google_storage_bucket_iam_member" "cloudbuild_cf_source_reader" {
  count = local.sql_schedule_enabled ? 1 : 0

  bucket = google_storage_bucket.cf_source[0].name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_storage_bucket_object" "sql_activation_zip" {
  count = local.sql_schedule_enabled ? 1 : 0

  name   = "sql-activation-${data.archive_file.sql_activation[0].output_md5}.zip"
  bucket = google_storage_bucket.cf_source[0].name
  source = local.sql_activation_zip_relpath

  lifecycle {
    ignore_changes = [source, detect_md5hash]
  }
}

resource "google_cloudfunctions2_function" "sql_activation" {
  count = local.sql_schedule_enabled ? 1 : 0

  name     = local.sql_schedule_fn_name
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "nodejs22"
    entry_point = "setSqlActivation"
    source {
      storage_source {
        bucket = google_storage_bucket.cf_source[0].name
        object = google_storage_bucket_object.sql_activation_zip[0].name
      }
    }
  }

  service_config {
    max_instance_count    = 1
    available_memory      = "256M"
    timeout_seconds       = 120
    service_account_email = google_service_account.sql_schedule_fn[0].email
    environment_variables = {
      GCP_PROJECT      = var.project_id
      SQL_INSTANCE     = local.sql_instance_name_effective
      LOG_EXECUTION_ID = "true"
    }
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.sql_schedule_fn_sql_editor,
    google_project_iam_member.cf_build_logging,
    google_project_iam_member.cf_build_ar,
    google_project_iam_member.cf_build_storage,
  ]
}

# Gen2 runs on Cloud Run; Scheduler OIDC must use roles/run.invoker.
resource "google_cloud_run_v2_service_iam_member" "scheduler_invokes_sql_fn" {
  count = local.sql_schedule_enabled ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloudfunctions2_function.sql_activation[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_invoker[0].email}"
}

resource "google_cloud_scheduler_job" "sql_stop" {
  count = local.sql_schedule_enabled ? 1 : 0

  name        = substr("${local.name_prefix}-sql-stop-${var.env_suffix}", 0, 63)
  description = "Set Cloud SQL activation_policy NEVER (evenings + weekend until Mon 08:00 JST)"
  schedule    = var.sql_schedule_stop_cron
  time_zone   = var.sql_schedule_timezone
  region      = var.region
  paused      = false

  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloudfunctions2_function.sql_activation[0].url}?action=stop"
    oidc_token {
      service_account_email = google_service_account.scheduler_invoker[0].email
      audience              = google_cloudfunctions2_function.sql_activation[0].url
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.scheduler_invokes_sql_fn,
  ]
}

resource "google_cloud_scheduler_job" "sql_start" {
  count = local.sql_schedule_enabled ? 1 : 0

  name        = substr("${local.name_prefix}-sql-start-${var.env_suffix}", 0, 63)
  description = "Set Cloud SQL activation_policy ALWAYS (Mon–Fri mornings JST)"
  schedule    = var.sql_schedule_start_cron
  time_zone   = var.sql_schedule_timezone
  region      = var.region
  paused      = false

  attempt_deadline = "600s"

  http_target {
    http_method = "POST"
    uri         = "${google_cloudfunctions2_function.sql_activation[0].url}?action=start"
    oidc_token {
      service_account_email = google_service_account.scheduler_invoker[0].email
      audience              = google_cloudfunctions2_function.sql_activation[0].url
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.scheduler_invokes_sql_fn,
  ]
}
