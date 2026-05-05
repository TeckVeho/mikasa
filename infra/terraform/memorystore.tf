resource "google_project_service" "redis" {
  count   = var.enable_memorystore_redis ? 1 : 0
  project = var.project_id
  service = "redis.googleapis.com"
}

resource "google_redis_instance" "main" {
  count = var.enable_memorystore_redis ? 1 : 0

  name           = "logivoice-redis-${var.env_suffix}"
  tier           = "BASIC"
  memory_size_gb = var.redis_memory_size_gb
  region         = var.region
  redis_version  = var.redis_version

  authorized_network = data.terraform_remote_state.network[0].outputs.network_self_link

  depends_on = [
    google_project_service.redis,
  ]

  lifecycle {
    prevent_destroy = false
  }
}
