variable "network_self_link" {
  type        = string
  description = "VPC self link from network stack remote state."
  default     = ""
}

variable "cloud_run_service_account" {
  type        = string
  description = "Cloud Run runtime service account email."
}

variable "sql_tier_effective" {
  type        = string
  description = "Effective Cloud SQL machine tier."
}

variable "sql_disk_size_gb_effective" {
  type        = number
  description = "Effective Cloud SQL disk size GB."
}

variable "sql_disk_type_effective" {
  type        = string
  description = "Effective Cloud SQL disk type."
}
