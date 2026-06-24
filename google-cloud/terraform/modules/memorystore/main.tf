resource "google_project_service" "redis" {
  project = var.project_id
  service = "redis.googleapis.com"

  disable_on_destroy = false
}

resource "google_redis_instance" "main" {
  name           = var.instance_name
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region
  redis_version  = "REDIS_7_0"

  authorized_network = var.network_self_link

  depends_on = [google_project_service.redis]

  lifecycle {
    prevent_destroy = false
  }
}
