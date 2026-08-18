# Test — Issue #24

## Local

| Check | Result |
|-------|--------|
| `npm test` | ✅ PASS (API + web vitest) |
| `npm run build` | ⚠️ pre-existing API `prisma-mock.ts` TS errors (not introduced by #24) |
| `npm run test:e2e` | ⚠️ skipped locally (no MySQL service); CI runs with MySQL 8 container |

## Smoke domain (dev hub cutover)

| Check | Result |
|-------|--------|
| GET `https://mikasa.vw-dev.com/login` | ✅ **200** |
| GET `https://mikasa-api.vw-dev.com/health` | ✅ **200** |
| GET `/v1/auth/me` + dev headers | ✅ **200** |
| GET `/v1/projects` + dev headers | ✅ **200** (after `--no-invoker-iam-check`) |

## CI (PR)

| Check | Result |
|-------|--------|
| ci-test (Turbo test) | pending |
| ci-e2e (Playwright) | pending |
| pr-policy-check | pending |

## Terragrunt

| Step | Result |
|------|--------|
| `terragrunt plan` (external mode) | ✅ destroys managed instance + sql schedule |
| `terragrunt apply` | ✅ hub connection in outputs |
