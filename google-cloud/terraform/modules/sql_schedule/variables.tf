# Slim variables for sql_schedule — only inputs used by this module.
# Full interface: modules/app_compose/variables.tf

variable "enable_cloud_sql" {
  type        = bool
  default     = false
  description = "Create MySQL instance, database, user, Secret Manager secret, and attach to the API Cloud Run service."
}

variable "enable_sql_night_weekend_schedule" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, create Cloud Scheduler (JST) + Cloud Functions Gen2 to set Cloud SQL activation_policy NEVER/ALWAYS.
    Use only for non-prod cost savings. Requires enable_cloud_sql = true.
  EOT
}

variable "env_suffix" {
  type        = string
  default     = "dev"
  description = "Suffix for GCS bucket / secrets / SQL instance naming (e.g. dev, prod). Use one apply per environment with its own tfvars."

  validation {
    condition     = can(regex("^[a-z0-9-]{1,16}$", var.env_suffix))
    error_message = "env_suffix must be lowercase letters, digits, hyphens, max 16 chars."
  }
}

variable "project_id" {
  type        = string
  description = "GCP project ID (e.g. kumu-dev)."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for Artifact Registry and Cloud Run."
}

variable "sql_instance_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Cloud SQL instance id (resource name). If empty, uses wiki pattern kumu-mysql-{env_suffix} (e.g. kumu-mysql-dev).
    Set explicitly to your existing instance id when migrating from an older naming pattern to avoid Terraform replacing the instance.
  EOT
}

variable "sql_schedule_start_cron" {
  type        = string
  default     = "0 8 * * 1-5"
  description = "Cron for starting SQL (Mon–Fri morning). Default 08:00 in sql_schedule_timezone."
}

variable "sql_schedule_stop_cron" {
  type        = string
  default     = "0 22 * * 1-5"
  description = "Cron for stopping SQL (Mon–Fri evening). Default 22:00 in sql_schedule_timezone; Fri 22:00 → Mon 08:00 stays off."
}

variable "sql_schedule_timezone" {
  type        = string
  default     = "Asia/Tokyo"
  description = "IANA timezone for Cloud Scheduler (default: Japan)."
}
