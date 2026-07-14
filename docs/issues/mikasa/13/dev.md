# Issue #13 — dev log

**Issue:** [ops: Configure Firebase Web API key for dev login](https://github.com/TeckVeho/mikasa/issues/13)  
**PR:** [#16](https://github.com/TeckVeho/mikasa/pull/16) (merged to `develop`)  
**Workflow:** [Ops · Issue 13 Firebase API key](https://github.com/TeckVeho/mikasa/actions/workflows/ops-issue-13-firebase-key.yml)

## Pre-check (done)

```bash
gh variable list --env develop --repo TeckVeho/mikasa
```

| Variable | Status |
|----------|--------|
| `GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mikasa-load-management.firebaseapp.com` |
| `GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mikasa-load-management` |
| `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` | **missing** |

**Bundle before fix:** `apiKey:""` in `/login` JS chunk (`page-21bd4831541346ca.js`).

## Automation attempts

| Run | Result | Finding |
|-----|--------|---------|
| [29303017722](https://github.com/TeckVeho/mikasa/actions/runs/29303017722) | fail | Firebase `webApps` HTTP 404 |
| [29303072496](https://github.com/TeckVeho/mikasa/actions/runs/29303072496) | fail | `Firebase project 980857788409 not found` |
| [29303114930](https://github.com/TeckVeho/mikasa/actions/runs/29303114930) | fail | `addFirebase` HTTP 403 — `github-actions-mikasa@...` lacks Firebase admin |

**Root cause:** Firebase is **not linked** to GCP project `mikasa-load-management` (or no web app). GitHub Actions WIF SA cannot enable Firebase without extra IAM (`roles/firebase.admin` or owner).

Local `gcloud` / ADC for `ngo.hong.son@veho-works.com` also expired (`Reauthentication is needed`).

## Deliverables (done)

- [x] `docs/issues/mikasa/13/issue.md`, `plan.md`
- [x] `.github/workflows/ops-issue-13-firebase-key.yml` — auto-fetch or manual `firebase_api_key` input + set var + trigger CD web

## Remaining (blocked on Firebase key)

- [ ] Obtain Web API key (Firebase Console or after `addFirebase` + web app)
- [ ] Set `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` on GitHub `develop`
- [ ] CD web redeploy green
- [ ] Verify bundle `apiKey:"AIza..."` non-empty
- [ ] Close #13

## How to finish (manual)

### Option A — Vững / GCP admin (recommended)

1. [Firebase Console](https://console.firebase.google.com/) → add project `mikasa-load-management` (if not linked)
2. Project settings → Your apps → Web app → copy **Web API Key**
3. Either:
   ```bash
   gh variable set GCP_NEXT_PUBLIC_FIREBASE_API_KEY \
     --env develop --repo TeckVeho/mikasa --body "<KEY>"
   gh workflow run "CD · GCP (Cloud Build)" --repo TeckVeho/mikasa --ref develop -f deploy_scope=web
   ```
   Or GitHub Actions → **Ops · Issue 13 Firebase API key** → Run workflow → paste key in `firebase_api_key`

### Option B — Grant WIF SA Firebase access (optional, for auto workflow)

```bash
gcloud projects add-iam-policy-binding mikasa-load-management \
  --member="serviceAccount:github-actions-mikasa@mikasa-load-management.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

Then re-run **Ops · Issue 13 Firebase API key** without manual input.

### Verify

```bash
curl -sS "https://mikasa.vw-dev.com/_next/static/chunks/app/(auth)/login/page-*.js" | rg 'apiKey:"AIza'
curl -sS -o /dev/null -w "%{http_code}" https://mikasa.vw-dev.com/login
```

**Note:** `mikasa.vw-dev.com` uses dev auth bypass (`*.vw-dev.com`); Firebase login on that host is not required for ops AC — verify baked key in JS bundle.
