# Issue #19 — refactor: Add E2E tests (Playwright)

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/19

## Context / Codebase Paths

```yaml
workspace_root: .
frontend_path: apps/web
backend_path: apps/api
migrations_path: apps/api/prisma/migrations
api_docs_path:
tests_path: apps/web/e2e
```

## Summary

Add Playwright E2E for mikasa load calculation: login → projects → project detail → team schedule (`班別ビュー`). Dev-auth on CI (no Firebase).

## Scope

- Playwright harness + `apps/web/e2e/`
- Flow: login → `工事一覧` → project detail → `班別ビュー`
- `.github/workflows/ci-e2e.yml` on PR to `develop`

## Out of scope

- Full UI E2E coverage
- Firebase login E2E
- Frontend auth guard / guest redirect tests
- RBAC E2E

## Dependencies

- Issue #18 (API feature tests) — done

## Acceptance criteria

- [ ] E2E login → project detail passes
- [ ] CI has E2E job
