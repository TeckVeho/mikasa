include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${get_terragrunt_dir()}/../../..//environments/_shared/network"

  extra_arguments "env_tfvars" {
    commands = get_terraform_commands_that_need_vars()
    optional_var_files = [
      "${get_terragrunt_dir()}/../../../environments/stg/network/terraform.tfvars",
    ]
  }
}

remote_state {
  backend = "gcs"
  config = {
    bucket = "dx-logivoice-terraform-state"
    prefix = "network/stg"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}
