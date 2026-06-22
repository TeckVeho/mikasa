output "iam_env_custom_roles_enabled" {
  description = "Whether env-scoped custom IAM roles are created for this stack."
  value       = var.enable_env_iam_custom_roles
}

output "iam_env_custom_roles" {
  description = "Custom IAM roles for this env_suffix (bind via env_iam_principals or project_iam_members)."
  value       = module.iam.env_iam_custom_roles
}

output "iam_env_scope_condition" {
  description = "IAM Condition expression for scoped custom-role bindings in this env."
  value       = module.iam.iam_env_scope_condition
}

output "resource_tier" {
  value = var.resource_tier
}

output "gcp_project_labels" {
  value = module.iam.gcp_project_labels
}

output "cloud_sql_instance_name" {
  value = module.cloud_sql.cloud_sql_instance_name
}

output "cloud_run_url" {
  value = module.cloud_run.cloud_run_url
}

output "api_public_base_url" {
  value = module.cloud_run.api_public_base_url
}

output "web_public_base_url" {
  value = module.cloud_run.web_public_base_url
}

output "api_domain_mapping_status" {
  value = module.cloud_run.api_domain_mapping_status
}

output "web_domain_mapping_status" {
  value = module.cloud_run.web_domain_mapping_status
}

output "cloud_run_service_name" {
  value = module.cloud_run.cloud_run_service_name
}

output "web_cloud_run_url" {
  value = module.cloud_run.web_cloud_run_url
}

output "web_cloud_run_service_name" {
  value = module.cloud_run.web_cloud_run_service_name
}

output "gcs_uploads_bucket" {
  value = module.gcs.gcs_uploads_bucket
}

output "cloud_sql_connection_name" {
  value = module.cloud_sql.cloud_sql_connection_name
}

output "secret_database_url_id" {
  value = module.cloud_sql.database_url_secret_id
}

output "cloud_run_migrate_job_name" {
  value = module.cloud_run.cloud_run_migrate_job_name
}

output "sql_schedule_function_url" {
  value = module.sql_schedule.sql_schedule_function_url
}

output "sql_scheduler_job_stop" {
  value = module.sql_schedule.sql_scheduler_job_stop
}

output "sql_scheduler_job_start" {
  value = module.sql_schedule.sql_scheduler_job_start
}

output "cron_scheduler_service_account_email" {
  value = module.app_cron.cron_scheduler_service_account_email
}

output "cron_scheduler_job_names" {
  value = module.app_cron.cron_scheduler_job_names
}
