# Plan — Issue #19 E2E Playwright

**Issue:** https://github.com/TeckVeho/mikasa/issues/19

## Approach

Mirror Evry #13: Playwright in `apps/web/e2e/` with dev-auth + real API + MySQL (local Docker / GHA service).

## Order

1. Playwright setup + `scripts/e2e-prepare.mjs`
2. Fixtures + spec files (`login`, `projects`, `teams`)
3. `.github/workflows/ci-e2e.yml`
4. Verify + PR

## Verify

```bash
docker compose up -d mysql
node scripts/e2e-prepare.mjs
cd apps/web && npm run test:e2e:only
```
