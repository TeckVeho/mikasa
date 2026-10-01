# Plan — Issue #28

## Pre-work

- [x] Worktree `orchestrate-worktrees/mikasa/issues/28`
- [x] Terraform + API loader + scripts in PR branch

## Cutover (manual GCP)

- [ ] Inventory: `./google-cloud/scripts/inventory-secret-manager-mikasa.sh`
- [ ] Create bundle dev: `create-mikasa-app-secrets-bundle.sh`
- [ ] `terragrunt apply` dev/app with `app_secrets_bundle_secret_id`
- [ ] Smoke dev → gate 24h → stg → prod
- [ ] `issue-28-cleanup-legacy-secrets.sh` with `DRY_RUN=0` after prod smoke
- [ ] Verify ≤6 secrets, 1 ENABLED version each

## PR

- [ ] `Closes #28`
