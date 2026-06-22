resource "google_project_service" "storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

module "naming" {
  source = "../../modules/naming"

  project_id = var.project_id
}

resource "google_storage_bucket" "terraform_state" {
  name                        = var.state_bucket_name != "" ? var.state_bucket_name : module.naming.state_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = false
  }

  depends_on = [google_project_service.storage]
}

module "artifact_registry" {
  source = "../../modules/artifact_registry"

  project_id                                  = var.project_id
  region                                      = var.region
  artifact_repo_id                            = var.artifact_repo_id != "" ? var.artifact_repo_id : module.naming.artifact_repo_id
  additional_artifact_registry_reader_members = var.additional_artifact_registry_reader_members
  additional_artifact_registry_writer_members = var.additional_artifact_registry_writer_members
  artifact_cleanup_keep_count                 = var.artifact_cleanup_keep_count
  artifact_cleanup_keep_tag_prefixes          = var.artifact_cleanup_keep_tag_prefixes
  artifact_cleanup_delete_untagged_after_days = var.artifact_cleanup_delete_untagged_after_days
}

module "cloudbuild_bucket" {
  source = "../../modules/cloudbuild_bucket"

  project_id = var.project_id
}
