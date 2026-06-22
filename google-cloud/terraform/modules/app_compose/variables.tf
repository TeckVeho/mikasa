variable "project_id" {
  type        = string
  description = "GCP project ID (e.g. kumu-dev)."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for Artifact Registry and Cloud Run."
}

variable "container_image" {
  type        = string
  description = "Full image URL (must already exist in Artifact Registry), e.g. asia-northeast1-docker.pkg.dev/PROJECT/REPO/kumu-api:dev"
}

variable "container_port" {
  type        = number
  default     = 8080
  description = "Port the app listens on inside the container."
}

variable "allow_unauthenticated" {
  type        = bool
  default     = false
  description = "If true, grant roles/run.invoker to allUsers (public HTTP). Many orgs block allUsers via IAM policy; use false and grant invoker to specific principals or use IAP."
}

variable "env_vars" {
  type        = map(string)
  default     = { NODE_ENV = "production" }
  description = <<-EOT
    Plain environment variables for the API Cloud Run service (backend).
    When enable_gcs is true, GCS_BUCKET and GCP_PROJECT_ID are merged first; keys here override.
    Do not set DATABASE_URL here if enable_cloud_sql is true (injected from Secret Manager).
    Secrets (JWT_SECRET, STRIPE_*, GEMINI_API_KEY, …) should use Secret Manager + gcloud --set-secrets, not this map.
    See backend/.env.example for variable names.
  EOT
}

variable "enable_web" {
  type        = bool
  default     = true
  description = "Create the Next.js Cloud Run service (kumu-web). Set false only to skip web in a disposable stack."
}

variable "cloud_run_ingress" {
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
  description = "API Cloud Run ingress. Use INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER to restrict prod to a load balancer."
}

variable "web_cloud_run_ingress" {
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
  description = "Web Cloud Run ingress. Use INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER to restrict prod to a load balancer."
}

variable "web_container_image" {
  type        = string
  default     = ""
  description = "Full image URL for the web container (Artifact Registry). Required when enable_web is true."
}

variable "web_container_port" {
  type        = number
  default     = 3000
  description = "Port the Next.js standalone server listens on inside the container."
}

variable "web_env_vars" {
  type        = map(string)
  default     = { NODE_ENV = "production" }
  description = <<-EOT
    Plain environment variables for the web Cloud Run service (Next.js).
    Typical keys: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BASE_URL (see frontend/.env.example).
    NEXT_PUBLIC_* are baked in at docker build for client bundles; keep Cloud Build substitutions aligned with these URLs.
  EOT
}

variable "allow_unauthenticated_web" {
  type        = bool
  default     = false
  description = "If true, grant roles/run.invoker to allUsers for the web service. Set false if org policy blocks allUsers."
}

# --- Custom domains (DNS at your registrar; apex or subdomain) ---

variable "api_custom_domain" {
  type        = string
  default     = ""
  description = <<-EOT
    Optional FQDN for the API Cloud Run service (e.g. api.example.com or apex if you use it for API — rare).
    If non-empty, creates google_cloud_run_domain_mapping and merges API_URL (HTTPS origin only, no /api/v1) into the API service env.
    If only the web uses a custom domain, leave this empty and set URLs that still point to the default *.run.app host in env_vars.
  EOT
}

variable "web_custom_domain" {
  type        = string
  default     = ""
  description = <<-EOT
    Optional FQDN for the web Cloud Run service when enable_web = true (e.g. app.example.com or www.example.com).
    If non-empty, creates a domain mapping and merges FRONTEND_URL/CORS_ORIGINS (API) and NEXT_PUBLIC_* (web) when applicable.
    Requires enable_web = true.
  EOT
}

# --- Cloud Run API: scaling & resources (align with org tier / wiki) ---

