variable "network_id" {
  type        = string
  default     = ""
  description = "VPC network id from network remote state."
}

variable "connector_subnet_name" {
  type        = string
  default     = ""
  description = "Subnet name for Direct VPC egress."
}

variable "cloud_sql_connection_name" {
  type        = string
  default     = ""
  description = "Cloud SQL connection name for Cloud Run volume."
}

variable "database_url_secret_name" {
  type        = string
  default     = ""
  description = "Secret Manager secret resource name for DATABASE_URL."
}

variable "database_url_secret_version_name" {
  type        = string
  default     = ""
  description = "Secret version name for Terraform annotations."
}

variable "cloudsql_client_iam_member_id" {
  type        = string
  default     = ""
  description = "IAM member binding id for cloudsql.client."
}

variable "gcs_uploads_bucket_name" {
  type        = string
  default     = ""
  description = "Effective GCS uploads bucket name from gcs module."
}

variable "cloud_run_api_min_instances_effective" { type = number }
variable "cloud_run_api_max_instances_effective" { type = number }
variable "cloud_run_api_cpu_effective" { type = string }
variable "cloud_run_api_memory_effective" { type = string }
variable "cloud_run_api_timeout_effective" { type = string }
variable "cloud_run_api_concurrency_effective" { type = number }
variable "cloud_run_web_min_instances_effective" { type = number }
variable "cloud_run_web_max_instances_effective" { type = number }
variable "cloud_run_web_cpu_effective" { type = string }
variable "cloud_run_web_memory_effective" { type = string }
variable "cloud_run_web_timeout_effective" { type = string }
variable "cloud_run_web_concurrency_effective" { type = number }

variable "cloud_run_service_account" {
  type        = string
  description = "Cloud Run runtime SA email."
}

variable "runtime_service_account_email" {
  type        = string
  default     = ""
  description = "If set, assign this SA on the Cloud Run service/job templates. Empty → omit (platform default compute SA)."
}

variable "cron_scheduler_service_account_email" {
  type        = string
  default     = ""
  description = "Scheduler SA email injected into API env when enable_cron_cloud_scheduler is true."
}

variable "database_url_secret_id" {
  type        = string
  default     = ""
  description = "DATABASE_URL secret id for migrate job."
}
