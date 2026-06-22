# IAM condition expression scoping custom-role bindings to this env's resources in a shared GCP project.

locals {
  iam_env_suffix_condition_parts = [
    "resource.name.endsWith(\"-${var.env_suffix}\")",
    "resource.name.contains(\"-${var.env_suffix}-\")",
  ]

  iam_env_explicit_resource_parts = concat(
    [
      for bucket in distinct(compact(var.env_iam_scoped_resource_names.gcs_buckets)) :
      "resource.name.endsWith(\"/${bucket}\") || resource.name.endsWith(\"/${bucket}/\")"
    ],
    [
      for service in distinct(compact(var.env_iam_scoped_resource_names.cloud_run_services)) :
      "resource.name.endsWith(\"/services/${service}\")"
    ],
    [
      for instance in distinct(compact(var.env_iam_scoped_resource_names.cloud_sql_instances)) :
      "resource.name.endsWith(\"/instances/${instance}\")"
    ],
    [
      for secret_id in distinct(compact(var.env_iam_scoped_resource_names.secret_ids)) :
      "resource.name.endsWith(\"/secrets/${secret_id}\") || resource.name.contains(\"/secrets/${secret_id}/\")"
    ],
  )

  iam_env_scope_condition = join(
    " || ",
    concat(local.iam_env_suffix_condition_parts, local.iam_env_explicit_resource_parts),
  )

  iam_env_scope_binding_condition = {
    title      = "kumu-${var.env_suffix}-scoped"
    expression = local.iam_env_scope_condition
  }

  scoped_env_custom_role_ids = {
    for key, def in local.active_env_iam_custom_role_definitions :
    key => def.role_id
    if def.binding_condition.expression != null
  }

  global_env_custom_role_ids = {
    for key, def in local.active_env_iam_custom_role_definitions :
    key => def.role_id
    if def.binding_condition.expression == null
  }

  scoped_env_custom_role_full_names = {
    for key, role_id in local.scoped_env_custom_role_ids :
    key => "projects/${var.project_id}/roles/${role_id}"
  }

  scoped_role_condition_by_full_name = {
    for key, full_name in local.scoped_env_custom_role_full_names :
    full_name => merge(local.iam_env_scope_binding_condition, {
      title = local.active_env_iam_custom_role_definitions[key].binding_condition.title
    })
  }

  project_iam_members_resolved = {
    for i, m in var.project_iam_members : tostring(i) => merge(m, {
      condition = m.condition != null ? m.condition : lookup(local.scoped_role_condition_by_full_name, m.role, null)
    })
  }

  deployer_principal_bindings = var.enable_env_iam_custom_roles ? flatten([
    for member in distinct(compact(var.env_iam_principals.deployers)) : [
      {
        key       = "deployer-scoped-${replace(replace(member, ":", "-"), "@", "-at-")}"
        member    = member
        role      = local.scoped_env_custom_role_full_names["deployer_scoped"]
        condition = merge(local.iam_env_scope_binding_condition, {
          title = local.active_env_iam_custom_role_definitions["deployer_scoped"].binding_condition.title
        })
      },
      {
        key       = "deployer-global-${replace(replace(member, ":", "-"), "@", "-at-")}"
        member    = member
        role      = "projects/${var.project_id}/roles/${local.global_env_custom_role_ids["deployer_global"]}"
        condition = null
      },
    ]
  ]) : []

  readonly_principal_bindings = var.enable_env_iam_custom_roles ? flatten([
    for member in distinct(compact(var.env_iam_principals.readonly)) : [
      {
        key       = "readonly-scoped-${replace(replace(member, ":", "-"), "@", "-at-")}"
        member    = member
        role      = local.scoped_env_custom_role_full_names["readonly_scoped"]
        condition = merge(local.iam_env_scope_binding_condition, {
          title = local.active_env_iam_custom_role_definitions["readonly_scoped"].binding_condition.title
        })
      },
      {
        key       = "readonly-global-${replace(replace(member, ":", "-"), "@", "-at-")}"
        member    = member
        role      = "projects/${var.project_id}/roles/${local.global_env_custom_role_ids["readonly_global"]}"
        condition = null
      },
    ]
  ]) : []

  env_iam_principal_bindings = {
    for b in concat(local.deployer_principal_bindings, local.readonly_principal_bindings) :
    b.key => b
  }
}
