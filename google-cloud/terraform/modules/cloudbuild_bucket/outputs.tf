output "cloudbuild_staging_bucket_name" {
  description = "Default Cloud Build GCS staging bucket name ({project_id}_cloudbuild)."
  value       = google_storage_bucket.cloudbuild_staging.name
}

output "cloudbuild_source_lifecycle_age_days" {
  description = "Age in days after which objects under source/ are deleted by lifecycle."
  value       = 7
}
