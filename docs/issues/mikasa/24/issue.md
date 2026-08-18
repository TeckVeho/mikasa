# Issue #24 — Dev Cloud SQL → Hub (mikasa-load-management)

| Field | Value |
|-------|--------|
| **URL** | https://github.com/TeckVeho/mikasa/issues/24 |
| **SP** | 1 (`sp:1`) |
| **Status** | IN PROGRESS |
| **Parent** | [gcp-monitoring#147](https://github.com/TeckVeho/gcp-monitoring/issues/147) |

## Context / Codebase Paths

```yaml
repository: TeckVeho/mikasa
repo: mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/24
workspace_root: .
frontend_path: ./apps/web
backend_path: ./apps/api
migrations_path: ./apps/api/prisma/migrations
tests_path: ./apps/api
```

## Target

| Item | Value |
|------|-------|
| Hub connection | `gcp-dev-sql-hub:asia-northeast1:dev-sql-hub` |
| Hub DB | `mikasa_load_management_dev` |
| Hub VPC | `dev-sql-hub-vpc` / `dev-sql-hub-subnet` |
| Current Dev instance | `mikasa-load-management-mysql-dev` → decommission after Wave 3 |
| Secret | `mikasa-load-management-database-url-dev` |
| Dev URLs | Web `https://mikasa.vw-dev.com` · API `https://mikasa-api.vw-dev.com` |

## Reference

Mirror [LMS #95](https://github.com/TeckVeho/lms/issues/95) / [GBS #119](https://github.com/TeckVeho/gla-budget-system/issues/119).

## Acceptance criteria

- [ ] Local dump `mikasa-load-management-mysql-dev` exists + size > 0
- [ ] `terragrunt plan` posted; no unexpected destroys
- [ ] Dev app uses hub (`mikasa_load_management_dev`)
- [ ] Local: `npm test` + `npm run build` + `npm run test:e2e` PASS
- [ ] CI PR all green (ci-test + ci-e2e + pr-policy)
- [ ] Smoke domain: login + auth/me + projects → **200**
- [ ] `enable_sql_night_weekend_schedule = false` for external hub
- [ ] Comment on gcp-monitoring#147 with PR link
- [ ] Kido Cursor Activity comment on PR
- [ ] Legacy `mikasa-load-management-mysql-dev` decommissioned after verify
- [ ] `fixes #24` merged
