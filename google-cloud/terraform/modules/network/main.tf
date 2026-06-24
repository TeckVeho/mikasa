# VPC stack: shared VPC for private Cloud SQL + Serverless VPC Access subnet.
# Apply this stack before the app stack when enable_cloud_sql = true.

locals {
  name_prefix = replace(var.project_id, "_", "-")

  # Non-overlapping CIDRs per env in a shared GCP project (override via tfvars if needed).
  env_network_cidrs = {
    dev = {
      connector_subnet = "10.8.0.0/24"
      psa              = "10.247.0.0"
    }
    stg = {
      connector_subnet = "10.9.0.0/24"
      psa              = "10.248.0.0"
    }
    prod = {
      connector_subnet = "10.10.0.0/24"
      psa              = "10.249.0.0"
    }
  }

  network_name_effective                 = var.network_name != "" ? var.network_name : substr("${local.name_prefix}-vpc-${var.env_suffix}", 0, 63)
  connector_subnet_cidr_effective        = var.connector_subnet_cidr != "" ? var.connector_subnet_cidr : local.env_network_cidrs[var.env_suffix].connector_subnet
  private_service_peering_cidr_effective = var.private_service_peering_cidr != "" ? var.private_service_peering_cidr : local.env_network_cidrs[var.env_suffix].psa
  subnet_connector_name                  = substr("${local.name_prefix}-connector-${var.env_suffix}", 0, 63)
  psa_range_name                         = substr("${local.name_prefix}-psa-${var.env_suffix}", 0, 63)
  firewall_deny_name                     = substr("${local.name_prefix}-fw-deny-ingress-${var.env_suffix}", 0, 63)
}

resource "google_project_service" "compute" {
  service = "compute.googleapis.com"
  # Single-project, many-env: destroying one env must not disable the API for others.
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_network" "vpc" {
  name                    = local.network_name_effective
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [
    google_project_service.compute,
  ]
}

resource "google_compute_subnetwork" "connector" {
  name          = local.subnet_connector_name
  ip_cidr_range = local.connector_subnet_cidr_effective
  region        = var.region
  network       = google_compute_network.vpc.id
}


resource "google_compute_global_address" "private_service_range" {
  name          = local.psa_range_name
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = local.private_service_peering_cidr_effective
  prefix_length = var.private_service_peering_prefix_length
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network = google_compute_network.vpc.id
  service = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [
    google_compute_global_address.private_service_range.name,
  ]

  depends_on = [
    google_project_service.servicenetworking,
  ]
}

# Explicit deny-all ingress baseline per env (shared-project hardening + firewall logging).
resource "google_compute_firewall" "deny_all_ingress" {
  count = var.enable_default_deny_ingress ? 1 : 0

  name      = local.firewall_deny_name
  network   = google_compute_network.vpc.name
  direction = "INGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
