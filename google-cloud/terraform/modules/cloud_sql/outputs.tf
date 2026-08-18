output "cloud_sql_instance_name" {
  value = local.sql_managed ? google_sql_database_instance.main[0].name : null
}

output "cloud_sql_connection_name" {
  value = local.sql_wired ? local.connection_name_effective : null
}

output "sql_managed" {
  value = local.sql_managed
}

output "database_url_secret_name" {
  value = local.sql_wired ? google_secret_manager_secret.database_url[0].name : null
}

output "database_url_secret_version_name" {
  value = local.sql_wired ? google_secret_manager_secret_version.database_url[0].name : null
}

output "cloudsql_client_iam_member_id" {
  value = local.sql_wired ? google_project_iam_member.cloudrun_sql_client[0].id : null
}

output "database_url_secret_id" {
  value = local.sql_wired ? google_secret_manager_secret.database_url[0].secret_id : null
}
