# Dev log — Issue #28

**Issue:** https://github.com/TeckVeho/mikasa/issues/28  
**Worktree:** `orchestrate-worktrees/mikasa/issues/28` (branch `28-secret-manager-bundle`)

## Code (PR branch)

- Terraform: `app_secrets_bundle_secret_id` → Cloud Run volume `/secrets/app.env` + `APP_SECRETS_FILE`
- API: `loadAppSecretsFile()` in `apps/api/src/server.ts`
- Scripts: `inventory-secret-manager-mikasa.sh`, `create-mikasa-app-secrets-bundle.sh`, `issue-28-smoke.sh`, `issue-28-cleanup-legacy-secrets.sh`
- Dev tfvars example: `mikasa-app-secrets-dev` bundle, `api_secret_env_from_sm = []`

## Inventory (GCP)

Run after `gcloud auth login`:

```bash
./google-cloud/scripts/inventory-secret-manager-mikasa.sh
```

**2026-10-01 (local):** inventory blocked — `gcloud` reauth required (non-interactive). Issue #28 reports ~1 secret resource, 3 ENABLED versions on `mikasa-load-management`.

### Target (per env)

| Secret | Role |
|--------|------|
| `mikasa-load-management-database-url-{env}` | `DATABASE_URL` (Terraform cloud_sql) |
| `mikasa-app-secrets-{env}` | `.env` bundle (`FIREBASE_*`, …) |

## Rollout dev (ops)

1. Build `app.env` from current Firebase secrets (do not commit).
2. `ENV_SUFFIX=dev ./google-cloud/scripts/create-mikasa-app-secrets-bundle.sh ./app.env`
3. Set live `terraform.tfvars`: `app_secrets_bundle_secret_id = "mikasa-app-secrets-dev"`
4. `cd google-cloud/terraform/live/dev/app && terragrunt apply`
5. Deploy API image (CD or manual) so `loadAppSecretsFile` is in the container.
6. `./google-cloud/scripts/issue-28-smoke.sh` with `API_URL` = dev Cloud Run URL.

**Rollback:** clear `app_secrets_bundle_secret_id` in tfvars, restore `api_secret_env_from_sm` legacy entries, re-apply.

## Stg / prod

Repeat after dev stable ≥24h (see [test.md](./test.md)). Use `mikasa-app-secrets-stg` / `mikasa-app-secrets-prod`.

## Cleanup (same issue)

After prod smoke: `DRY_RUN=0 ./google-cloud/scripts/issue-28-cleanup-legacy-secrets.sh` + disable extra ENABLED versions.
