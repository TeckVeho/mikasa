output "sql_schedule_function_url" {
  value = var.enable_cloud_sql && var.enable_sql_night_weekend_schedule ? google_cloudfunctions2_function.sql_activation[0].url : null
}

output "sql_scheduler_job_stop" {
  value = var.enable_cloud_sql && var.enable_sql_night_weekend_schedule ? google_cloud_scheduler_job.sql_stop[0].name : null
}

output "sql_scheduler_job_start" {
  value = var.enable_cloud_sql && var.enable_sql_night_weekend_schedule ? google_cloud_scheduler_job.sql_start[0].name : null
}
