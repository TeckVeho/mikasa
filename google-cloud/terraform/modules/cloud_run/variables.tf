# Slim variables for cloud_run — only inputs used by this module.
# Full interface: modules/app_compose/variables.tf

variable "allow_unauthenticated" {
  type        = bool
  default     = false
  description = "If true, grant roles/run.invoker to allUsers (public HTTP). Many orgs block allUsers via IAM policy; use false and grant invoker to specific principals or use IAP."
}

variable "allow_unauthenticated_web" {
  type        = bool
  default     = false
  description = "If true, grant roles/run.invoker to allUsers for the web service. Set false if org policy blocks allUsers."
}

variable "api_custom_domain" {
  type        = string
  default     = ""
  description = <<-EOT
    Optional FQDN for the API Cloud Run service (e.g. api.example.com or apex if you use it for API — rare).
    If non-empty, creates google_cloud_run_domain_mapping and merges API_URL (HTTPS origin only, no /api/v1) into the API service env.
    If only the web uses a custom domain, leave this empty and set URLs that still point to the default *.run.app host in env_vars.
  EOT
}

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

variable "cloud_run_migrate_job_name" {
  type        = string
  default     = ""
  description = "Cloud Run Job name for migrate. Empty → {project}-migrate-{env_suffix}."
}

variable "cloud_run_service_name" {
  type        = string
  description = "Cloud Run API service name."
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

variable "enable_cloud_sql" {
  type        = bool
  default     = false
  description = "Create MySQL instance, database, user, Secret Manager secret, and attach to the API Cloud Run service."
}

variable "enable_cron_cloud_scheduler" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, create a service account + Cloud Scheduler jobs that POST to the API /internal/cron/* with OIDC,
    and merge DISABLE_IN_PROCESS_CRON=1 and CRON_SCHEDULER_SERVICE_ACCOUNT into the API Cloud Run env.
    Requires the backend migration cron_invocations (Prisma) applied on the database.
  EOT
}

variable "enable_gcs" {
  type        = bool
  default     = true
  description = "Create a regional GCS bucket and grant the Cloud Run runtime SA objectAdmin."
}

variable "enable_vertex_ai" {
  type        = bool
  default     = false
  description = <<-EOT
    If true, enable Vertex AI API + grant Cloud Run SA roles/aiplatform.user, and set VERTEX_AI=true on the API service.
    When enabled, the app uses Vertex exclusively (GEMINI_API_KEY is ignored). Omit GEMINI_API_KEY from api_secret_env_from_sm.
  EOT
}

variable "enable_web" {
  type        = bool
  default     = true
  description = "Create the Next.js Cloud Run service (kumu-web). Set false only to skip web in a disposable stack."
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

variable "project_id" {
  type        = string
  description = "GCP project ID (e.g. kumu-dev)."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for Artifact Registry and Cloud Run."
}

variable "vertex_ai_location" {
  type        = string
  default     = ""
  description = "Vertex AI region (e.g. asia-northeast1). If empty, uses var.region."
}

variable "web_cloud_run_service_name" {
  type        = string
  description = "Cloud Run web service name."
}

variable "cloud_run_ingress" {
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
  description = "API Cloud Run ingress. Use INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER to restrict prod to a load balancer."
  validation {
    condition     = contains(["INGRESS_TRAFFIC_ALL", "INGRESS_TRAFFIC_INTERNAL_ONLY", "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"], var.cloud_run_ingress)
    error_message = "cloud_run_ingress must be one of INGRESS_TRAFFIC_ALL, INGRESS_TRAFFIC_INTERNAL_ONLY, INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER."
  }
}

variable "web_cloud_run_ingress" {
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
  description = "Web Cloud Run ingress. Use INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER to restrict prod to a load balancer."
  validation {
    condition     = contains(["INGRESS_TRAFFIC_ALL", "INGRESS_TRAFFIC_INTERNAL_ONLY", "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"], var.web_cloud_run_ingress)
    error_message = "web_cloud_run_ingress must be one of INGRESS_TRAFFIC_ALL, INGRESS_TRAFFIC_INTERNAL_ONLY, INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER."
  }
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

variable "web_custom_domain" {
  type        = string
  default     = ""
  description = <<-EOT
    Optional FQDN for the web Cloud Run service when enable_web = true (e.g. app.example.com or www.example.com).
    If non-empty, creates a domain mapping and merges FRONTEND_URL/CORS_ORIGINS (API) and NEXT_PUBLIC_* (web) when applicable.
    Requires enable_web = true.
  EOT
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

variable "web_secret_env_from_sm" {
  type = list(object({
    env_name  = string
    secret_id = string
    version   = optional(string, "latest")
  }))
  default     = []
  description = "Same as api_secret_env_from_sm for the web Cloud Run service when enable_web = true."
}
