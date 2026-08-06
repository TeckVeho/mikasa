# Dev log — Issue #22

**Issue:** https://github.com/TeckVeho/mikasa/issues/22

## Terraform code changes

- `google-cloud/terraform/modules/sql_schedule/variables.tf`
- `google-cloud/terraform/modules/app_compose/variables.tf`
- `google-cloud/terraform/environments/_shared/app/variables.tf`
- `google-cloud/terraform/environments/dev/app/terraform.tfvars.example`
- `google-cloud/terraform/environments/stg/app/terraform.tfvars.example`

`sql_schedule_stop_cron`: `0 22 * * 1-5` → `0 20 * * 1-5`

Local (gitignored): `environments/dev/app/terraform.tfvars` line 74 updated.

## Apply (2026-08-06)

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
cd google-cloud/terraform/live/dev/app
terragrunt init -reconfigure
terragrunt plan -out=tfplan    # Plan: 0 add, 1 change, 0 destroy
terragrunt apply tfplan
```

**dev:** Applied — `google_cloud_scheduler_job.sql_stop` schedule updated.

**stg:** Skipped — no `app/stg` in `gs://mikasa-load-management-terraform-state/`; no `mikasa-load-management-sql-stop-stg` job on GCP.

**prod:** Skipped — `enable_sql_night_weekend_schedule = false`.

## Verify

```text
gcloud scheduler jobs describe mikasa-load-management-sql-stop-dev \
  --project=mikasa-load-management --location=asia-northeast1 \
  --format='yaml(schedule,timeZone,state)'

schedule: 0 20 * * 1-5
state: ENABLED
timeZone: Asia/Tokyo
```
