locals {
  prefix = var.project_id
}

output "prefix" {
  value = local.prefix
}

output "project_resource" {
  description = "{project}-{component} truncated for project-level resources (AR repo, etc.)."
  value       = substr(replace("${local.prefix}-${var.component}", "_", "-"), 0, var.max_length)
}

output "resource" {
  description = "{project}-{component}-{env} for env-scoped resources."
  value = var.component != "" && var.env_suffix != "" ? substr(
    replace("${local.prefix}-${var.component}-${var.env_suffix}", "_", "-"),
    0,
    var.max_length
  ) : ""
}

output "service_account_id" {
  description = "account_id for google_service_account (max 30 chars)."
  value = var.component != "" && var.env_suffix != "" ? substr(
    replace("${local.prefix}-${var.component}-${var.env_suffix}", "_", "-"),
    0,
    var.sa_max_length
  ) : substr(replace("${local.prefix}-${var.component}", "_", "-"), 0, var.sa_max_length)
}

output "artifact_repo_id" {
  value = substr(replace("${local.prefix}-docker", "_", "-"), 0, var.max_length)
}

output "state_bucket_name" {
  value = substr(replace("${local.prefix}-terraform-state", "_", "-"), 0, var.max_length)
}

output "cloudbuild_staging_bucket" {
  description = "GCP default Cloud Build bucket; not renamed (convention {project_id}_cloudbuild)."
  value       = "${var.project_id}_cloudbuild"
}
