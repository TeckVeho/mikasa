# Cloud Run worker — Pub/Sub pull consumer for call summarize + email notify.

locals {
  worker_container_env = merge(
    {
      NODE_ENV  = "production"
      LOG_LEVEL = lookup(var.env_vars, "LOG_LEVEL", "info")
    },
    lookup(var.env_vars, "RESEND_FROM_EMAIL", null) != null ? {
      RESEND_FROM_EMAIL = var.env_vars["RESEND_FROM_EMAIL"]
    } : {},
    var.worker_dashboard_url != "" ? {
      DASHBOARD_URL = var.worker_dashboard_url
    } : {},
    {
      GCP_PROJECT_ID                = var.project_id
      GOOGLE_CLOUD_PROJECT          = var.project_id
      PUBSUB_SUBSCRIPTION_SUMMARIZE = var.pubsub_subscription_id
    },
  )
}

resource "google_cloud_run_v2_service" "worker" {
  name     = var.worker_cloud_run_service_name
  location = var.region

  depends_on = [google_project_service.run]

  template {
    service_account = var.runtime_service_account_email != "" ? var.runtime_service_account_email : null

    scaling {
      min_instance_count = var.cloud_run_worker_min_instances_effective
      max_instance_count = var.cloud_run_worker_max_instances_effective
    }

    max_instance_request_concurrency = var.cloud_run_worker_concurrency_effective
    timeout                          = var.cloud_run_worker_timeout_effective

    dynamic "vpc_access" {
      for_each = var.enable_vpc_access ? [1] : []
      content {
        network_interfaces {
          network    = var.network_id
          subnetwork = var.connector_subnet_name
        }
        egress = "PRIVATE_RANGES_ONLY"
      }
    }

    annotations = var.enable_cloud_sql ? {
      "terraform-internal-deps" = "${var.database_url_secret_version_name}|${var.cloudsql_client_iam_member_id}"
    } : {}

    dynamic "volumes" {
      for_each = var.enable_cloud_sql ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [var.cloud_sql_connection_name]
        }
      }
    }

    containers {
      image = var.worker_container_image

      resources {
        limits = {
          cpu    = var.cloud_run_worker_cpu_effective
          memory = var.cloud_run_worker_memory_effective
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
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
              secret  = var.database_url_secret_name
              version = "latest"
            }
          }
        }
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}
