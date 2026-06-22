# Generated for layout migration — safe to keep after apply.

moved {
  from = google_compute_global_address.private_service_range
  to   = module.network.google_compute_global_address.private_service_range
}

moved {
  from = google_compute_network.vpc
  to   = module.network.google_compute_network.vpc
}

moved {
  from = google_compute_subnetwork.connector
  to   = module.network.google_compute_subnetwork.connector
}

moved {
  from = google_project_service.compute
  to   = module.network.google_project_service.compute
}

moved {
  from = google_project_service.servicenetworking
  to   = module.network.google_project_service.servicenetworking
}

moved {
  from = google_service_networking_connection.private_vpc_connection
  to   = module.network.google_service_networking_connection.private_vpc_connection
}
