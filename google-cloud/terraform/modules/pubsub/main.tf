resource "google_project_service" "pubsub" {
  project = var.project_id
  service = "pubsub.googleapis.com"

  disable_on_destroy = false
}

resource "google_pubsub_topic" "call_completed" {
  name    = var.topic_name
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_subscription" "summarize_worker" {
  name  = var.subscription_name
  topic = google_pubsub_topic.call_completed.name

  ack_deadline_seconds = 600

  depends_on = [google_pubsub_topic.call_completed]
}

resource "google_pubsub_subscription_iam_member" "worker_subscriber" {
  subscription = google_pubsub_subscription.summarize_worker.id
  role           = "roles/pubsub.subscriber"
  member         = "serviceAccount:${var.cloud_run_service_account}"
}
