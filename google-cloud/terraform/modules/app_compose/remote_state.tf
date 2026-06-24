data "terraform_remote_state" "network" {
  count   = local.network_stack_required ? 1 : 0
  backend = "gcs"
  config = {
    bucket = var.network_remote_state_bucket
    prefix = var.network_remote_state_prefix
  }
}
