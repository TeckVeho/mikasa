# LogiVoice extensions: Memorystore Redis, Pub/Sub, Worker Cloud Run (see infra README).

variable "enable_memorystore_redis" {
  type        = bool
  default     = false
  description = "Create Memorystore for Redis instance on the VPC (requires network stack applied first)."
}

variable "redis_memory_size_gb" {
  type        = number
  default     = 1
  description = "Redis memory size (Basic tier)."
}

variable "redis_version" {
  type        = string
  default     = "REDIS_7_0"
  description = "Redis engine version string for google_redis_instance."
}

variable "enable_pubsub_call_pipeline" {
  type        = bool
  default     = false
  description = <<-EOT
    Create Pub/Sub topic + pull subscription for call-completed → summarize-worker.
    IAM grants the default Cloud Run runtime SA subscriber on the subscription when enable_worker is true.
  EOT
}

variable "pubsub_topic_id" {
  type        = string
  default     = "call-completed"
  description = "Pub/Sub topic semantic id; Terraform prefixes with logivoice- and suffixes env."
}

variable "pubsub_subscription_id" {
  type        = string
  default     = "summarize-worker"
  description = "Subscription id for summarize worker (pull)."
}

variable "enable_worker" {
  type        = bool
  default     = false
  description = "Create Cloud Run service logivoice-worker (async processor)."
}

variable "worker_cloud_run_service_name" {
  type        = string
  default     = "logivoice-worker-dev"
  description = "Cloud Run service id for worker (include env_suffix in naming via tfvars per env)."
}

variable "worker_container_image" {
  type        = string
  default     = ""
  description = "Full Artifact Registry URL for worker image; required when enable_worker is true."
}

variable "worker_container_port" {
  type        = number
  default     = 8080
  description = "Container listen port for worker."
}

variable "worker_env_vars" {
  type        = map(string)
  default     = { NODE_ENV = "production" }
  description = "Plain env for worker Cloud Run."
}

variable "worker_secret_env_from_sm" {
  type = list(object({
    env_name  = string
    secret_id = string
    version   = optional(string, "latest")
  }))
  default     = []
  description = "Secret Manager env injection for worker (same pattern as api_secret_env_from_sm)."
}

variable "allow_unauthenticated_worker" {
  type        = bool
  default     = false
  description = "If true, grant allUsers run.invoker on worker (usually false; use push subscription OIDC or internal only)."
}

variable "cloud_run_worker_min_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override worker min instances; if null, use module.tier_specs web row mirror (tier_worker) from resource_tier."
}

variable "cloud_run_worker_max_instances" {
  type        = number
  nullable    = true
  default     = null
  description = "Override worker max instances; if null, use tier_worker from resource_tier."
}

variable "cloud_run_worker_cpu" {
  type        = string
  nullable    = true
  default     = null
  description = "Override worker CPU; if null, use tier_worker from resource_tier."
}

variable "cloud_run_worker_memory" {
  type        = string
  nullable    = true
  default     = null
  description = "Override worker memory; if null, use tier_worker from resource_tier."
}

variable "cloud_run_worker_timeout" {
  type        = string
  nullable    = true
  default     = null
  description = "Override worker timeout; if null, use tier_worker from resource_tier."
}

variable "cloud_run_worker_concurrency" {
  type        = number
  nullable    = true
  default     = null
  description = "Override worker concurrency; if null, use tier_worker from resource_tier."
}
