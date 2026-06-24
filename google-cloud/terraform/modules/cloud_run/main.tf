# API / web env: URL overrides only from custom-domain strings (never from Cloud Run *.uri here — avoids Terraform cycles with env on the same services).
locals {
  # Merged after var.env_vars / var.web_env_vars so custom domains align app URLs with mappings.
  public_url_env_api = merge(
    trimspace(var.api_custom_domain) != "" ? {
      API_URL = "https://${local.api_custom_domain_fqdn}"
    } : {},
    var.enable_web && trimspace(var.web_custom_domain) != "" ? {
      FRONTEND_URL = "https://${local.web_custom_domain_fqdn}"
      CORS_ORIGIN  = "https://${local.web_custom_domain_fqdn}"
    } : {},
  )

  public_url_env_web = var.enable_web ? merge(
    trimspace(var.web_custom_domain) != "" ? {
      NEXT_PUBLIC_BASE_URL = "https://${local.web_custom_domain_fqdn}/"
    } : {},
    trimspace(var.api_custom_domain) != "" ? {
      NEXT_PUBLIC_API_URL = "https://${local.api_custom_domain_fqdn}/api/v1"
    } : {},
  ) : {}

  api_container_env = merge(
    var.enable_gcs ? {
      GCS_BUCKET      = var.gcs_uploads_bucket_name
      GCS_BUCKET_NAME = var.gcs_uploads_bucket_name
      GCP_PROJECT_ID  = var.project_id
    } : {},
    var.pubsub_topic_call_completed != "" ? {
      GOOGLE_CLOUD_PROJECT        = var.project_id
      PUBSUB_TOPIC_CALL_COMPLETED = var.pubsub_topic_call_completed
    } : {},
    var.redis_host != "" ? {
      REDIS_HOST = var.redis_host
      REDIS_PORT = var.redis_port
      REDIS_URL  = "redis://${var.redis_host}:${var.redis_port}"
    } : {},
    var.enable_vertex_ai ? {
      VERTEX_AI          = "true"
      VERTEX_AI_LOCATION = var.vertex_ai_location != "" ? var.vertex_ai_location : var.region
      GCP_PROJECT_ID     = var.project_id
    } : {},
    merge(var.env_vars, local.public_url_env_api),
    var.enable_cron_cloud_scheduler ? {
      DISABLE_IN_PROCESS_CRON        = "1"
      CRON_SCHEDULER_SERVICE_ACCOUNT = var.cron_scheduler_service_account_email
    } : {},
  )

  web_container_env = merge(var.web_env_vars, local.public_url_env_web)
}

# APIs required for Artifact Registry + Cloud Run
resource "google_project_service" "run" {
  service = "run.googleapis.com"
  # Single-project, many-env: destroying one env must not disable the API for others.
  disable_on_destroy = false
}

# Also required for Cloud Functions Gen2 (sql_schedule.tf) when images are stored in this project's Artifact Registry.
resource "google_cloud_run_v2_service" "api" {
  name     = var.cloud_run_service_name
  location = var.region

  # depends_on must be a static list (no concat/conditionals). SQL ordering uses
  # implicit deps: template refs instance + secret; annotations tie secret_version + IAM.
  depends_on = [
    google_project_service.run,
  ]

  template {
    service_account = var.runtime_service_account_email != "" ? var.runtime_service_account_email : null

    scaling {
      min_instance_count = var.cloud_run_api_min_instances_effective
      max_instance_count = var.cloud_run_api_max_instances_effective
    }

    max_instance_request_concurrency = var.cloud_run_api_concurrency_effective
    timeout                          = var.cloud_run_api_timeout_effective

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
      image = var.container_image

      resources {
        limits = {
          cpu    = var.cloud_run_api_cpu_effective
          memory = var.cloud_run_api_memory_effective
        }
        cpu_idle = true
      }

      ports {
        container_port = var.container_port
      }

      dynamic "volume_mounts" {
        for_each = var.enable_cloud_sql ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      dynamic "env" {
        for_each = local.api_container_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.api_secret_env_from_sm
        content {
          name = env.value.env_name
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = env.value.version
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

  ingress = var.cloud_run_ingress

  lifecycle {
    ignore_changes = [client, client_version]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  name     = google_cloud_run_v2_service.api.name
  location = google_cloud_run_v2_service.api.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "web" {
  count = var.enable_web ? 1 : 0

  name     = var.web_cloud_run_service_name
  location = var.region

  depends_on = [
    google_project_service.run,
  ]

  template {
    service_account = var.runtime_service_account_email != "" ? var.runtime_service_account_email : null

    scaling {
      min_instance_count = var.cloud_run_web_min_instances_effective
      max_instance_count = var.cloud_run_web_max_instances_effective
    }

    max_instance_request_concurrency = var.cloud_run_web_concurrency_effective
    timeout                          = var.cloud_run_web_timeout_effective

    containers {
      image = var.web_container_image

      resources {
        limits = {
          cpu    = var.cloud_run_web_cpu_effective
          memory = var.cloud_run_web_memory_effective
        }
        cpu_idle = true
      }

      ports {
        container_port = var.web_container_port
      }

      dynamic "env" {
        for_each = local.web_container_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.web_secret_env_from_sm
        content {
          name = env.value.env_name
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = env.value.version
            }
          }
        }
      }
    }
  }

  ingress = var.web_cloud_run_ingress

  lifecycle {
    ignore_changes = [client, client_version]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker_web" {
  count = var.enable_web && var.allow_unauthenticated_web ? 1 : 0

  name     = google_cloud_run_v2_service.web[0].name
  location = google_cloud_run_v2_service.web[0].location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

check "web_image_when_enabled" {
  assert {
    condition     = !var.enable_web || var.web_container_image != ""
    error_message = "When enable_web is true, set web_container_image to a pushed kumu-web image (e.g. .../kumu-web:dev)."
  }
}

check "cron_scheduler_service_account_when_enabled" {
  assert {
    condition     = !var.enable_cron_cloud_scheduler || var.cron_scheduler_service_account_email != ""
    error_message = "When enable_cron_cloud_scheduler is true, set cron_scheduler_service_account_email."
  }
}

check "no_duplicate_database_url_env" {
  assert {
    condition     = !var.enable_cloud_sql || !contains(keys(local.api_container_env), "DATABASE_URL")
    error_message = "Remove DATABASE_URL from env_vars when enable_cloud_sql is true; it is injected from Secret Manager."
  }
}

check "network_remote_state_when_cloud_sql" {
  assert {
    condition     = !var.enable_cloud_sql || (var.network_remote_state_bucket != "" && var.network_remote_state_prefix != "")
    error_message = "When enable_cloud_sql is true, set network_remote_state_bucket and network_remote_state_prefix. Apply google-cloud/terraform/environments/<env>/network first."
  }
}

check "api_env_no_overlap_with_sm_secrets" {
  assert {
    condition = length(setintersection(
      toset(keys(var.env_vars)),
      toset([for s in var.api_secret_env_from_sm : s.env_name])
    )) == 0
    error_message = "env_vars must not define the same keys as api_secret_env_from_sm env_name values."
  }
}

check "web_env_no_overlap_with_sm_secrets" {
  assert {
    condition = !var.enable_web || length(setintersection(
      toset(keys(var.web_env_vars)),
      toset([for s in var.web_secret_env_from_sm : s.env_name])
    )) == 0
    error_message = "web_env_vars must not define the same keys as web_secret_env_from_sm env_name values."
  }
}
