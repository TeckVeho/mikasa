data "google_project" "current" {
  project_id = var.project_id
}

locals {
  # Default Cloud Run runtime SA (same project)
  cloud_run_service_account = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  # VPC + network stack (remote state) when Cloud SQL private IP and/or Memorystore Redis
  network_stack_required = var.enable_cloud_sql || var.enable_memorystore_redis
}
