variable "enable_cron_cloud_scheduler" {
  type        = bool
  default     = false
  description = "If true, create Cloud Scheduler jobs that call Cloud Run API /internal/cron/* endpoints via OIDC."
}

variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  description = "Region for Cloud Scheduler jobs."
}

variable "env_suffix" {
  type        = string
  description = "Environment suffix used in scheduler resource names."
}

variable "cron_timezone" {
  type        = string
  default     = "Asia/Tokyo"
  description = "IANA timezone for scheduler jobs."
}

variable "cron_schedule_cleanup_tokens" {
  type        = string
  default     = "0 2 * * *"
  description = "Cron expression for cleanup tokens job."
}

variable "cron_schedule_tbs_batch" {
  type        = string
  default     = "0 2 * * 6"
  description = "Cron expression for TBS batch job."
}

variable "cron_schedule_recommendations" {
  type        = string
  default     = "0 3 * * 0"
  description = "Cron expression for recommendations job."
}

variable "cloud_run_api_service_name" {
  type        = string
  description = "API Cloud Run service name to grant invoker access."
}

variable "cloud_run_api_location" {
  type        = string
  description = "API Cloud Run service location."
}

variable "cloud_run_api_url" {
  type        = string
  description = "API Cloud Run URL used as scheduler target and OIDC audience."
}
