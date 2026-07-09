# Issue #3 — dev log

**Issue:** [ops: Initial GCP setup (dev)](https://github.com/TeckVeho/mikasa/issues/3)  
**Branch:** `3-ops-gcp-dev-setup`

## Summary

Adapted LogiVoice GCP template for mikasa dev (`mikasa-lm-dev`): Terraform `enable_worker` toggle, mikasa naming in tfvars examples / Terragrunt / Cloud Build dev YAMLs, WIF script defaults, runbook.

## Changes (committed in branch)

| Area | Files |
|------|-------|
| Issue docs | `docs/issues/mikasa/3/issue.md`, `plan.md` |
| Runbook | `docs/infrastructure/gcp-dev-runbook.md` |
| `enable_worker` | `modules/app_compose/*`, `modules/cloud_run/worker.tf`, `outputs.tf`, `_shared/app/main.tf` |
| Terragrunt state | `live/*/terragrunt.hcl` → `mikasa-lm-dev-terraform-state` |
| tfvars examples | `environments/bootstrap`, `dev/network`, `dev/app` |
| Cloud Build dev | `cloudbuild.dev.api.yaml`, `cloudbuild.dev.web.yaml` |
| WIF | `scripts/setup-github-actions-wif.sh`, `GITHUB_ACTIONS_WIF.md` |

## Local only (gitignored)

- `google-cloud/terraform/environments/bootstrap/terraform.tfvars`
- `google-cloud/terraform/environments/dev/network/terraform.tfvars`
- `google-cloud/terraform/environments/dev/app/terraform.tfvars`

## GCP apply status

**Not applied in this session** — `gcloud auth login` required (token refresh failed non-interactively).

Follow `docs/infrastructure/gcp-dev-runbook.md` sections 1–5 after authenticating.

## GitHub CD status

- **Environment `develop`:** created on GitHub (2026-07-09)
- **Secrets/vars:** pending WIF script run — see `docs/issues/mikasa/3/github-cd-checklist.md`
- **`develop` branch:** create and push after merging infra PR to `main`

## Smoke (pending GCP)

- [ ] `GET /health` on API Cloud Run URL
- [ ] `/dashboard` on Web with dev auth bypass
- [ ] `cd-gcp.yml` green on push to `develop`

## Notes

- npm scope remains `@logivoice/*` (out of scope)
- AR image names: `mikasa-api`, `mikasa-web` (not `logivoice-*`)
- Dev web: `allow_unauthenticated_web = true` in tfvars example for browser access
