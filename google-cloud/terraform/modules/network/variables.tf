variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  default     = "asia-northeast1"
  description = "Region for regional subnet (VPC connector + Cloud Run / SQL must align). Terragrunt sets from GCP_REGION."
}

variable "env_suffix" {
  type        = string
  default     = "dev"
  description = "Suffix for resource names (dev, stg, prod). Terragrunt sets from live/{env}/ path."

  validation {
    condition     = can(regex("^[a-z0-9-]{1,16}$", var.env_suffix))
    error_message = "env_suffix must be lowercase letters, digits, hyphens, max 16 chars."
  }
}

variable "network_name" {
  type        = string
  default     = ""
  description = "VPC name. If empty, defaults to {project_id}-vpc-{env_suffix} (e.g. veho-kumu-vpc-dev)."
}

variable "connector_subnet_cidr" {
  type        = string
  default     = ""
  description = "Regional subnet for Cloud Run Direct VPC Egress. If empty, derived from env_suffix (dev 10.8.0.0/24, stg 10.9.0.0/24, prod 10.10.0.0/24)."
}

variable "private_service_peering_cidr" {
  type        = string
  default     = ""
  description = "Start of reserved range for Cloud SQL private IP (/16). If empty, derived from env_suffix (dev 10.247.0.0, stg 10.248.0.0, prod 10.249.0.0)."
}

variable "private_service_peering_prefix_length" {
  type        = number
  default     = 16
  description = "Prefix length for the VPC peering range allocated to servicenetworking.googleapis.com."
}

variable "enable_default_deny_ingress" {
  type        = bool
  default     = true
  description = <<-EOT
    Add an explicit low-priority deny-all ingress firewall rule (with logging) on this env's VPC.
    Makes the deny baseline explicit per environment in a shared project and enables firewall logs.
    Functionally equivalent to the implied deny; safe to keep enabled.
  EOT
}
