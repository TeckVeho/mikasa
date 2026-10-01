# Secret Manager app bundle mounted as a file (issue #28 — org SM cost optimization).

locals {
  app_secrets_bundle_enabled = trimspace(var.app_secrets_bundle_secret_id) != ""
  app_secrets_full_path      = "${trimspace(var.app_secrets_mount_path)}/${trimspace(var.app_secrets_file_name)}"
}
