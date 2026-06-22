output "terraform_state_bucket_name" {
  value = google_storage_bucket.terraform_state.name
}

output "artifact_registry_repository_id" {
  value = module.artifact_registry.artifact_registry_repository_id
}

output "artifact_registry_repository_name" {
  value = module.artifact_registry.artifact_registry_repository_name
}

output "docker_repository_url_prefix" {
  description = "Prefix for container_image in app tfvars, e.g. REGION-docker.pkg.dev/PROJECT/REPO"
  value       = module.artifact_registry.docker_repository_url_prefix
}

output "cloudbuild_staging_bucket_name" {
  value = module.cloudbuild_bucket.cloudbuild_staging_bucket_name
}

output "cloudbuild_source_lifecycle_age_days" {
  value = module.cloudbuild_bucket.cloudbuild_source_lifecycle_age_days
}
