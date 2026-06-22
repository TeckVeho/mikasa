# Bind env_iam_principals to scoped/global custom roles (conditions applied automatically).

resource "google_project_iam_member" "env_principal" {
  for_each = local.env_iam_principal_bindings

  project = var.project_id
  role    = each.value.role
  member  = each.value.member

  dynamic "condition" {
    for_each = each.value.condition != null ? [each.value.condition] : []
    content {
      title       = condition.value.title
      expression  = condition.value.expression
      description = try(condition.value.description, null)
    }
  }
}
