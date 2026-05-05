# Rename to backend.tf after the state bucket exists (see ../bootstrap/).
terraform {
  backend "gcs" {
    bucket = "dx-logivoice-common-terraform-state"
    prefix = "common/main"
  }
}
