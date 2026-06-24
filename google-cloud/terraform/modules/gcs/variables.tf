# Slim variables for gcs — only inputs used by this module.
# Full interface: modules/app_compose/variables.tf

variable "enable_gcs" {
  type        = bool
  default     = true
  description = "Create a regional GCS bucket and grant the Cloud Run runtime SA objectAdmin."
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