variable "cloud_run_api_min_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override API min instances; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_api_max_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override API max instances; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_api_cpu" {
  type        = string
  nullable    = true
  default     = null
  description = "Override API CPU; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_api_memory" {
  type        = string
  nullable    = true
  default     = null
  description = "Override API memory; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_api_timeout" {
  type        = string
  nullable    = true
  default     = null
  description = "Override API timeout; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_api_concurrency" {
  type        = number
  nullable    = true
  default     = null
  description = "Override API concurrency; if null, use module.tier_specs from resource_tier."
}

# --- Cloud Run Web: scaling & resources ---

variable "cloud_run_web_min_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override web min instances; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_web_max_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override web max instances; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_web_cpu" {
  type        = string
  nullable    = true
  default     = null
  description = "Override web CPU; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_web_memory" {
  type        = string
  nullable    = true
  default     = null
  description = "Override web memory; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_web_timeout" {
  type        = string
  nullable    = true
  default     = null
  description = "Override web timeout; if null, use module.tier_specs from resource_tier."
}

variable "cloud_run_web_concurrency" {
  type        = number
  nullable    = true
  default     = null
  description = "Override web concurrency; if null, use module.tier_specs from resource_tier."
}

# --- Secrets: reference existing Secret Manager secrets (no values in tfvars) ---

variable "api_secret_env_from_sm" {
  type = list(object({
    env_name  = string
    secret_id = string
    version   = optional(string, "latest")
  }))
  default     = []
  description = <<-EOT
    Inject env vars from Secret Manager (create secrets in GCP first). Runtime SA gets secretAccessor on each secret_id.
    Do not use env names that already exist in env_vars.
  EOT
}

variable "web_secret_env_from_sm" {
  type = list(object({
    env_name  = string
    secret_id = string
    version   = optional(string, "latest")
  }))
  default     = []
  description = "Same as api_secret_env_from_sm for the web Cloud Run service when enable_web = true."
}

# --- Optional: project IAM (custom roles + manual bindings) ---

variable "enable_env_iam_custom_roles" {
  type        = bool
  default     = false
  description = <<-EOT
    When true, create project custom IAM roles for this env_suffix (dev/stg/prod deployer + readonly).
    Bind users via env_iam_principals or project_iam_members — scoped roles auto-receive IAM Conditions.
  EOT
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
  description = "Users/groups bound to this env's custom roles (scoped + global pair). Owner is not managed here."
}

variable "env_iam_extra_scoped_gcs_buckets" {
  type        = list(string)
  default     = []
  description = "Extra GCS bucket names included in scoped IAM conditions (e.g. legacy prod bucket dx-kumu-prod-files)."
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
    Project-level IAM bindings. Scoped env custom roles (kumuDevDeployer, etc.) auto-receive IAM Conditions
    for this env's resources when condition is omitted.
  EOT
}

variable "resource_tier" {
  type        = string
  description = "Wiki resource tier (e.g. tier3). Sizes Cloud Run/SQL via tier_specs and sets GCP project label `tier` on each apply."

  validation {
    condition     = trimspace(var.resource_tier) != ""
    error_message = "resource_tier must be non-empty (e.g. tier3)."
  }
}

variable "project_display_name" {
  type        = string
  default     = ""
  description = "Optional GCP project display name when updating project metadata via google_project."
}

# --- Environment label (use separate tfvars / workspace for dev vs prod) ---

variable "env_suffix" {
  type        = string
  default     = "dev"
  description = "Suffix for GCS bucket / secrets / SQL instance naming (e.g. dev, prod). Use one apply per environment with its own tfvars."

  validation {
    condition     = can(regex("^[a-z0-9-]{1,16}$", var.env_suffix))
    error_message = "env_suffix must be lowercase letters, digits, hyphens, max 16 chars."
  }
}

# --- GCS (optional uploads bucket; app code may still use S3 until switched to GCS) ---

variable "enable_gcs" {
  type        = bool
  default     = true
  description = "Create a regional GCS bucket and grant the Cloud Run runtime SA objectAdmin."
}

# --- Vertex AI (Gemini via ADC on Cloud Run; alternative to GEMINI_API_KEY in Secret Manager) ---

variable "enable_vertex_ai" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, enable Vertex AI API + grant Cloud Run SA roles/aiplatform.user, and set VERTEX_AI=true on the API service.
    When enabled, the app uses Vertex exclusively (GEMINI_API_KEY is ignored). Omit GEMINI_API_KEY from api_secret_env_from_sm.
  EOT
}

variable "vertex_ai_location" {
  type        = string
  default     = ""
  description = "Vertex AI region (e.g. asia-northeast1). If empty, uses var.region."
}

# --- Cloud SQL MySQL (optional; wires DATABASE_URL via Secret Manager + unix socket on Cloud Run) ---

variable "enable_cloud_sql" {
  type        = bool
  default     = false
  description = "Create MySQL instance, database, user, Secret Manager secret, and attach to the API Cloud Run service."
}

variable "sql_instance_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Cloud SQL instance id (resource name). If empty, uses {project_id}-mysql-{env_suffix} (e.g. veho-kumu-mysql-dev).
    Set explicitly only when migrating from an older naming pattern to avoid Terraform replacing the instance.
  EOT
}

variable "sql_tier" {
  type        = string
  nullable    = true
  default     = null
  description = "Override Cloud SQL machine tier; if null, use module.tier_specs.sql_instance_tier from resource_tier."
}

variable "sql_disk_size_gb" {
  type        = number
  nullable    = true
  default     = null
  description = "Override Cloud SQL disk size (GB); if null, use wiki tier_specs per tier + env_suffix→wiki env."
}

variable "sql_disk_type" {
  type        = string
  nullable    = true
  default     = null
  description = "Override PD_SSD or PD_HDD; if null, use wiki tier_specs."
}

variable "sql_database_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Logical database name inside the instance. If empty, uses {project_id}-mysql-{env_suffix} (e.g. veho-kumu-mysql-dev).
    Set explicitly only when keeping a legacy name to avoid Terraform replacing the database.
  EOT
}

variable "sql_user_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Application MySQL user name. If empty, uses the same name as the logical database ({project_id}-mysql-{env_suffix}).
    Set explicitly only when keeping a legacy user to avoid Terraform replacing the user.
  EOT
}

variable "sql_backup_enabled" {
  type        = bool
  default     = false
  description = "Enable automated daily backups for Cloud SQL (dev/stg only; prod always true). See sql_backup_start_time and sql_point_in_time_recovery_enabled."
}

variable "sql_backup_start_time" {
  type        = string
  default     = "17:00"
  description = "Daily backup window start UTC HH:MM (dev/stg only; prod fixed at 17:00 ≈ 02:00 JST next day)."
}

variable "sql_point_in_time_recovery_enabled" {
  type        = bool
  default     = false
  description = "Point-in-time recovery (transaction logs); requires backups enabled. Default false; set true in tfvars when needed (all envs including prod)."
}

variable "enable_sql_audit" {
  type        = bool
  default     = false
  description = "Enable cloudsql_mysql_audit flag in Cloud SQL (generates Data Access logs, may incur cost on high traffic)"
}

# --- Network stack (remote state) — required when enable_cloud_sql = true ---

variable "network_remote_state_bucket" {
  type        = string
  default     = ""
  description = "GCS bucket for the network Terraform state (from google-cloud/terraform/environments/<env>/network). Required when enable_cloud_sql is true."
}

variable "network_remote_state_prefix" {
  type        = string
  default     = ""
  description = "State prefix for the network stack, e.g. network/dev — must match network/backend.tf."
}

# --- Prisma migrate (Cloud Run Job; requires enable_cloud_sql) ---

variable "cloud_run_migrate_job_name" {
  type        = string
  default     = ""
  description = "Cloud Run Job name for `npx prisma migrate deploy`. If empty, uses kumu-migrate-{env_suffix}."
}

# --- API cron: Cloud Scheduler → Cloud Run (OIDC) — matches backend DISABLE_IN_PROCESS_CRON + /internal/cron ---

variable "enable_cron_cloud_scheduler" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, create a service account + Cloud Scheduler jobs that POST to the API /internal/cron/* with OIDC,
    and merge DISABLE_IN_PROCESS_CRON=1 and CRON_SCHEDULER_SERVICE_ACCOUNT into the API Cloud Run env.
    Requires the backend migration cron_invocations (Prisma) applied on the database.
  EOT
}

variable "cron_timezone" {
  type        = string
  default     = "Asia/Tokyo"
  description = "IANA timezone for app cron Scheduler jobs (align with backend TIMEZONE)."
}

variable "cron_schedule_cleanup_tokens" {
  type        = string
  default     = "0 2 * * *"
  description = "Cron for refresh-token cleanup (default 02:00 in cron_timezone)."
}

variable "cron_schedule_tbs_batch" {
  type        = string
  default     = "0 2 * * 6"
  description = "Cron for TBS batch (default Saturday 02:00). Backend skips unless RUN_TBS_CRON=1."
}

variable "cron_schedule_recommendations" {
  type        = string
  default     = "0 3 * * 0"
  description = "Cron for AI recommendations batch (default Sunday 03:00)."
}

# --- Cloud SQL night/weekend schedule (dev; JST) — requires enable_cloud_sql ---

variable "enable_sql_night_weekend_schedule" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, create Cloud Scheduler (JST) + Cloud Functions Gen2 to set Cloud SQL activation_policy NEVER/ALWAYS.
    Use only for non-prod cost savings. Requires enable_cloud_sql = true.
  EOT
}

variable "sql_schedule_timezone" {
  type        = string
  default     = "Asia/Tokyo"
  description = "IANA timezone for Cloud Scheduler (default: Japan)."
}

variable "sql_schedule_start_cron" {
  type        = string
  default     = "0 8 * * 1-5"
  description = "Cron for starting SQL (Mon–Fri morning). Default 08:00 in sql_schedule_timezone."
}

variable "sql_schedule_stop_cron" {
  type        = string
  default     = "0 22 * * 1-5"
  description = "Cron for stopping SQL (Mon–Fri evening). Default 22:00 in sql_schedule_timezone; Fri 22:00 → Mon 08:00 stays off."
}
