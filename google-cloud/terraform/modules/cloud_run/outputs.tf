output "cloud_run_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "api_public_base_url" {
  value = local.api_custom_domain_fqdn != "" ? "https://${local.api_custom_domain_fqdn}" : trimsuffix(google_cloud_run_v2_service.api.uri, "/")
}

output "web_public_base_url" {
  value = !var.enable_web ? null : (local.web_custom_domain_fqdn != "" ? "https://${local.web_custom_domain_fqdn}" : trimsuffix(google_cloud_run_v2_service.web[0].uri, "/"))
}

output "api_domain_mapping_status" {
  value = length(google_cloud_run_domain_mapping.api) > 0 ? google_cloud_run_domain_mapping.api[0].status : null
}

output "web_domain_mapping_status" {
  value = length(google_cloud_run_domain_mapping.web) > 0 ? google_cloud_run_domain_mapping.web[0].status : null
}

output "cloud_run_service_name" {
  value = google_cloud_run_v2_service.api.name
}

output "web_cloud_run_url" {
  value = var.enable_web ? google_cloud_run_v2_service.web[0].uri : null
}

output "web_cloud_run_service_name" {
  value = var.enable_web ? google_cloud_run_v2_service.web[0].name : null
}

output "cloud_run_migrate_job_name" {
  value = var.enable_cloud_sql ? google_cloud_run_v2_job.migrate[0].name : null
}

output "worker_cloud_run_uri" {
  value = google_cloud_run_v2_service.worker.uri
}

output "worker_cloud_run_service_name" {
  value = google_cloud_run_v2_service.worker.name
}

