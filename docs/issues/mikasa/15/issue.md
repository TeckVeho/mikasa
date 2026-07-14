# Issue #15 — refactor: Sync main branch with develop

repository: TeckVeho/mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/15
github_project_v2_id:
github_project_title:

## Summary

`develop` was ahead of `main` with CD fixes (#11–#14), dev auth, Firebase ops, and issue docs. Sync via PR `develop` → `main` without triggering deploy (`cd-gcp.yml` does not run on `main`).

## Scope

- PR merge only — no new implementation
- No staging/prod branch or redeploy

## Acceptance criteria

- [ ] PR `develop` → `main` reviewed and merged
- [ ] `main` includes CD fix commits from `develop`
- [ ] No extra deploy triggered

## PR

- [#17](https://github.com/TeckVeho/mikasa/pull/17) — `develop` → `main`
