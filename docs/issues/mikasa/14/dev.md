# Issue #14 — dev log

**Issue:** [fix: Pass dev auth env vars into web Docker build via CD](https://github.com/TeckVeho/mikasa/issues/14)  
**Fix commit:** `c19b981` — `fix(web): enable dev auth login on vw-dev.com without Firebase`

## Pre-check (done)

| GitHub var (`develop`) | Value |
|------------------------|-------|
| `GCP_NEXT_PUBLIC_USE_DEV_AUTH` | `true` |
| `GCP_NEXT_PUBLIC_DEV_TENANT_ID` | `01HZXEXAMPLE00000000000000` |

## Code wiring (done — `c19b981`)

- [x] `apps/web/Dockerfile` — build-arg + ENV
- [x] `google-cloud/cloudbuild/cloudbuild.dev.web.yaml` — substitutions + docker build-arg
- [x] `.github/workflows/cd-gcp.yml` — `submit-web` passes vars to Cloud Build

## CD (done)

- Web deploy after fix: [run 29311672361](https://github.com/TeckVeho/mikasa/actions/runs/29311672361) (with #13 Firebase key redeploy) — **success**
- Latest develop push: [run 29315529454](https://github.com/TeckVeho/mikasa/actions/runs/29315529454) — **success** (docs-only, skipped web rebuild)

## Verify (2026-07-14)

| Check | Result |
|-------|--------|
| `GET https://mikasa.vw-dev.com/login` | **200** |
| Dev auth banner on `/login` | *「開発モード: Firebase なしでダッシュボードへ進めます」* |
| Login chunk `page-4c9351a9886d47f8.js` | `shouldUseDevAuth` compiled to `return true` (baked `USE_DEV_AUTH`) |
| `GET https://mikasa-api.vw-dev.com/v1/auth/me` + dev headers | **200** — `tenantId: 01HZXEXAMPLE00000000000000`, `id: dev-user` |

```bash
curl -sS "https://mikasa-api.vw-dev.com/v1/auth/me" \
  -H "X-Dev-Tenant-Id: 01HZXEXAMPLE00000000000000" \
  -H "X-Dev-User-Id: dev-user"
# {"ok":true,"data":{"id":"dev-user","email":"admin@example.com","role":"admin","tenantId":"01HZXEXAMPLE00000000000000"}}
```

## Acceptance criteria

- [x] Three files wire dev auth vars consistently
- [x] CD `submit-web` green on `develop`
- [x] `/login` shows dev auth option
- [x] API uses seed default tenant `01HZXEXAMPLE00000000000000`
- [x] Independent of Issue #13 (both complete)

## Notes

- Runtime hostname `*.vw-dev.com` also enables dev auth (`dev-auth.ts`) — belt-and-suspenders with baked `USE_DEV_AUTH=true`.
- Tester flow: any valid email/password on `/login` → dashboard without Firebase.
