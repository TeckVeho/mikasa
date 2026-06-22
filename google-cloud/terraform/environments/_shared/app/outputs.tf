output "iam_env_custom_roles_enabled" {
  value = module.app_compose.iam_env_custom_roles_enabled
}

output "iam_env_custom_roles" {
  value = module.app_compose.iam_env_custom_roles
}

output "resource_tier" {
  value = var.resource_tier
}

output "gcp_project_labels" {
  value = module.app_compose.gcp_project_labels
}

output "cloud_sql_instance_name" {
  value = module.app_compose.cloud_sql_instance_name
}

output "cloud_run_url" {
  value = module.app_compose.cloud_run_url
}

output "api_public_base_url" {
  value = module.app_compose.api_public_base_url
}

output "web_public_base_url" {
  value = module.app_compose.web_public_base_url
}

output "api_domain_mapping_status" {
  value = module.app_compose.api_domain_mapping_status
}

output "web_domain_mapping_status" {
  value = module.app_compose.web_domain_mapping_status
}

output "cloud_run_service_name" {
  value = module.app_compose.cloud_run_service_name
}

output "web_cloud_run_url" {
  value = module.app_compose.web_cloud_run_url
}

output "web_cloud_run_service_name" {
  value = module.app_compose.web_cloud_run_service_name
}

output "gcs_uploads_bucket" {
  value = module.app_compose.gcs_uploads_bucket
}

output "cloud_sql_connection_name" {
  value = module.app_compose.cloud_sql_connection_name
}

output "secret_database_url_id" {
  value = module.app_compose.secret_database_url_id
}

output "cloud_run_migrate_job_name" {
  value = module.app_compose.cloud_run_migrate_job_name
}

output "sql_schedule_function_url" {
  value = module.app_compose.sql_schedule_function_url
}

output "sql_scheduler_job_stop" {
  value = module.app_compose.sql_scheduler_job_stop
}

output "sql_scheduler_job_start" {
  value = module.app_compose.sql_scheduler_job_start
}

output "cron_scheduler_service_account_email" {
  value = module.app_compose.cron_scheduler_service_account_email
}

output "cron_scheduler_job_names" {
  value = module.app_compose.cron_scheduler_job_names
}
