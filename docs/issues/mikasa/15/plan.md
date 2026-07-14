# Issue #15 — Sync main with develop — Plan

1. Confirm `develop` ahead of `main` (CD fixes #11–#14 on develop)
2. Open PR `develop` → `main` ([#17](https://github.com/TeckVeho/mikasa/pull/17))
3. Resolve merge conflicts if any (`docs/issues/mikasa/13/dev.md` add/add)
4. Merge PR — **no redeploy** (CD triggers: `develop` / `staging` / `production` only)
5. Verify `main` tip matches merged `develop` content
6. Close #15
