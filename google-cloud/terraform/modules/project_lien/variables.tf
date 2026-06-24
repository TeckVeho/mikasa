variable "project_id" {
  type        = string
  description = "GCP project ID to protect from deletion."
}

variable "enable" {
  type        = bool
  default     = true
  description = "When false, no lien is created (or an existing managed lien is removed on apply)."
}

variable "restrictions" {
  type        = list(string)
  default     = ["resourcemanager.projects.delete"]
  description = "Lien restrictions. Default blocks project deletion only."
}

variable "origin" {
  type        = string
  default     = "logivoice-terraform"
  description = "Lien origin metadata (shown in GCP Console)."
}

variable "reason" {
  type        = string
  default     = "Prevent accidental project deletion — remove lien only when decommissioning."
  description = "Human-readable reason for the delete-protection lien."
}
