# Issue #3 — GitHub CD setup checklist

Run after GCP WIF script (`setup-github-actions-wif.sh`) and first Cloud Run deploy (for URLs).

**Prerequisite:** GCP project **`mikasa-load-management`** must have **billing enabled** (`gcloud billing projects describe mikasa-load-management` → `billingEnabled: true`).

## 1. Create Environment `develop`

Done via API or GitHub → Settings → Environments → New environment → `develop`.

## 2. Secrets (Environment `develop`)

| Secret | Source |
|--------|--------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF script output |
| `GCP_SERVICE_ACCOUNT` | `github-actions-mikasa@mikasa-load-management.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | `mikasa-load-management` |

Set with `gh` (replace placeholders):

```bash
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --env develop --repo TeckVeho/mikasa --body "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
gh secret set GCP_SERVICE_ACCOUNT --env develop --repo TeckVeho/mikasa --body "github-actions-mikasa@mikasa-load-management.iam.gserviceaccount.com"
gh secret set GCP_PROJECT_ID --env develop --repo TeckVeho/mikasa --body "mikasa-load-management"
```

## 3. Variables (Environment `develop`)

```bash
gh variable set GCP_AR_PROJECT_ID --env develop --repo TeckVeho/mikasa --body "mikasa-load-management"
gh variable set GCP_DEPLOY_PROJECT_ID --env develop --repo TeckVeho/mikasa --body "mikasa-load-management"
gh variable set GCP_IMAGE_TAG --env develop --repo TeckVeho/mikasa --body "dev"
gh variable set GCP_NEXT_PUBLIC_API_URL --env develop --repo TeckVeho/mikasa --body "https://YOUR-API-URL"
gh variable set GCP_NEXT_PUBLIC_BASE_URL --env develop --repo TeckVeho/mikasa --body "https://YOUR-WEB-URL"
# Firebase vars as needed
```

## 4. Branch `develop`

After merging infra PR to `main`:

```bash
git checkout main && git pull
git checkout -b develop && git push -u origin develop
```

## 5. Verify CD

```bash
gh workflow run "CD · GCP (Cloud Build)" --repo TeckVeho/mikasa --ref develop -f deploy_scope=api
gh run list --repo TeckVeho/mikasa --workflow=cd-gcp.yml --limit 3
```
