variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "asia-northeast1"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, stg, prod)"
}


variable "enabled" {
  type        = bool
  default     = false
  description = "Create resources for this module (Kumu: disabled until adopted)."
}
