output "cloud_sql_instance_name" {
  value = var.enable_cloud_sql ? google_sql_database_instance.main[0].name : null
}

output "cloud_sql_connection_name" {
  value = var.enable_cloud_sql ? google_sql_database_instance.main[0].connection_name : null
}

output "database_url_secret_name" {
  value = var.enable_cloud_sql ? google_secret_manager_secret.database_url[0].name : null
}

output "database_url_secret_version_name" {
  value = var.enable_cloud_sql ? google_secret_manager_secret_version.database_url[0].name : null
}

output "cloudsql_client_iam_member_id" {
  value = var.enable_cloud_sql ? google_project_iam_member.cloudrun_sql_client[0].id : null
}

output "database_url_secret_id" {
  value = var.enable_cloud_sql ? google_secret_manager_secret.database_url[0].secret_id : null
}
