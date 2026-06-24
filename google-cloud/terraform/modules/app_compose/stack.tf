# Compose template-aligned modules (aidd-development-template layout).

module "iam" {
  source = "../iam"

  project_display_name          = var.project_display_name
  project_iam_members           = var.project_iam_members
  project_id                    = var.project_id
  resource_tier                 = var.resource_tier
  env_suffix                    = var.env_suffix
  env_iam_scoped_resource_names = local.env_iam_scoped_resource_names
  env_iam_principals            = var.env_iam_principals
}

module "gcs" {
  source = "../gcs"

  enable_gcs                = var.enable_gcs
  env_suffix                = var.env_suffix
  project_id                = var.project_id
  region                    = var.region
  cloud_run_service_account = local.cloud_run_service_account
}

module "secrets" {
  source = "../secrets"

  api_secret_env_from_sm      = var.api_secret_env_from_sm
  project_id                  = var.project_id
  web_secret_env_from_sm      = var.web_secret_env_from_sm
  worker_secret_env_from_sm   = local.worker_secret_env_from_sm_effective
  cloud_run_service_account   = local.cloud_run_service_account
}

module "pubsub" {
  source = "../pubsub"

  project_id                = var.project_id
  topic_name                = local.pubsub_topic_name_effective
  subscription_name         = local.pubsub_sub_name_effective
  cloud_run_service_account = local.cloud_run_service_account
}

module "memorystore" {
  count  = var.enable_cloud_sql ? 1 : 0
  source = "../memorystore"

  project_id          = var.project_id
  region              = var.region
  instance_name       = local.redis_instance_name_effective
  network_self_link   = data.terraform_remote_state.network[0].outputs.network_self_link
}

module "cloud_sql" {
  source = "../cloud_sql"

  enable_cloud_sql                   = var.enable_cloud_sql
  enable_sql_audit                   = var.enable_sql_audit
  env_suffix                         = var.env_suffix
  project_id                         = var.project_id
  region                             = var.region
  sql_backup_enabled                 = local.sql_backup_enabled_effective
  sql_backup_start_time              = local.sql_backup_start_time_effective
  sql_database_name                  = var.sql_database_name
  sql_instance_name                  = var.sql_instance_name
  sql_point_in_time_recovery_enabled = var.sql_point_in_time_recovery_enabled
  sql_user_name                      = var.sql_user_name
  network_self_link                  = var.enable_cloud_sql ? data.terraform_remote_state.network[0].outputs.network_self_link : ""
  cloud_run_service_account          = local.cloud_run_service_account
  sql_tier_effective                 = local.sql_tier_effective
  sql_disk_size_gb_effective         = local.sql_disk_size_gb_effective
  sql_disk_type_effective            = local.sql_disk_type_effective
}

module "cloud_run" {
  source = "../cloud_run"

