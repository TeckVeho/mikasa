module "network" {
  source = "../../../modules/network"

  project_id                            = var.project_id
  region                                = var.region
  env_suffix                            = var.env_suffix
  network_name                          = var.network_name
  connector_subnet_cidr                 = var.connector_subnet_cidr
  private_service_peering_cidr          = var.private_service_peering_cidr
  private_service_peering_prefix_length = var.private_service_peering_prefix_length
}
