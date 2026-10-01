# Dev log — Issue #28

**Issue:** https://github.com/TeckVeho/mikasa/issues/28  
**Merge:** PR [#29](https://github.com/TeckVeho/mikasa/pull/29) → `develop` (`1e29189`)

## Code (on develop)

- Terraform: `app_secrets_bundle_secret_id` → Cloud Run volume `/secrets/app.env` + `APP_SECRETS_FILE`
- API: `loadAppSecretsFile()` in `apps/api/src/server.ts`
- Scripts under `google-cloud/scripts/issue-28-*` and `inventory-secret-manager-mikasa.sh`

## Inventory (GCP) — 2026-10-01

| Secret | Replication | ENABLED versions |
|--------|-------------|------------------|
| `mikasa-load-management-database-url-dev` | automatic | **1** (was 2; disabled v2) |
| `mikasa-app-secrets-dev` | user-managed (`asia-northeast1`) | **1** |

Cloud Run `mikasa-load-management-api-dev`: `DATABASE_URL` from SM; `ALLOW_DEV_AUTH=true` (no per-key Firebase SM today).

## Ops done (dev)

- [x] `gcloud auth login`
- [x] Created `mikasa-app-secrets-dev` (placeholder `.env` — add `FIREBASE_*` when turning off dev auth)
- [x] DB secret version cleanup: disabled version `2` on `mikasa-load-management-database-url-dev`
- [x] Pre-cutover smoke: `GET https://mikasa-api.vw-dev.com/health` → **200**

## Rollout dev (remaining)

Add to **local** `google-cloud/terraform/environments/dev/app/terraform.tfvars` (not in git):

```hcl
app_secrets_bundle_secret_id = "mikasa-app-secrets-dev"
api_secret_env_from_sm       = []
```

Then:

```bash
cd google-cloud/terraform/live/dev/app
terragrunt apply
```

Wait for **CD develop** to deploy API image with `loadAppSecretsFile` (merge `1e29189`), then:

```bash
API_URL=https://mikasa-api.vw-dev.com ./google-cloud/scripts/issue-28-smoke.sh
```

**Rollback:** remove `app_secrets_bundle_secret_id`, re-apply Terraform.

## Stg / prod

After dev stable ≥24h — [test.md](./test.md).

## Cleanup (same issue)

No legacy Firebase secrets on project. After bundle cutover verified: keep 1 ENABLED version per secret; optional `issue-28-disable-extra-secret-versions.sh`.
