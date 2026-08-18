# Dev log — Issue #24

**Issue:** https://github.com/TeckVeho/mikasa/issues/24

## Wave 0 — Dump

| Step | Status |
|------|--------|
| Export `mikasa-load-management-mysql-dev` / DB `mikasa-load-management-mysql-dev` | ✅ `backups/issue-24-20260818/mikasa-dev.sql` (~37 KB) |
| GCS | ✅ `gs://mikasa-load-management-sql-migrate/issue-24/mikasa-dev.sql` (stripped header) |

## Wave 1 — Hub DB + IAM

| Item | Value |
|------|-------|
| Hub DB | `mikasa_load_management_dev` on `dev-sql-hub` |
| Hub user | `mikasa` |
| Runtime SA | `mikasa-load-management-run-dev@mikasa-load-management.iam.gserviceaccount.com` |
| Hub `cloudsql.client` | ✅ (pre-existing) |

## Wave 2 — Cutover

| Step | Status |
|------|--------|
| Import dump → `mikasa_load_management_dev` | ✅ |
| Secret `mikasa-load-management-database-url-dev` v2 | ✅ hub socket URL |
| `mikasa-load-management-api-dev` hub VPC + connection | ✅ rev `00010-xdl` |
| `mikasa-load-management-migrate-dev` hub VPC + connection | ✅ |
| SQL schedule jobs paused | ✅ |
| Domain smoke 4/4 | ✅ **200** |

## Wave 3 — Terraform external mode

| Step | Status |
|------|--------|
| `terragrunt plan` | ✅ destroys managed SQL + sql schedule; hub connection |
| `terragrunt apply` | ✅ `cloud_sql_connection_name` → hub |
| Post-apply `--no-invoker-iam-check` on API + web | ✅ |
| Legacy `mikasa-load-management-mysql-dev` decommission | ✅ |

**Note:** Terraform destroy blocked on `deletion_protection`; resolved via `state rm` + `issue-24-decommission-dev-sql.sh`.

## Scripts

| Script | Purpose |
|--------|---------|
| `google-cloud/scripts/issue-24-export-sql.sh` | Export dev SQL |
| `google-cloud/scripts/issue-24-hub-cutover.sh` | Import + cutover + domain smoke |
| `google-cloud/scripts/issue-24-decommission-dev-sql.sh` | Delete legacy instance |

## Pitfalls avoided (#119 / #95)

- Stripped `CREATE DATABASE` / `USE` from dump before hub import
- URL-encode password in `DATABASE_URL`
- Paused SQL schedule jobs (must not stop hub instance)
- Hub VPC on Cloud Run (cross-project subnet)
- `disable_on_destroy = false` on sqladmin when external
- Post-apply `--no-invoker-iam-check` for custom domain smoke
