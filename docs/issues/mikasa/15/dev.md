# Issue #15 — dev log

**Issue:** [refactor: Sync main branch with develop](https://github.com/TeckVeho/mikasa/issues/15)  
**PR:** [#17](https://github.com/TeckVeho/mikasa/pull/17) — merged 2026-07-14

## Pre-sync state

- `develop` was **17 commits** ahead of `main`
- Includes: #11 Suspense fix, #12 Dockerfile/worker cleanup, #14 dev auth CD, #13 Firebase ops, API `ALLOW_DEV_AUTH`, issue docs

## Actions

1. Opened PR [#17](https://github.com/TeckVeho/mikasa/pull/17) (`develop` → `main`)
2. Resolved merge conflict: `docs/issues/mikasa/13/dev.md` (add/add) — kept completed develop version
3. Merged PR — merge commit `5c27fdc`

## Verify

| Check | Result |
|-------|--------|
| PR #17 merged | **yes** (`2026-07-14T07:55:23Z`) |
| `main` includes CD fixes | **yes** (via merge) |
| CD on `main` push | **none** — `cd-gcp.yml` triggers `develop` / `staging` / `production` only |

## Acceptance criteria

- [x] PR `develop` → `main` reviewed and merged
- [x] `main` includes CD fix commits from `develop`
- [x] Merge only — no extra deploy
