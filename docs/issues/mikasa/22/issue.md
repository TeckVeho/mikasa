# Issue #22 — Cloud SQL sql-stop 20:00 JST

| Field | Value |
|-------|--------|
| **URL** | https://github.com/TeckVeho/mikasa/issues/22 |
| **Epic** | [gcp-monitoring #115](https://github.com/TeckVeho/gcp-monitoring/issues/115) |
| **Project** | `mikasa-load-management` |
| **SP** | 1h |

## Summary

Change `sql_schedule_stop_cron` from `0 22 * * 1-5` to `0 20 * * 1-5` (Asia/Tokyo).

## Acceptance criteria

- [x] Terraform defaults + dev/stg examples updated to 20:00 JST
- [x] `terragrunt apply` dev app stack
- [x] `gcloud scheduler jobs describe` confirms schedule (dev)
- [x] stg skipped — no `app/stg` state; no `mikasa-load-management-sql-stop-stg` job on GCP
