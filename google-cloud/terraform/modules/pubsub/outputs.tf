output "call_completed_topic_name" {
  value = google_pubsub_topic.call_completed.name
}

output "summarize_subscription_id" {
  value = google_pubsub_subscription.summarize_worker.id
}
