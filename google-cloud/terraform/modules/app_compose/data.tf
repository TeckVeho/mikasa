locals {
  name_prefix = replace(var.project_id, "_", "-")

  cloud_run_service_account       = google_service_account.runtime.email
  runtime_service_account_email   = google_service_account.runtime.email

  cloud_run_service_name_effective     = substr("${local.name_prefix}-api-${var.env_suffix}", 0, 63)
  web_cloud_run_service_name_effective = substr("${local.name_prefix}-web-${var.env_suffix}", 0, 63)
  worker_cloud_run_service_name_effective = substr("${local.name_prefix}-worker-${var.env_suffix}", 0, 63)

  pubsub_topic_name_effective = substr("${local.name_prefix}-call-completed-${var.env_suffix}", 0, 63)
  pubsub_sub_name_effective   = substr("${local.name_prefix}-summarize-worker-${var.env_suffix}", 0, 63)
  redis_instance_name_effective = substr("${local.name_prefix}-redis-${var.env_suffix}", 0, 63)

  # Derive worker image from API image (same registry, tag, repo; logivoice-worker instead of logivoice-api).
  worker_container_image_effective = replace(var.container_image, "logivoice-api", "logivoice-worker")

  worker_dashboard_url_effective = trimspace(var.web_custom_domain) != "" ? "https://${trimspace(var.web_custom_domain)}" : ""

  worker_secret_env_from_sm_effective = [
    { env_name = "OPENAI_API_KEY", secret_id = "logivoice-openai-${var.env_suffix}", version = "latest" },
    { env_name = "RESEND_API_KEY", secret_id = "logivoice-resend-${var.env_suffix}", version = "latest" },
  ]

  network_stack_required = var.enable_cloud_sql

  cron_api_sa_account_id = substr("${local.name_prefix}-cron-api-${var.env_suffix}", 0, 30)
  cron_api_sa_email      = "${local.cron_api_sa_account_id}@${var.project_id}.iam.gserviceaccount.com"

  # Prod: daily backups always on at 17:00 UTC (~02:00 JST). Dev/stg: configure via tfvars.
  sql_backup_enabled_effective    = var.env_suffix == "prod" ? true : var.sql_backup_enabled
  sql_backup_start_time_effective = var.env_suffix == "prod" ? "17:00" : var.sql_backup_start_time

  gcs_bucket_name_effective = substr(
    replace(lower("${local.name_prefix}-uploads-${var.env_suffix}"), "_", "-"),
    0,
    63,
  )
  sql_instance_name_effective = substr(
    replace(
      lower(var.sql_instance_name != "" ? var.sql_instance_name : "${local.name_prefix}-mysql-${var.env_suffix}"),
      "_",
      "-",
    ),
    0,
    96,
  )

  env_iam_scoped_resource_names = {
    gcs_buckets = distinct(compact(concat(
      var.enable_gcs ? [local.gcs_bucket_name_effective] : [],
      var.env_iam_extra_scoped_gcs_buckets,
    )))
    cloud_run_services = compact([
      local.cloud_run_service_name_effective,
      var.enable_web ? local.web_cloud_run_service_name_effective : "",
      local.worker_cloud_run_service_name_effective,
    ])
    cloud_sql_instances = var.enable_cloud_sql ? [local.sql_instance_name_effective] : []
    secret_ids = distinct(compact(concat(
      [for s in var.api_secret_env_from_sm : s.secret_id],
      [for s in var.web_secret_env_from_sm : s.secret_id],
      [for s in local.worker_secret_env_from_sm_effective : s.secret_id],
      var.enable_cloud_sql ? [substr("${local.name_prefix}-database-url-${var.env_suffix}", 0, 63)] : [],
    )))
  }
}
