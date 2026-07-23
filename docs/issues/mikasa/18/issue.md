# Issue #18 — refactor: Add API feature tests (Supertest)

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/18

## Context / Codebase Paths

```yaml
workspace_root: .
frontend_path: apps/web
backend_path: apps/api
migrations_path: apps/api/prisma/migrations
api_docs_path:
tests_path: apps/api/src
```

## Summary

mikasa has 12 unit tests but zero HTTP feature tests. Add Supertest coverage for key `apps/api` routes: auth, projects, dashboard, master — happy path plus 401/403.

## Scope

- Supertest + Vitest integration tests under `apps/api/src/routes/*.integration.test.ts`
- Test harness: Prisma mock + dev-auth headers (no MySQL on CI)
- `.github/workflows/ci-test.yml` on PR to `develop`

## Out of scope

- E2E Playwright (#19)
- Full route coverage / historical-averages
- Firebase verify happy path
- Real MySQL test DB

## Acceptance criteria

- [x] Feature tests for auth, projects, dashboard, master routes
- [x] CI passes (`npm test`)
- [x] No regression in existing 12 unit tests
