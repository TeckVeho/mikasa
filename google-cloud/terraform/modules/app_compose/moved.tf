# count[0] → single resource (create_runtime_service_account always on).
moved {
  from = google_project_service.iam[0]
  to   = google_project_service.iam
}

moved {
  from = google_service_account.runtime[0]
  to   = google_service_account.runtime
}

moved {
  from = google_project_iam_member.runtime_log_writer[0]
  to   = google_project_iam_member.runtime_log_writer
}

moved {
  from = google_project_iam_member.runtime_metric_writer[0]
  to   = google_project_iam_member.runtime_metric_writer
}
