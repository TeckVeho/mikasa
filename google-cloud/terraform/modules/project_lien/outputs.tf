output "enabled" {
  description = "Whether delete protection is active."
  value       = var.enable
}

output "lien_name" {
  description = "Resource Manager lien name; null when enable is false."
  value       = var.enable ? google_resource_manager_lien.this[0].name : null
}

output "lien_parent" {
  description = "Lien parent resource; null when enable is false."
  value       = var.enable ? google_resource_manager_lien.this[0].parent : null
}
