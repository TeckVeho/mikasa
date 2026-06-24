# Production: backup enabled + 17:00 UTC start are fixed in module locals (dev/stg configure via tfvars).

check "prod_sql_backup_start_time_not_overridden" {
  assert {
    condition = var.env_suffix != "prod" || !var.enable_cloud_sql || var.sql_backup_start_time == "17:00"
    error_message = "Production: sql_backup_start_time is fixed at 17:00 UTC. Remove sql_backup_start_time from prod tfvars."
  }
}
