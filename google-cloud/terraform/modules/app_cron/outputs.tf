output "cron_scheduler_service_account_email" {
  value = var.enable_cron_cloud_scheduler ? google_service_account.cron_api_scheduler[0].email : null
}

output "cron_scheduler_job_names" {
  value = var.enable_cron_cloud_scheduler ? {
    cleanup_tokens  = google_cloud_scheduler_job.cron_cleanup_tokens[0].name
    tbs_batch       = google_cloud_scheduler_job.cron_tbs_batch[0].name
    recommendations = google_cloud_scheduler_job.cron_recommendations[0].name
  } : null
}
