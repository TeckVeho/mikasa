# Issue #13 — Firebase Web API key (dev) — Plan

See attached plan: ops-only — set `GCP_NEXT_PUBLIC_FIREBASE_API_KEY`, redeploy web, verify key baked into image.

## Pipeline (no code change)

`GitHub develop` → `cd-gcp.yml` (`submit-web`) → `cloudbuild.dev.web.yaml` → `apps/web/Dockerfile` → Cloud Run `mikasa-load-management-web-dev`

## Execution

1. Pre-check: `gh variable list --env develop` — confirm `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` missing
2. Set variable via [`.github/workflows/ops-issue-13-firebase-key.yml`](../../../../.github/workflows/ops-issue-13-firebase-key.yml) (WIF fetch) or manual `gh variable set`
3. Redeploy: `gh workflow run "CD · GCP (Cloud Build)" --ref develop -f deploy_scope=web`
4. Verify: login page JS chunk contains `apiKey:"AIza..."` (not empty)
5. Close GitHub #13

## Dev bypass note

`mikasa.vw-dev.com` uses dev auth bypass by hostname; Firebase login smoke on that URL is not required for ops acceptance.
