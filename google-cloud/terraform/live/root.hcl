locals {
  # live/{env}/network|app → dev | stg | prod (bootstrap omitted)
  live_child = basename(dirname(get_terragrunt_dir()))
  env_suffix   = contains(["dev", "stg", "prod"], local.live_child) ? local.live_child : null
  region       = get_env("GCP_REGION", "asia-northeast1")
}

inputs = merge(
  { region = local.region },
  local.env_suffix != null ? { env_suffix = local.env_suffix } : {}
)

terraform {
  extra_arguments "lock_timeout" {
    commands  = get_terraform_commands_that_need_locking()
    arguments = ["-lock-timeout=20m"]
  }
}
