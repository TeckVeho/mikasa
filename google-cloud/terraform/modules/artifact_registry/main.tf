resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "docker" {
  location               = var.region
  repository_id          = var.artifact_repo_id
  description            = "Kumu Docker images (dev/stg/prod tags in single project)"
  format                 = "DOCKER"
  cleanup_policy_dry_run = false

  dynamic "cleanup_policies" {
    for_each = length(var.artifact_cleanup_keep_tag_prefixes) > 0 ? [1] : []
    content {
      id     = "keep-tagged-prefixes"
      action = "KEEP"
      condition {
        tag_state    = "TAGGED"
        tag_prefixes = var.artifact_cleanup_keep_tag_prefixes
      }
    }
  }

  cleanup_policies {
    id     = "keep-most-recent-per-package"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.artifact_cleanup_keep_count
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "${var.artifact_cleanup_delete_untagged_after_days * 86400}s"
    }
  }

  cleanup_policies {
    id     = "delete-unmatched"
    action = "DELETE"
    condition {
      tag_state = "ANY"
    }
  }

  depends_on = [
    google_project_service.artifactregistry,
  ]
}

data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_service" "compute" {
  count              = var.grant_default_compute_reader ? 1 : 0
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository_iam_member" "default_compute_reader" {
  count = var.grant_default_compute_reader ? 1 : 0

  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"

  depends_on = [google_project_service.compute]
}

resource "google_artifact_registry_repository_iam_member" "additional_readers" {
  for_each = toset(var.additional_artifact_registry_reader_members)

  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.repository_id
  role       = "roles/artifactregistry.reader"
  member     = each.value
}

resource "google_artifact_registry_repository_iam_member" "additional_writers" {
  for_each = toset(var.additional_artifact_registry_writer_members)

  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.repository_id
  role       = "roles/artifactregistry.writer"
  member     = each.value
}