  depends_on = [
    module.secrets,
    module.cloud_sql,
    module.gcs,
    module.pubsub,
    module.memorystore,
  ]
  allow_unauthenticated                 = var.allow_unauthenticated
  allow_unauthenticated_web             = var.allow_unauthenticated_web
  api_custom_domain                     = var.api_custom_domain
  api_secret_env_from_sm                = var.api_secret_env_from_sm
  cloud_run_migrate_job_name            = var.cloud_run_migrate_job_name
  cloud_run_service_name                = local.cloud_run_service_name_effective
  cloud_run_ingress                     = var.cloud_run_ingress
  web_cloud_run_ingress                 = var.web_cloud_run_ingress
  container_image                       = var.container_image
  container_port                        = var.container_port
  enable_cloud_sql                      = var.enable_cloud_sql
  enable_vpc_access                     = local.network_stack_required
  enable_cron_cloud_scheduler           = var.enable_cron_cloud_scheduler
  enable_gcs                            = var.enable_gcs
  enable_vertex_ai                      = var.enable_vertex_ai
  enable_web                            = var.enable_web
  env_suffix                            = var.env_suffix
  env_vars                              = var.env_vars
  network_remote_state_bucket           = var.network_remote_state_bucket
  network_remote_state_prefix           = var.network_remote_state_prefix
  project_id                            = var.project_id
  region                                = var.region
  vertex_ai_location                    = var.vertex_ai_location
  web_cloud_run_service_name            = local.web_cloud_run_service_name_effective
  web_container_image                   = var.web_container_image
  web_container_port                    = var.web_container_port
  web_custom_domain                     = var.web_custom_domain
  web_env_vars                          = var.web_env_vars
  web_secret_env_from_sm                = var.web_secret_env_from_sm
  network_id                            = local.network_stack_required ? data.terraform_remote_state.network[0].outputs.network_id : ""
  connector_subnet_name                 = local.network_stack_required ? data.terraform_remote_state.network[0].outputs.connector_subnet_name : ""
  cloud_sql_connection_name             = module.cloud_sql.cloud_sql_connection_name != null ? module.cloud_sql.cloud_sql_connection_name : ""
  database_url_secret_name              = module.cloud_sql.database_url_secret_name != null ? module.cloud_sql.database_url_secret_name : ""
  database_url_secret_version_name      = module.cloud_sql.database_url_secret_version_name != null ? module.cloud_sql.database_url_secret_version_name : ""
  cloudsql_client_iam_member_id         = module.cloud_sql.cloudsql_client_iam_member_id != null ? module.cloud_sql.cloudsql_client_iam_member_id : ""
  database_url_secret_id                = module.cloud_sql.database_url_secret_id != null ? module.cloud_sql.database_url_secret_id : ""
  gcs_uploads_bucket_name               = module.gcs.gcs_bucket_name_effective
  cloud_run_service_account             = local.cloud_run_service_account
  runtime_service_account_email         = local.runtime_service_account_email
  cron_scheduler_service_account_email  = var.enable_cron_cloud_scheduler ? local.cron_api_sa_email : ""
  pubsub_topic_call_completed           = module.pubsub.call_completed_topic_name
  pubsub_subscription_id                = module.pubsub.summarize_subscription_id
  redis_host                            = var.enable_cloud_sql ? module.memorystore[0].redis_host : ""
  redis_port                            = var.enable_cloud_sql ? tostring(module.memorystore[0].redis_port) : ""
  worker_cloud_run_service_name         = local.worker_cloud_run_service_name_effective
  worker_container_image                = local.worker_container_image_effective
  worker_dashboard_url                  = local.worker_dashboard_url_effective
  worker_secret_env_from_sm               = local.worker_secret_env_from_sm_effective
  cloud_run_api_min_instances_effective = local.cloud_run_api_min_instances_effective
  cloud_run_api_max_instances_effective = local.cloud_run_api_max_instances_effective
  cloud_run_api_cpu_effective           = local.cloud_run_api_cpu_effective
  cloud_run_api_memory_effective        = local.cloud_run_api_memory_effective
  cloud_run_api_timeout_effective       = local.cloud_run_api_timeout_effective
  cloud_run_api_concurrency_effective   = local.cloud_run_api_concurrency_effective
  cloud_run_web_min_instances_effective = local.cloud_run_web_min_instances_effective
  cloud_run_web_max_instances_effective = local.cloud_run_web_max_instances_effective
  cloud_run_web_cpu_effective           = local.cloud_run_web_cpu_effective
  cloud_run_web_memory_effective        = local.cloud_run_web_memory_effective
  cloud_run_web_timeout_effective       = local.cloud_run_web_timeout_effective
  cloud_run_web_concurrency_effective   = local.cloud_run_web_concurrency_effective
  cloud_run_worker_min_instances_effective = local.cloud_run_worker_min_instances_effective
  cloud_run_worker_max_instances_effective = local.cloud_run_worker_max_instances_effective
  cloud_run_worker_cpu_effective           = local.cloud_run_worker_cpu_effective
  cloud_run_worker_memory_effective        = local.cloud_run_worker_memory_effective
  cloud_run_worker_timeout_effective       = local.cloud_run_worker_timeout_effective
  cloud_run_worker_concurrency_effective   = local.cloud_run_worker_concurrency_effective
}

module "app_cron" {
  source = "../app_cron"

  depends_on = [
    module.cloud_run,
    google_project_service.cloudscheduler,
  ]
  enable_cron_cloud_scheduler   = var.enable_cron_cloud_scheduler
  project_id                    = var.project_id
  region                        = var.region
  env_suffix                    = var.env_suffix
  cron_timezone                 = var.cron_timezone
  cron_schedule_cleanup_tokens  = var.cron_schedule_cleanup_tokens
  cron_schedule_tbs_batch       = var.cron_schedule_tbs_batch
  cron_schedule_recommendations = var.cron_schedule_recommendations
  cloud_run_api_service_name    = module.cloud_run.cloud_run_service_name
  cloud_run_api_location        = var.region
  cloud_run_api_url             = module.cloud_run.cloud_run_url
}

module "sql_schedule" {
  source = "../sql_schedule"

  depends_on = [
    module.cloud_sql,
    google_project_service.artifactregistry,
    google_project_service.cloudscheduler,
  ]
  enable_cloud_sql                  = var.enable_cloud_sql
  enable_sql_night_weekend_schedule = var.enable_sql_night_weekend_schedule
  env_suffix                        = var.env_suffix
  project_id                        = var.project_id
  region                            = var.region
  sql_schedule_start_cron           = var.sql_schedule_start_cron
  sql_schedule_stop_cron            = var.sql_schedule_stop_cron
  sql_schedule_timezone             = var.sql_schedule_timezone
  scheduled_sql_instance_name       = module.cloud_sql.cloud_sql_instance_name != null ? module.cloud_sql.cloud_sql_instance_name : ""
  cloud_run_service_account         = local.cloud_run_service_account
}

# Template scaffold modules (disabled for Kumu until adopted)
module "armor" {
  source      = "../armor"
  project_id  = var.project_id
  region      = var.region
  environment = var.env_suffix
  enabled     = false
}

module "dns" {
  source      = "../dns"
  project_id  = var.project_id
  region      = var.region
  environment = var.env_suffix
  enabled     = false
}

module "lb" {
  source      = "../lb"
  project_id  = var.project_id
  region      = var.region
  environment = var.env_suffix
  enabled     = false
}

module "monitoring" {
  source      = "../monitoring"
  project_id  = var.project_id
  region      = var.region
  environment = var.env_suffix
  enabled     = false
}
