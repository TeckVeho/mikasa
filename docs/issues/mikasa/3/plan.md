# Issue #3: Mikasa GCP dev initial setup — Implementation Plan

## Overview

Adapt LogiVoice Terraform/Cloud Build template for mikasa on `mikasa-lm-dev`, disable worker on dev, apply infra, wire GitHub CD on `develop`, first deploy + runbook.

## Order of work

1. Template cleanup (committed): `enable_worker`, terragrunt state bucket, tfvars examples, Cloud Build dev YAMLs, WIF script
2. GCP apply (local tfvars): bootstrap → dev/network → images → dev/app
3. WIF + GitHub Environment `develop`
4. Branch `develop` + CD verify
5. Migrate, seed, smoke + `docs/infrastructure/gcp-dev-runbook.md`

## Decisions

- CD branch: `develop` (created from `main`)
- Worker: `enable_worker = false` in Terraform dev

## Key paths

| Area | Path |
|------|------|
| Terragrunt live | `google-cloud/terraform/live/` |
| Dev tfvars example | `google-cloud/terraform/environments/dev/app/terraform.tfvars.example` |
| Cloud Build dev | `google-cloud/cloudbuild/cloudbuild.dev.*.yaml` |
| CD workflow | `.github/workflows/cd-gcp.yml` |
| WIF script | `google-cloud/scripts/setup-github-actions-wif.sh` |

## Cloud Run naming (project `mikasa-lm-dev`)

- API: `mikasa-lm-dev-api-dev`
- Web: `mikasa-lm-dev-web-dev`
- Migrate job: `mikasa-lm-dev-migrate-dev`
