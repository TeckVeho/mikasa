variable "project_id" {
  type        = string
  description = "GCP project ID (from GCP_PROJECT_ID in .env)."
}

variable "env_suffix" {
  type        = string
  default     = ""
  description = "Environment suffix (dev, stg, prod). Empty for project-level resources."
}

variable "component" {
  type        = string
  default     = ""
  description = "Optional single component for resource() output."
}

variable "max_length" {
  type        = number
  default     = 63
  description = "Max length for GCS bucket / Cloud Run / VPC names."
}

variable "sa_max_length" {
  type        = number
  default     = 30
  description = "Max length for google_service_account account_id."
}
