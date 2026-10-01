# Test — Issue #28

## Automated (CI / local)

| Check | Command | Result |
|-------|---------|--------|
| App secrets loader | `cd apps/api && npx vitest run src/lib/load-app-secrets-file.test.ts` | **pass** (local) |

## GCP cutover smoke (per env)

| Env | Bundle secret | terragrunt apply | GET /health | Notes |
|-----|---------------|------------------|-------------|-------|
| dev | `mikasa-app-secrets-dev` | pending ops | pending | after PR merge + image deploy |
| stg | `mikasa-app-secrets-stg` | pending | pending | after dev gate ≥24h |
| prod | `mikasa-app-secrets-prod` | pending | pending | after stg pass |

```bash
API_URL="https://..." ./google-cloud/scripts/issue-28-smoke.sh
```

## Post-close verification

- [ ] `gcloud secrets list` → ≤ 6 secrets on `mikasa-load-management`
- [ ] Each secret: 1 ENABLED version, user-managed single region
- [ ] Legacy Firebase per-key secrets removed (cleanup script)
- [ ] Billing note vs prior month (manual Console)
