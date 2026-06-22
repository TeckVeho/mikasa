output "env_iam_custom_roles_enabled" {
  description = "Whether env-scoped custom IAM roles are created for this stack."
  value       = var.enable_env_iam_custom_roles
}

output "env_iam_custom_roles" {
  description = <<-EOT
    Custom roles created for this env_suffix. Bind via env_iam_principals or project_iam_members.
    Full deployer/readonly access requires BOTH scoped + global roles for the same user.
  EOT
  value = {
    for key, role in google_project_iam_custom_role.env : key => {
      role_id            = role.role_id
      name               = role.name
      title              = role.title
      binding_condition  = local.active_env_iam_custom_role_definitions[key].binding_condition
      permission_count   = length(local.env_custom_role_permissions[key])
    }
  }
}

output "iam_env_scope_condition" {
  description = "IAM Condition expression applied to scoped custom-role bindings for this env."
  value       = var.enable_env_iam_custom_roles ? local.iam_env_scope_condition : null
}
