# Dev log — Issue #18

**Issue:** [refactor: Add API feature tests (Supertest)](https://github.com/TeckVeho/mikasa/issues/18)

## Implementation (2026-07-22)

### Test harness

- `apps/api/src/test/{app,fixtures,dev-auth,prisma-mock}.ts`
- Prisma mock + dev-auth headers (`dev-user` admin, `dev-operator` for 403)

### Integration specs (17 cases)

| File | Cases |
|------|-------|
| `health.integration.test.ts` | 2 |
| `auth.integration.test.ts` | 4 |
| `projects.integration.test.ts` | 4 |
| `master.integration.test.ts` | 4 |
| `dashboard.integration.test.ts` | 3 |

### CI

- `.github/workflows/ci-test.yml` — PR `develop` → `prisma generate` + `npm test`

### Verify

```bash
cd apps/api && npx prisma generate && npm test
# API: 30 passed (13 UT + 17 integration)
npm test  # monorepo: 79 passed
```

### PR

- Branch: `feature/18-api-supertest`
- Closes #18
