# app_cron

Cloud Scheduler -> Cloud Run API cron integration module.

Creates:

- Scheduler service account (`{project}-cron-api-{env}`)
- `roles/run.invoker` binding on API Cloud Run service
- Scheduler jobs for:
  - `/internal/cron/cleanup-tokens`
  - `/internal/cron/tbs-batch`
  - `/internal/cron/recommendations`

This module is composed from `modules/app_compose`.
