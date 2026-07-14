# Issue #14 — fix: Pass dev auth env vars into web Docker build via CD

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/14
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

GitHub Environment `develop` had `GCP_NEXT_PUBLIC_USE_DEV_AUTH` and `GCP_NEXT_PUBLIC_DEV_TENANT_ID` but they were not passed through CD into the web Docker `next build`, so deployed web did not bake dev auth client config for testers.

## Scope

- Dev only (`develop` branch, `mikasa.vw-dev.com`)
- Wire `NEXT_PUBLIC_USE_DEV_AUTH` / `NEXT_PUBLIC_DEV_TENANT_ID` through Dockerfile, Cloud Build, and `cd-gcp.yml`
- Verify `/login` dev auth UI and API tenant headers

## Out of scope

- Staging / production deploy
- Firebase API key ops — Issue #13 (parallel)

## Acceptance criteria

- [ ] Dockerfile / cloudbuild / workflow pass dev auth vars consistently
- [ ] CD `submit-web` green on `develop`
- [ ] `/login` shows dev auth option when `USE_DEV_AUTH=true`
- [ ] API calls use seed tenant `01HZXEXAMPLE00000000000000`

## Related files

- `apps/web/Dockerfile`
- `google-cloud/cloudbuild/cloudbuild.dev.web.yaml`
- `.github/workflows/cd-gcp.yml`
- `apps/web/lib/dev-auth.ts`, `apps/web/lib/api.ts`
