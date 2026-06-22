# Slim variables for cloud_sql — only inputs used by this module.
# Full interface: modules/app_compose/variables.tf

variable "enable_cloud_sql" {
  type        = bool
  default     = false
  description = "Create MySQL instance, database, user, Secret Manager secret, and attach to the API Cloud Run service."
}

variable "enable_sql_audit" {
  type        = bool
  default     = false
  description = "Enable cloudsql_mysql_audit flag in Cloud SQL (generates Data Access logs, may incur cost on high traffic)"
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

variable "sql_backup_enabled" {
  type        = bool
  default     = false
  description = "Enable automated daily backups for Cloud SQL. When true, sets backup window and optional PITR (see sql_backup_* variables)."
}

variable "sql_backup_start_time" {
  type        = string
  default     = "17:00"
  description = "Daily backup window start (UTC, HH:MM). Used only when sql_backup_enabled is true. Example: 17:00 UTC ≈ 02:00 JST next calendar day."
}

variable "sql_database_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Logical database name inside the instance. If empty, uses {project_id}-mysql-{env_suffix} (e.g. veho-kumu-mysql-dev).
    Set explicitly only when keeping a legacy name to avoid Terraform replacing the database.
  EOT
}

variable "sql_instance_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Cloud SQL instance id (resource name). If empty, uses {project_id}-mysql-{env_suffix} (e.g. veho-kumu-mysql-dev).
    Set explicitly only when migrating from an older naming pattern to avoid Terraform replacing the instance.
  EOT
}

variable "sql_point_in_time_recovery_enabled" {
  type        = bool
  default     = false
  description = "Enable point-in-time recovery (transaction logs); requires sql_backup_enabled = true. Increases storage cost; prefer true for production."
}

variable "sql_user_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Application MySQL user name. If empty, uses the same name as the logical database ({project_id}-mysql-{env_suffix}).
    Set explicitly only when keeping a legacy user to avoid Terraform replacing the user.
  EOT
}
