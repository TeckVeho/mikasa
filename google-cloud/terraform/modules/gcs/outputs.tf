output "gcs_uploads_bucket" {
  value = var.enable_gcs ? google_storage_bucket.uploads[0].name : null
}

output "gcs_bucket_name_effective" {
  value = var.enable_gcs ? local.gcs_bucket_name_effective : ""
}
