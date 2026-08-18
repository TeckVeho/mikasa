data "terraform_remote_state" "network" {
  count   = local.network_stack_required ? 1 : 0
  backend = "gcs"
  config = {
    bucket = var.network_remote_state_bucket
    prefix = var.network_remote_state_prefix
  }
}

locals {
  cloud_sql_vpc_network_effective = !var.enable_cloud_sql ? "" : (
    trimspace(var.cloud_sql_vpc_network) != "" ? var.cloud_sql_vpc_network : data.terraform_remote_state.network[0].outputs.network_id
  )
  cloud_sql_vpc_subnet_effective = !var.enable_cloud_sql ? "" : (
    trimspace(var.cloud_sql_vpc_subnet) != "" ? var.cloud_sql_vpc_subnet : data.terraform_remote_state.network[0].outputs.connector_subnet_name
  )
}

check "external_cloud_sql_requires_hub_vpc" {
  assert {
    condition = !var.enable_cloud_sql || var.cloud_sql_source != "external" || (
      trimspace(var.cloud_sql_vpc_network) != "" && trimspace(var.cloud_sql_vpc_subnet) != ""
    )
    error_message = "cloud_sql_vpc_network and cloud_sql_vpc_subnet are required when cloud_sql_source = external (Dev SQL hub VPC)."
  }
}
