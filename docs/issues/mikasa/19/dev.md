# Dev log — Issue #19

**Issue:** [refactor: Add E2E tests (Playwright)](https://github.com/TeckVeho/mikasa/issues/19)

## Implementation (2026-07-23)

### Playwright setup

- `apps/web/playwright.config.ts` — dual `webServer` (API :8080, Web :3010)
- `apps/web/.env.e2e` — dev-auth + API URL
- `scripts/e2e-prepare.mjs` — build shared, prisma migrate + seed, copy web env
- `scripts/e2e-copy-web-env.mjs`, `scripts/e2e-api-dev.mjs`
- `apps/web/vitest.config.ts` — exclude `e2e/**` from Vitest

### E2E specs (6 cases)

| File | Cases |
|------|-------|
| `e2e/login.spec.ts` | 2 — form render, dev login → dashboard |
| `e2e/projects.spec.ts` | 2 — 工事一覧, link 240101 → project detail |
| `e2e/teams.spec.ts` | 2 — 班別ビュー sidebar, `/daily-input` → `/teams` |

### CI

- `.github/workflows/ci-e2e.yml` — MySQL 8 service, `e2e-prepare`, Playwright Chromium

### Verify

```bash
docker compose up -d mysql
node scripts/e2e-prepare.mjs
cd apps/web && npm run test:e2e:only
```

Local E2E blocked when MySQL not running (Docker/Laragon). `npm test` — 79 passed (Vitest, e2e excluded).

### PR

- Branch: `19-feat-e2e-playwright`
- Closes #19
