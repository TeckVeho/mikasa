# app_compose

Composition module for the Kumu **app** stack: wires `iam`, `gcs`, `cloud_sql`, `secrets`, `cloud_run`, `app_cron`, `sql_schedule`, tier specs, network remote state, and disabled scaffold modules (`armor`, `dns`, `lb`, `monitoring`).

Environment roots (`environments/<env>/app/`) only provide backend, providers, `variables.tf` (for `terraform.tfvars`), `main.tf` (single `module "app_compose"`), `moved.tf`, and optional `outputs.tf` re-exports.

## Layout

| File | Role |
|------|------|
| `stack.tf` | Submodule calls and wiring |
| `tier_specs.tf` | Wiki-aligned sizing via external `tier_specs` module |
| `data.tf` | Project data + Cloud Run default SA local |
| `project_services.tf` | Shared `cloudscheduler` / `artifactregistry` APIs |
| `remote_state.tf` | Network stack remote state (when Cloud SQL enabled) |
| `variables.tf` | Full interface (same names as env root) |
| `outputs.tf` | Re-exports for CI / scripts |

## DRY conventions

- **Single variable interface:** [`variables.tf`](variables.tf) (66 inputs). Environment roots symlink to this file so `terraform.tfvars` binds once.
- **Slim child modules:** `iam`, `gcs`, `cloud_sql`, etc. only declare variables they read in `main.tf`; wiring-only inputs stay in `wiring_variables.tf`.
- **Manual stack wiring:** keep [`stack.tf`](stack.tf) as the single passthrough/wiring file for child modules.

## State addresses

After migration, resources live under `module.app_compose.module.<child>.…` (and root-level resources under `module.app_compose.*`). Use `moved` blocks in the environment `moved.tf` when refactoring from a flat env root.
