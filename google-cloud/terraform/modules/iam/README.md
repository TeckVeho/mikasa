# iam

Project IAM bindings, optional env custom roles, and project label `tier`.

## Custom roles (`enable_env_iam_custom_roles`)

Creates project-scoped custom roles for env-scoped deployer/readonly access:

| env  | Roles created |
|------|----------------|
| dev  | `kumuDevDeployer`, `kumuDevDeployerGlobal`, `kumuDevReadonly`, `kumuDevReadonlyGlobal` |
| stg  | `kumuStgDeployer`, `kumuStgDeployerGlobal`, `kumuStgReadonly`, `kumuStgReadonlyGlobal` |
| prod | `kumuProdDeployer`, `kumuProdDeployerGlobal`, `kumuProdReadonly`, `kumuProdReadonlyGlobal` |

Scoped vs global split matches IAM Conditions behavior (Artifact Registry / Logging bindings have no condition).

### Binding users (scoped to this env's resources)

**Preferred:** `env_iam_principals` in tfvars — Terraform binds scoped + global role pairs automatically with IAM Conditions:

```hcl
enable_env_iam_custom_roles = true
env_iam_principals = {
  deployers = ["user:dev@example.com"]
  readonly  = ["user:viewer@example.com"]
}
```

**Alternative:** `project_iam_members` — if `condition` is omitted for a scoped custom role, the env IAM condition is applied automatically.

Owner/Editor for break-glass admins are **not** managed here — configure outside Terraform or keep manually on the project.

After apply, see outputs `iam_env_custom_roles` and `iam_env_scope_condition`.

See: `google-cloud/terraform/environments/dev/app/terraform.tfvars.example`
