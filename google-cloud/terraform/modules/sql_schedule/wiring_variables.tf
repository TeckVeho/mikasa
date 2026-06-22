variable "scheduled_sql_instance_name" {
  type        = string
  default     = ""
  description = "Cloud SQL instance name for schedule function (from cloud_sql module)."
}

variable "cloud_run_service_account" {
  type        = string
  description = "Cloud Run runtime service account email."
}
