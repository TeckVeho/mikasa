variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for Artifact Registry."
}

variable "artifact_repo_id" {
  type        = string
  description = "Docker Artifact Registry repository id (must match app stack container_image URLs)."
}

variable "grant_default_compute_reader" {
  type        = bool
  default     = true
  description = "Grant roles/artifactregistry.reader to the project default compute SA (legacy Cloud Run pulls)."
}

variable "additional_artifact_registry_reader_members" {
  type        = list(string)
  default     = []
  description = "Extra IAM members with roles/artifactregistry.reader on the repository."
}

variable "additional_artifact_registry_writer_members" {
  type        = list(string)
  default     = []
  description = "IAM members with roles/artifactregistry.writer (e.g. Cloud Build SA)."
}

variable "artifact_cleanup_keep_count" {
  type        = number
  default     = 10
  validation {
    condition     = var.artifact_cleanup_keep_count >= 1
    error_message = "artifact_cleanup_keep_count must be >= 1."
  }
}

variable "artifact_cleanup_keep_tag_prefixes" {
  type        = list(string)
  default     = []
}

variable "artifact_cleanup_delete_untagged_after_days" {
  type        = number
  default     = 7
  validation {
    condition     = var.artifact_cleanup_delete_untagged_after_days >= 1
    error_message = "artifact_cleanup_delete_untagged_after_days must be >= 1."
  }
}
