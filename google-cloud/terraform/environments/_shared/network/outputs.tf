output "network_id" {
  description = "VPC network id (for references)."
  value       = module.network.network_id
}

output "network_self_link" {
  description = "VPC self link — use as Cloud SQL private_network."
  value       = module.network.network_self_link
}

output "connector_subnet_name" {
  description = "Subnet used by Direct VPC egress in the app stack."
  value       = module.network.connector_subnet_name
}

output "connector_subnet_region" {
  description = "Region of the connector subnet (same as var.region)."
  value       = module.network.connector_subnet_region
}

output "private_vpc_connection_id" {
  description = "Service Networking connection id (Private Service Access)."
  value       = module.network.private_vpc_connection_id
}
