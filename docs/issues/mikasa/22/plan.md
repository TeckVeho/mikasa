# Plan — Issue #22

1. Update `sql_schedule_stop_cron` in module + app_compose + `_shared/app` variables
2. Update dev/stg `terraform.tfvars.example` (explicit cron values)
3. Update local `dev/app/terraform.tfvars` override (gitignored)
4. `terragrunt apply` `live/dev/app`
5. Verify Scheduler job `mikasa-load-management-sql-stop-dev`
6. Skip stg — GCS state only `app/dev`; no stg scheduler job
7. PR `Closes #22`

Reference: fax #36, centlex #46, gla #85, lms #67.
