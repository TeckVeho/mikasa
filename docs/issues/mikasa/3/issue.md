# Issue #3 — ops: Initial GCP setup for Mikasa load calculation system (dev environment)

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/3
github_project_v2_id:
github_project_title:

## Context / Codebase Paths

```yaml
workspace_root: .
frontend_path: apps/web
backend_path: apps/api
migrations_path: apps/api/prisma/migrations
api_docs_path:
tests_path:
```

## Summary

Stand up **mikasa** on **GCP dev** (`mikasa-lm-dev`): Terraform bootstrap → network → app, Cloud Build API/Web deploy, GitHub Actions WIF on `develop`, migrate + seed, runbook.

## Scope

- Dev only (`mikasa-lm-dev`)
- API + Web; `enable_worker = false` on dev
- Template cleanup: LogiVoice → mikasa naming
- No npm `@logivoice` rename, no stg/prod, no custom prod domain

## Dependencies

- GCP project `mikasa-LM-dev` with billing
- Firebase project + Web API key
- GitHub Actions secrets on `TeckVeho/mikasa` (Environment `develop`)

## Acceptance criteria

- [ ] Bootstrap + dev network/app Terraform applied on `mikasa-lm-dev`
- [ ] API/Web images in Artifact Registry; Cloud Run running
- [ ] Migrate job applied schema to Cloud SQL
- [ ] Web dashboard reachable (Firebase or dev auth bypass)
- [ ] API health responds on dev
- [ ] Redeploy via `cd-gcp.yml` from `develop`
- [ ] Runbook in repo
