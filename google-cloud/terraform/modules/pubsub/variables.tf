variable "project_id" {
  type = string
}

variable "topic_name" {
  type        = string
  description = "Pub/Sub topic id."
}

variable "subscription_name" {
  type        = string
  description = "Pull subscription id for the summarize worker."
}

variable "cloud_run_service_account" {
  type        = string
  description = "Runtime SA granted roles/pubsub.publisher (API) and roles/pubsub.subscriber (worker)."
}
