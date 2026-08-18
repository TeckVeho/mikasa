# Plan — Issue #24

1. Wave 0: branch `24-ops-dev-sql-hub` — docs, `issue-24-export-sql.sh`, dump `mikasa-load-management-mysql-dev`
2. Terraform: `cloud_sql_source = external` + hub VPC overrides
3. Wave 1: hub DB `mikasa_load_management_dev` + cross-project `cloudsql.client` IAM
4. Wave 2: import + cutover secret/Cloud Run + domain smoke 4/4 → 200
5. Local + CI tests pass all
6. Wave 3: terragrunt apply external mode + decommission `mikasa-load-management-mysql-dev`
7. PR closeout: comment gcp-monitoring#147 + Kido Cursor Activity metrics on PR
