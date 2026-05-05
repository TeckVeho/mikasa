# One-off Prisma migrations: same image + DATABASE_URL secret + Cloud SQL volume + Direct VPC as API.
#
# After terraform apply and a new API image push (so prisma CLI is in the image):
#   export REGION=... MIGRATE_JOB_NAME=$(terraform output -raw cloud_run_migrate_job_name)  # optional overrides
#   ./scripts/gcp/run-migrate-job.sh   # PROJECT_ID defaults to gcloud active project
# Or: gcloud run jobs execute "$MIGRATE_JOB_NAME" --region="$REGION" --wait
#
# Manual equivalent (no Terraform): use the same Direct VPC + private-ranges egress model as Terraform
# (see google_cloud_run_v2_job below). Example shape:
#   gcloud run jobs create ... --vpc-network=NETWORK --vpc-subnet=SUBNET --vpc-egress=private-ranges-only \
#     --set-cloudsql-instances=CLOUDSQL_INSTANCE --set-secrets=DATABASE_URL=SECRET:latest \
#     --command=npx --args=prisma,migrate,deploy --working-directory=/app/apps/api

locals {
  migrate_job_name_effective = var.cloud_run_migrate_job_name != "" ? var.cloud_run_migrate_job_name : "logivoice-migrate-${var.env_suffix}"
}

resource "google_cloud_run_v2_job" "migrate" {
  count = var.enable_cloud_sql ? 1 : 0

  name     = local.migrate_job_name_effective
  location = var.region

  template {
    parallelism = 1
    task_count  = 1

    template {
      timeout     = "600s"
      max_retries = 1

      vpc_access {
        network_interfaces {
          network    = data.terraform_remote_state.network[0].outputs.network_id
          subnetwork = data.terraform_remote_state.network[0].outputs.connector_subnet_name
        }
        egress = "PRIVATE_RANGES_ONLY"
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.main[0].connection_name]
        }
      }

      containers {
        image       = var.container_image
        working_dir = "/app/apps/api"
        command     = ["npx"]
        args        = ["prisma", "migrate", "deploy"]

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }

        env {
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
}
