# Project custom IAM roles for single-project multi-env (dev | stg | prod).
# Bind users via env_iam_principals or project_iam_members (scoped roles auto-receive IAM Conditions).

locals {
  env_iam_custom_role_catalog = {
    dev = {
      deployer_scoped = {
        role_id      = "kumuDevDeployer"
        title        = "Kumu Dev Deployer"
        description  = "Dev deploy access (Cloud Run, SQL, secrets, GCS, Cloud Build) scoped to *-dev resources."
        source_roles = [
          "roles/run.developer",
          "roles/cloudsql.client",
          "roles/secretmanager.secretAccessor",
          "roles/storage.objectAdmin",
          "roles/cloudbuild.builds.editor",
        ]
        binding_condition = {
          title      = "kumu-dev-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      deployer_global = {
        role_id      = "kumuDevDeployerGlobal"
        title        = "Kumu Dev Deployer Global Read"
        description  = "Artifact Registry + Logging read (no IAM condition support — project-wide, mirrors group binding)."
        source_roles = [
          "roles/artifactregistry.reader",
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
      readonly_scoped = {
        role_id      = "kumuDevReadonly"
        title        = "Kumu Dev Readonly"
        description  = "Dev read access (Cloud Run, Cloud SQL) scoped to *-dev resources."
        source_roles = [
          "roles/run.viewer",
          "roles/cloudsql.viewer",
        ]
        binding_condition = {
          title      = "kumu-dev-read-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      readonly_global = {
        role_id      = "kumuDevReadonlyGlobal"
        title        = "Kumu Dev Readonly Global Read"
        description  = "Artifact Registry + Logging read (project-wide)."
        source_roles = [
          "roles/artifactregistry.reader",
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
    }
    stg = {
      deployer_scoped = {
        role_id      = "kumuStgDeployer"
        title        = "Kumu Stg Deployer"
        description  = "Stg deploy access (Cloud Run, SQL, secrets) scoped to *-stg resources."
        source_roles = [
          "roles/run.developer",
          "roles/cloudsql.client",
          "roles/secretmanager.secretAccessor",
        ]
        binding_condition = {
          title      = "kumu-stg-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      deployer_global = {
        role_id      = "kumuStgDeployerGlobal"
        title        = "Kumu Stg Deployer Global Read"
        description  = "Artifact Registry + Logging read (project-wide)."
        source_roles = [
          "roles/artifactregistry.reader",
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
      readonly_scoped = {
        role_id      = "kumuStgReadonly"
        title        = "Kumu Stg Readonly"
        description  = "Stg Cloud Run read scoped to *-stg resources."
        source_roles = [
          "roles/run.viewer",
        ]
        binding_condition = {
          title      = "kumu-stg-read-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      readonly_global = {
        role_id      = "kumuStgReadonlyGlobal"
        title        = "Kumu Stg Readonly Global Read"
        description  = "Logging read (project-wide)."
        source_roles = [
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
    }
    prod = {
      deployer_scoped = {
        role_id      = "kumuProdDeployer"
        title        = "Kumu Prod Deployer"
        description  = "Prod deploy access (Cloud Run, SQL, secrets) scoped to *-prod. Role only — bind via PAM/break-glass, not permanent IAM."
        source_roles = [
          "roles/run.developer",
          "roles/cloudsql.client",
          "roles/secretmanager.secretAccessor",
        ]
        binding_condition = {
          title      = "kumu-prod-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      deployer_global = {
        role_id      = "kumuProdDeployerGlobal"
        title        = "Kumu Prod Deployer Global Read"
        description  = "Artifact Registry + Logging read (project-wide). Pair with kumuProdDeployer for temporary write access."
        source_roles = [
          "roles/artifactregistry.reader",
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
      readonly_scoped = {
        role_id      = "kumuProdReadonly"
        title        = "Kumu Prod Readonly"
        description  = "Prod read access (Cloud Run, Cloud SQL) scoped to *-prod resources. Write via PAM only."
        source_roles = [
          "roles/run.viewer",
          "roles/cloudsql.viewer",
        ]
        binding_condition = {
          title      = "kumu-prod-read-scoped"
          expression = local.iam_env_scope_condition
        }
      }
      readonly_global = {
        role_id      = "kumuProdReadonlyGlobal"
        title        = "Kumu Prod Readonly Global Read"
        description  = "Monitoring + Logging read (project-wide)."
        source_roles = [
          "roles/monitoring.viewer",
          "roles/logging.viewer",
        ]
        binding_condition = {
          title      = null
          expression = null
        }
      }
    }
  }

  active_env_iam_custom_role_definitions = {
    for key, def in local.env_iam_custom_role_catalog[var.env_suffix] :
    key => def
    if var.enable_env_iam_custom_roles
  }

  env_custom_role_source_role_names = distinct(flatten([
    for def in local.active_env_iam_custom_role_definitions : def.source_roles
  ]))
}

data "google_iam_role" "env_custom_role_source" {
  for_each = toset(local.env_custom_role_source_role_names)

  name = each.value
}

# Project-level custom roles cannot include every permission from predefined roles
# (e.g. resourcemanager.projects.list is org-level only).
data "google_iam_testable_permissions" "project" {
  count = var.enable_env_iam_custom_roles ? 1 : 0

  full_resource_name = "//cloudresourcemanager.googleapis.com/projects/${var.project_id}"
}

locals {
  env_custom_role_testable_permission_names = var.enable_env_iam_custom_roles ? toset([
    for p in data.google_iam_testable_permissions.project[0].permissions :
    p.name
    if try(p.custom_roles_support_level, "SUPPORTED") != "NOT_SUPPORTED"
  ]) : toset([])

  # Still reported as testable for projects but rejected on role create (GCP API quirk).
  env_custom_role_permission_denylist = toset([
    "resourcemanager.projects.list",
  ])

  env_custom_role_permissions_raw = {
    for key, def in local.active_env_iam_custom_role_definitions : key => distinct(flatten([
      for role in def.source_roles : data.google_iam_role.env_custom_role_source[role].included_permissions
    ]))
  }

  env_custom_role_permissions_filtered = {
    for key, perms in local.env_custom_role_permissions_raw : key => sort([
      for perm in perms : perm
      if contains(local.env_custom_role_testable_permission_names, perm)
      && !contains(local.env_custom_role_permission_denylist, perm)
    ])
  }

  env_custom_role_permissions = {
    for key, perms in local.env_custom_role_permissions_filtered : key => slice(
      perms,
      0,
      min(300, length(perms))
    )
  }
}

resource "google_project_iam_custom_role" "env" {
  for_each = local.active_env_iam_custom_role_definitions

  project     = var.project_id
  role_id     = each.value.role_id
  title       = each.value.title
  description = each.value.description
  permissions = local.env_custom_role_permissions[each.key]
}
