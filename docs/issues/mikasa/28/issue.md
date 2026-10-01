# Issue #28 — Secret Manager bundle (mikasa-load-management)

| Field | Value |
|-------|--------|
| **URL** | https://github.com/TeckVeho/mikasa/issues/28 |
| **SP** | 5 (`sp:5`) |
| **Assignee** | ngoson919597 |
| **Worktree** | `orchestrate-worktrees/mikasa/issues/28` |
| **Branch** | `28-secret-manager-bundle` |
| **Epic** | [gcp-monitoring#196](https://github.com/TeckVeho/gcp-monitoring/issues/196) |
| **Status** | IN PROGRESS |

## Summary

Org Secret Manager cost optimization: ≤6 secrets/project, app keys in `.env` bundle mounted as `APP_SECRETS_FILE`, DB `DATABASE_URL` separate, rollout dev → stg → prod.

## Docs

- [plan.md](./plan.md)
- [dev.md](./dev.md)
- [test.md](./test.md)
