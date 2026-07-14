# Issue #14 — Dev auth env vars via CD — Plan

## Pipeline

`GitHub develop` → `cd-gcp.yml` (`submit-web`) → `cloudbuild.dev.web.yaml` → `apps/web/Dockerfile` → Cloud Run `mikasa-load-management-web-dev`

## Code fix (commit `c19b981`)

1. `apps/web/Dockerfile` — ARG/ENV `NEXT_PUBLIC_USE_DEV_AUTH`, `NEXT_PUBLIC_DEV_TENANT_ID`
2. `cloudbuild.dev.web.yaml` — substitutions + `--build-arg`
3. `cd-gcp.yml` — `GCP_NEXT_PUBLIC_USE_DEV_AUTH`, `GCP_NEXT_PUBLIC_DEV_TENANT_ID` → Cloud Build substitutions
4. `dev-auth.ts` — `*.vw-dev.com` hostname fallback (runtime)
5. `login/page.tsx` — `shouldUseDevAuth()` on submit + dev mode banner

## Ops verify

1. Pre-check: `gh variable list --env develop` — `GCP_NEXT_PUBLIC_USE_DEV_AUTH=true`, `GCP_NEXT_PUBLIC_DEV_TENANT_ID=01HZXEXAMPLE...`
2. Confirm CD web deploy after merge (e.g. run `29311672361` post-#13)
3. Verify bundle: login chunk shows dev banner; `shouldUseDevAuth` inlined as `true`
4. Verify API: `GET /v1/auth/me` with `X-Dev-Tenant-Id` / `X-Dev-User-Id` → 200 + correct tenant
5. Close GitHub #14
