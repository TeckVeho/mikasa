# Cloud Run worker — async jobs, Pub/Sub pull, DB/Redis over same Direct VPC as API.

locals {
  worker_container_env = merge(
    var.worker_env_vars,
    var.enable_memorystore_redis ? {
      REDIS_HOST = google_redis_instance.main[0].host
      REDIS_PORT = tostring(google_redis_instance.main[0].port)
      REDIS_URL  = "redis://${google_redis_instance.main[0].host}:${google_redis_instance.main[0].port}"
    } : {},
    var.enable_pubsub_call_pipeline ? {
      GCP_PROJECT_ID                  = var.project_id
      GOOGLE_CLOUD_PROJECT            = var.project_id
      # Pull subscription consumed by worker (full resource name matches @google-cloud/pubsub.subscription()).
      PUBSUB_SUBSCRIPTION_SUMMARIZE   = google_pubsub_subscription.summarize_worker[0].id
    } : {},
  )
}

resource "google_cloud_run_v2_service" "worker" {
  count = var.enable_worker ? 1 : 0

  name     = var.worker_cloud_run_service_name
  location = var.region

  depends_on = [
    google_project_service.run,
    google_secret_manager_secret_iam_member.cloudrun_secret_accessor,
  ]

  template {
    scaling {
      min_instance_count = local.cloud_run_worker_min_instances_effective
      max_instance_count = local.cloud_run_worker_max_instances_effective
    }

    max_instance_request_concurrency = local.cloud_run_worker_concurrency_effective
    timeout                          = local.cloud_run_worker_timeout_effective

    dynamic "vpc_access" {
      for_each = local.network_stack_required ? [1] : []
      content {
        network_interfaces {
          network    = data.terraform_remote_state.network[0].outputs.network_id
          subnetwork = data.terraform_remote_state.network[0].outputs.connector_subnet_name
        }
        egress = "PRIVATE_RANGES_ONLY"
      }
    }

    annotations = var.enable_cloud_sql ? {
      "terraform-internal-deps" = "${google_secret_manager_secret_version.database_url[0].name}|${try(google_project_iam_member.cloudrun_sql_client[0].id, "")}"
    } : {}

    dynamic "volumes" {
      for_each = var.enable_cloud_sql ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.main[0].connection_name]
        }
      }
    }

    containers {
      image = var.worker_container_image

      resources {
        limits = {
          cpu    = local.cloud_run_worker_cpu_effective
          memory = local.cloud_run_worker_memory_effective
        }
        cpu_idle = true
      }

      ports {
        container_port = var.worker_container_port
      }

      dynamic "volume_mounts" {
        for_each = var.enable_cloud_sql ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      dynamic "env" {
        for_each = local.worker_container_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.worker_secret_env_from_sm
        content {
          name = env.value.env_name
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = coalesce(env.value.version, "latest")
            }
          }
        }
      }

      dynamic "env" {
        for_each = var.enable_cloud_sql ? [1] : []
        content {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url[0].name
              version = "latest"
            }
          }
        }
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker_worker" {
  count = var.enable_worker && var.allow_unauthenticated_worker ? 1 : 0

  name     = google_cloud_run_v2_service.worker[0].name
  location = google_cloud_run_v2_service.worker[0].location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

check "worker_image_when_enabled" {
  assert {
    condition     = !var.enable_worker || var.worker_container_image != ""
    error_message = "When enable_worker is true, set worker_container_image to a pushed logivoice-worker image."
  }
}
