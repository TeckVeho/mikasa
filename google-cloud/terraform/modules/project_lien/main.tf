# Resource Manager lien — blocks project deletion via Console, gcloud, API, and Terraform.

resource "google_resource_manager_lien" "this" {
  count = var.enable ? 1 : 0

  parent       = "projects/${var.project_id}"
  restrictions = var.restrictions
  origin       = var.origin
  reason       = var.reason
}
