include "root" {
  path = find_in_parent_folders("root.hcl")
}

terraform {
  source = "${get_terragrunt_dir()}/../../../..//google-cloud/terraform/environments/bootstrap"

  extra_arguments "env_tfvars" {
    commands = get_terraform_commands_that_need_vars()
    optional_var_files = [
      "${get_terragrunt_dir()}/../../environments/bootstrap/terraform.tfvars",
    ]
  }
}
