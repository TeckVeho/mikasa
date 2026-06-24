# Slim variables for iam — only inputs used by this module.
# Full interface: modules/app_compose/variables.tf

variable "project_display_name" {
  type        = string
  default     = ""
  description = "Display name for the GCP project in google_project; defaults to project_id if empty."
}

variable "project_iam_members" {
  type = list(object({
    member = string
    role   = string
    condition = optional(object({
      title       = string
      expression  = string
      description = optional(string)
    }))
  }))
  default     = []
  description = <<-EOT
    Extra project-level IAM bindings. When role is a scoped env custom role (kumuDevDeployer, etc.),
    IAM Condition for this env's resources is applied automatically if condition is omitted.
  EOT
}

variable "project_id" {
  type        = string
  description = "GCP project ID (e.g. veho-kumu)."
}

variable "env_suffix" {
  type        = string
  default     = "dev"
  description = "Environment suffix (dev | stg | prod). Used for env-scoped custom IAM roles."
}

variable "env_iam_scoped_resource_names" {
  type = object({
    gcs_buckets         = optional(list(string), [])
    cloud_run_services  = optional(list(string), [])
    cloud_sql_instances = optional(list(string), [])
    secret_ids          = optional(list(string), [])
  })
  default = {
    gcs_buckets         = []
    cloud_run_services  = []
    cloud_sql_instances = []
    secret_ids          = []
  }
  description = "Explicit resource names included in scoped custom-role IAM conditions (in addition to *-{env_suffix} patterns)."
}

variable "env_iam_principals" {
  type = object({
    deployers = optional(list(string), [])
    readonly  = optional(list(string), [])
  })
  default = {
    deployers = []
    readonly  = []
  }
  description = <<-EOT
    Users/groups to bind to this env's custom roles (scoped + global pair per role type).
    Scoped roles always receive IAM Conditions limiting access to this env's resources.
  EOT
}

variable "resource_tier" {
  type        = string
  description = "Wiki resource tier (e.g. tier3). Used for tier_specs sizing and GCP project label `tier` (always overwritten on apply)."

  validation {
    condition     = trimspace(var.resource_tier) != ""
    error_message = "resource_tier must be non-empty (e.g. tier3)."
  }
}
