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

Stand up **mikasa** on **GCP dev** in project **`mikasa-load-management`**: Terraform bootstrap → network → app, Cloud Build API/Web deploy, GitHub Actions WIF on `develop`, migrate + seed, runbook.

## GCP naming (confirmed)

| Layer | Pattern | Dev example |
|-------|---------|-------------|
| GCP project ID | `mikasa-load-management` | single project for dev/stg/prod |
| Cloud Run API | `mikasa-load-management-api-{env}` | `mikasa-load-management-api-dev` |
| Cloud Run Web | `mikasa-load-management-web-{env}` | `mikasa-load-management-web-dev` |
| Migrate job | `mikasa-load-management-migrate-{env}` | `mikasa-load-management-migrate-dev` |

## Scope

- Dev only (resources with `-dev` suffix in project `mikasa-load-management`)
- API + Web; `enable_worker = false` on dev
- Template cleanup: LogiVoice → mikasa naming
- No npm `@logivoice` rename, no stg/prod deploy, no custom prod domain

## Dependencies

- GCP project `mikasa-load-management` with billing
- Firebase project + Web API key
- GitHub Actions secrets on `TeckVeho/mikasa` (Environment `develop`)

## Acceptance criteria

- [ ] Bootstrap + dev network/app Terraform applied on `mikasa-load-management`
- [ ] Cloud Run dev (`mikasa-load-management-api-dev`, `mikasa-load-management-web-dev`) running from AR images
- [ ] Migrate job applied schema to Cloud SQL dev
- [ ] Web dashboard reachable (Firebase or dev auth bypass)
- [ ] API health responds on dev
- [ ] Redeploy via `cd-gcp.yml` from `develop`
- [ ] Runbook documents project ID, dev resource names, URLs, secrets
- [ ] No stg/prod resources built in this issue
