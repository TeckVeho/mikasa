# Plan — Issue #18 API Feature Tests

**Issue:** https://github.com/TeckVeho/mikasa/issues/18

## Approach

Mirror Evry #12: `getTestApp()` + Prisma mock + `devAuthHeaders`, service mocks for heavy routes.

## Test cases (~17)

| File | Cases |
|------|-------|
| `health.integration.test.ts` | 2 |
| `auth.integration.test.ts` | 4 |
| `projects.integration.test.ts` | 4 |
| `master.integration.test.ts` | 4 |
| `dashboard.integration.test.ts` | 3 |

## CI

`.github/workflows/ci-test.yml` — `npm test` (turbo) on PR to `develop`.
