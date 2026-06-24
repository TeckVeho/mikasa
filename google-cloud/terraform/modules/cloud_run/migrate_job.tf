# One-off Prisma migrations: same image + DATABASE_URL secret + Cloud SQL volume + Direct VPC as API.
#
# After terraform apply and a new API image push (so prisma CLI is in the image):
#   export REGION=... MIGRATE_JOB_NAME=$(terraform output -raw cloud_run_migrate_job_name)  # optional overrides
#   bash google-cloud/scripts/run-migrate-job.sh   # PROJECT_ID defaults to gcloud active project
# Or: gcloud run jobs execute "$MIGRATE_JOB_NAME" --region="$REGION" --wait
#
# Manual equivalent (no Terraform): use the same Direct VPC + private-ranges egress model as Terraform
# (see google_cloud_run_v2_job below). Example shape:
#   gcloud run jobs create ... --vpc-network=NETWORK --vpc-subnet=SUBNET --vpc-egress=private-ranges-only \
#     --set-cloudsql-instances=CLOUDSQL_INSTANCE --set-secrets=DATABASE_URL=SECRET:latest \
#     --command=sh --args=scripts/prisma-migrate-deploy.sh --working-directory=/app

locals {
  name_prefix                = replace(var.project_id, "_", "-")
  migrate_job_name_effective = var.cloud_run_migrate_job_name != "" ? var.cloud_run_migrate_job_name : substr(
    "${local.name_prefix}-migrate-${var.env_suffix}",
    0,
    63,
  )
}

resource "google_cloud_run_v2_job" "migrate" {
  count = var.enable_cloud_sql ? 1 : 0

  name     = local.migrate_job_name_effective
  location = var.region

  template {
    parallelism = 1
    task_count  = 1

    template {
      timeout         = "600s"
      max_retries     = 1
      service_account = var.runtime_service_account_email != "" ? var.runtime_service_account_email : null

      vpc_access {
        network_interfaces {
          network    = var.network_id
          subnetwork = var.connector_subnet_name
        }
        egress = "PRIVATE_RANGES_ONLY"
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [var.cloud_sql_connection_name]
        }
      }

      containers {
        image       = var.container_image
        working_dir = "/app"
        command     = ["sh"]
        args        = ["scripts/prisma-migrate-deploy.sh"]

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
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

  lifecycle {
    ignore_changes = [client, client_version]
  }
}
