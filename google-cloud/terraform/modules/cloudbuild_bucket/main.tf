# Default Cloud Build staging bucket: gs://{project_id}_cloudbuild
# Created by GCP on first gcloud builds submit; not auto-cleaned without lifecycle rules.

locals {
  cloudbuild_staging_bucket_name = "${var.project_id}_cloudbuild"
}

resource "google_storage_bucket" "cloudbuild_staging" {
  name                        = local.cloudbuild_staging_bucket_name
  location                    = "US"
  storage_class               = "STANDARD"
  force_destroy               = false
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age            = 7
      matches_prefix = ["source/"]
      with_state     = "ANY"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle {
    ignore_changes = [
      autoclass,
      cors,
      custom_placement_config,
      default_event_based_hold,
      enable_object_retention,
      encryption,
      labels,
      logging,
      project,
      public_access_prevention,
      requester_pays,
      retention_policy,
      rpo,
      soft_delete_policy,
      uniform_bucket_level_access,
      versioning,
      website,
    ]
  }
}
