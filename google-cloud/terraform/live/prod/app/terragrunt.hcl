include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${get_terragrunt_dir()}/../../..//environments/_shared/app"

  extra_arguments "env_tfvars" {
    commands = get_terraform_commands_that_need_vars()
    optional_var_files = [
      "${get_terragrunt_dir()}/../../../environments/prod/app/terraform.tfvars",
    ]
  }
}

dependencies {
  paths = ["../network"]
}

remote_state {
  backend = "gcs"
  config = {
    bucket = "mikasa-load-management-terraform-state"
    prefix = "app/prod"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}
