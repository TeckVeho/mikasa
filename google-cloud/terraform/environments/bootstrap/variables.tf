variable "project_id" {
  type        = string
  description = "GCP project (default veho-kumu; see google-cloud/scripts/load-env.sh)."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Bucket and Artifact Registry region."
}

variable "state_bucket_name" {
  type        = string
  default     = ""
  description = "Terraform state GCS bucket. Empty → {project}-terraform-state."
}

variable "artifact_repo_id" {
  type        = string
  default     = ""
  description = "Docker Artifact Registry repository id. Empty → {project}-docker."
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
  default     = ["prod", "stg"]
}

variable "artifact_cleanup_delete_untagged_after_days" {
  type        = number
  default     = 7
  validation {
    condition     = var.artifact_cleanup_delete_untagged_after_days >= 1
    error_message = "artifact_cleanup_delete_untagged_after_days must be >= 1."
  }
}
