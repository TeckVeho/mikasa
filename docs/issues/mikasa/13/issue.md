# Issue #13 — ops: Configure Firebase Web API key for dev login

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/13
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

GitHub Environment `develop` was missing `GCP_NEXT_PUBLIC_FIREBASE_API_KEY`, so CD baked an empty `NEXT_PUBLIC_FIREBASE_API_KEY` into the web Docker image. Dev login via Firebase client could not initialize (`apps/web/lib/auth.ts`).

## Scope

- Dev only (`mikasa-load-management`, `develop` branch)
- Ops: set GitHub variable + redeploy web
- No code changes required for CD pipeline (already wired in `cd-gcp.yml`)

## Out of scope

- Dev auth bypass (`USE_DEV_AUTH`) — Issue #14
- Staging / production

## Acceptance criteria

- [ ] `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` set on GitHub Environment `develop`
- [ ] CD web redeploy completes successfully
- [ ] Web bundle contains non-empty Firebase API key
- [ ] `GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` / `GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID` unchanged

## Note

On `https://mikasa.vw-dev.com`, `apps/web/lib/dev-auth.ts` auto-enables dev auth bypass (`*.vw-dev.com`). Firebase login on that hostname is not exercised; verify key via client bundle (`apiKey` in JS) per ops plan.
