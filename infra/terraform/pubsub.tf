resource "google_project_service" "pubsub" {
  count   = var.enable_pubsub_call_pipeline ? 1 : 0
  project = var.project_id
  service = "pubsub.googleapis.com"
}

locals {
  pubsub_topic_name_effective = replace(lower("logivoice-${var.pubsub_topic_id}-${var.env_suffix}"), "_", "-")
  pubsub_sub_name_effective   = replace(lower("logivoice-${var.pubsub_subscription_id}-${var.env_suffix}"), "_", "-")
}

resource "google_pubsub_topic" "call_completed" {
  count = var.enable_pubsub_call_pipeline ? 1 : 0

  name    = local.pubsub_topic_name_effective
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

# Pull subscription: worker consumes with roles/pubsub.subscriber on default compute SA when enable_worker=true.
resource "google_pubsub_subscription" "summarize_worker" {
  count = var.enable_pubsub_call_pipeline ? 1 : 0

  name  = local.pubsub_sub_name_effective
  topic = google_pubsub_topic.call_completed[0].name

  ack_deadline_seconds = 600

  depends_on = [google_pubsub_topic.call_completed]
}

resource "google_pubsub_subscription_iam_member" "worker_subscriber" {
  count = var.enable_pubsub_call_pipeline && var.enable_worker ? 1 : 0

  subscription = google_pubsub_subscription.summarize_worker[0].id
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${local.cloud_run_service_account}"
}
