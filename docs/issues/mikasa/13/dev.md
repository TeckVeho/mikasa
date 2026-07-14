# Issue #13 — dev log

**Issue:** [ops: Configure Firebase Web API key for dev login](https://github.com/TeckVeho/mikasa/issues/13)  
**PR:** [#16](https://github.com/TeckVeho/mikasa/pull/16) (merged to `develop`)  
**Workflow:** [Ops · Issue 13 Firebase API key](https://github.com/TeckVeho/mikasa/actions/workflows/ops-issue-13-firebase-key.yml)

## Pre-check (done)

| Variable | Before | After |
|----------|--------|-------|
| `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` | missing | set (`AIzaSyC0Lo...`) |
| `GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mikasa-load-management.firebaseapp.com` | `mikasa-load-management-94ddf.firebaseapp.com` |
| `GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mikasa-load-management` | `mikasa-load-management-94ddf` |

**Bundle before fix:** `apiKey:""` (`page-21bd4831541346ca.js`).

## Firebase project (confirmed)

| Field | Value |
|-------|-------|
| Project name | `mikasa-load-management` |
| Project ID | `mikasa-load-management-94ddf` |
| Web app nickname | `veho-mikasa-web` |

## Completed (2026-07-14)

1. Set GitHub Environment `develop` variables (API key + updated AUTH_DOMAIN / PROJECT_ID)
2. CD web redeploy: [run 29311672361](https://github.com/TeckVeho/mikasa/actions/runs/29311672361) — **success**
3. Verify:
   - `GET https://mikasa.vw-dev.com/login` → **200**
   - Login chunk `page-4c9351a9886d47f8.js` contains `apiKey:"AIzaSyC0Lo..."` and `mikasa-load-management-94ddf`

## Acceptance criteria

- [x] Web API key set on GitHub `develop`
- [x] CD web redeploy green
- [x] Web image bundle has valid Firebase API key
- [x] AUTH_DOMAIN / PROJECT_ID aligned with Firebase Web app (`-94ddf`)

## Notes

- `mikasa.vw-dev.com` still uses **dev auth bypass** (`*.vw-dev.com`) — login form may skip Firebase; ops AC met via baked client config.
- Admin SDK JSON (`veho-mikasa`) is **separate** — for API Secret Manager later, not this issue.
- Earlier auto-fetch workflow runs failed (Firebase not linked / WIF 403) until Web app was created manually in Console.

## Automation attempts (historical)

| Run | Result |
|-----|--------|
| [29303017722](https://github.com/TeckVeho/mikasa/actions/runs/29303017722) | fail — webApps 404 |
| [29303072496](https://github.com/TeckVeho/mikasa/actions/runs/29303072496) | fail — Firebase project not found |
| [29303114930](https://github.com/TeckVeho/mikasa/actions/runs/29303114930) | fail — addFirebase 403 |
