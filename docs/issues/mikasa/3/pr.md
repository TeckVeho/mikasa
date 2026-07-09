# Issue #3 — PR body

## Summary

Adapt LogiVoice GCP template for **mikasa dev** (`mikasa-lm-dev`): Terraform `enable_worker` toggle, mikasa naming in Terragrunt/Cloud Build/tfvars examples, WIF defaults for `TeckVeho/mikasa`, and dev runbook.

## Changes

- Add `enable_worker` to Terraform (`enable_worker=false` on dev — no Pub/Sub/worker)
- Terragrunt remote state → `mikasa-lm-dev-terraform-state`
- Dev tfvars examples: mikasa images (`mikasa-api`, `mikasa-web`), Firebase secrets only
- Cloud Build dev YAMLs: mikasa service names, drop worker from combined `cloudbuild.dev.yaml`
- WIF script + docs defaults for `TeckVeho/mikasa`
- Runbook: `docs/infrastructure/gcp-dev-runbook.md`
- Issue docs: `docs/issues/mikasa/3/`

## Post-merge (manual GCP)

1. `gcloud auth login` && `gcloud config set project mikasa-lm-dev`
2. Copy `terraform.tfvars.example` → `terraform.tfvars` (gitignored)
3. Terragrunt: bootstrap → dev/network → build images → dev/app
4. Run `./google-cloud/scripts/setup-github-actions-wif.sh`
5. Set GitHub Environment `develop` secrets (see runbook)
6. Create branch `develop` from `main` and push

Closes #3 (infra template portion; GCP apply tracked in runbook)

## Test plan

- [x] `terraform validate` on bootstrap module
- [ ] Terragrunt apply on `mikasa-lm-dev` (requires GCP auth)
- [ ] Cloud Build dev API/Web after infra apply
- [ ] CD from `develop` after WIF + secrets
