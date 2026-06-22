include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${get_terragrunt_dir()}/../../../../..//google-cloud/terraform/environments/_shared/network"

  extra_arguments "env_tfvars" {
    commands = get_terraform_commands_that_need_vars()
    optional_var_files = [
      "${get_terragrunt_dir()}/../../../environments/dev/network/terraform.tfvars",
    ]
  }
}

remote_state {
  backend = "gcs"
  config = {
    bucket = "veho-kumu-terraform-state"
    prefix = "network/dev"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}
