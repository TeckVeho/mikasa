# LogiVoice always creates env-scoped custom IAM roles (dev/stg/prod deployer + readonly).
locals {
  enable_env_iam_custom_roles = true
}
