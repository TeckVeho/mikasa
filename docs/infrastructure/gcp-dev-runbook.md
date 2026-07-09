# Mikasa GCP dev — Runbook

Project: **`mikasa-load-management`**  
Repo: [TeckVeho/mikasa](https://github.com/TeckVeho/mikasa)  
Issue: [#3](https://github.com/TeckVeho/mikasa/issues/3)

## Architecture (dev)

| Resource | Name |
|----------|------|
| Terraform state bucket | `mikasa-load-management-terraform-state` |
| Artifact Registry | `mikasa-load-management-docker` |
| Cloud Run API | `mikasa-load-management-api-dev` |
| Cloud Run Web | `mikasa-load-management-web-dev` |
| Migrate job | `mikasa-load-management-migrate-dev` |
| Cloud SQL | `mikasa-load-management-mysql-dev` (default) |
| GCS uploads | `mikasa-load-management-uploads-dev` |

Worker/Pub/Sub: **disabled** on dev (`enable_worker = false`).

## Prerequisites

- GCP project `mikasa-load-management` with billing enabled
- `gcloud auth login` + `gcloud config set project mikasa-load-management`
- `terragrunt` + `terraform` installed
- Firebase Web config + service account key for API
- GitHub admin on `TeckVeho/mikasa` for Environment `develop`

## 1. Local tfvars (gitignored)

Copy examples once:

```bash
cd google-cloud/terraform
cp environments/bootstrap/terraform.tfvars.example environments/bootstrap/terraform.tfvars
cp environments/dev/network/terraform.tfvars.example environments/dev/network/terraform.tfvars
cp environments/dev/app/terraform.tfvars.example environments/dev/app/terraform.tfvars
```

After first deploy, update `CORS_ORIGIN`, `API_PUBLIC_URL`, `NEXT_PUBLIC_*` in `environments/dev/app/terraform.tfvars` with real Cloud Run URLs, then re-apply dev/app if needed.

## 2. Terraform apply order

```bash
cd google-cloud/terraform/live/bootstrap
terragrunt init && terragrunt apply

cd ../dev/network
terragrunt init && terragrunt apply
```

Create Secret Manager secrets (before dev/app apply):

```bash
# Firebase Admin (API)
gcloud secrets create mikasa-firebase-private-key-dev --project=mikasa-load-management
gcloud secrets create mikasa-firebase-client-email-dev --project=mikasa-load-management
# Add secret versions with actual values (not in git)
```

Build and push images (first time):

```bash
cd /path/to/mikasa
gcloud builds submit --project=mikasa-load-management \
  --config=google-cloud/cloudbuild/cloudbuild.dev.api.yaml \
  --substitutions=_AR_PROJECT_ID=mikasa-load-management,_DEPLOY_PROJECT_ID=mikasa-load-management

gcloud builds submit --project=mikasa-load-management \
  --config=google-cloud/cloudbuild/cloudbuild.dev.web.yaml \
  --substitutions=_AR_PROJECT_ID=mikasa-load-management,_DEPLOY_PROJECT_ID=mikasa-load-management,_NEXT_PUBLIC_API_URL=https://PLACEHOLDER,_NEXT_PUBLIC_BASE_URL=https://PLACEHOLDER
```

Then app stack:

```bash
cd google-cloud/terraform/live/dev/app
terragrunt init && terragrunt apply
```

## 3. GitHub WIF + Environment `develop`

```bash
./google-cloud/scripts/setup-github-actions-wif.sh
# Or dry-run: ./google-cloud/scripts/setup-github-actions-wif.sh --dry-run
```

See [google-cloud/cloudbuild/GITHUB_ACTIONS_WIF.md](../google-cloud/cloudbuild/GITHUB_ACTIONS_WIF.md).

### Environment `develop` — Secrets

| Secret | Value |
|--------|-------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | From WIF script output |
| `GCP_SERVICE_ACCOUNT` | `github-actions-mikasa@mikasa-load-management.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | `mikasa-load-management` |

### Environment `develop` — Variables

| Variable | Value |
|----------|-------|
| `GCP_AR_PROJECT_ID` | `mikasa-load-management` |
| `GCP_DEPLOY_PROJECT_ID` | `mikasa-load-management` |
| `GCP_IMAGE_TAG` | `dev` |
| `GCP_NEXT_PUBLIC_API_URL` | API Cloud Run URL (no path suffix) |
| `GCP_NEXT_PUBLIC_BASE_URL` | Web Cloud Run URL |
| `GCP_NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `mikasa-load-management.firebaseapp.com` |
| `GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mikasa-load-management` |

## 4. CD branch

CD workflow [`.github/workflows/cd-gcp.yml`](../.github/workflows/cd-gcp.yml) triggers on **`develop`**, `staging`, `production`.

```bash
git checkout main && git pull
git checkout -b develop
git push -u origin develop
```

Push to `develop` runs path-filtered Cloud Build for API/Web (worker skipped on mikasa dev).

Manual redeploy:

```bash
gh workflow run "CD · GCP (Cloud Build)" --repo TeckVeho/mikasa --ref develop -f deploy_scope=all
```

Or scope: `api` | `web` only.

## 5. Migrate, seed, smoke

```bash
# Migrate (via Cloud Build api pipeline, or manual):
gcloud run jobs execute mikasa-load-management-migrate-dev \
  --project=mikasa-load-management --region=asia-northeast1 --wait

# Seed (local with Cloud SQL Auth Proxy, or one-off job):
npm run seed:dev --workspace=@logivoice/api
```

Smoke checks:

| Check | Command / action |
|-------|------------------|
| API health | `curl -sS https://<api-url>/health` |
| Web dashboard | Open `https://<web-url>/dashboard` with `NEXT_PUBLIC_USE_DEV_AUTH=true` |
| Dev tenant | `01HZXEXAMPLE00000000000000` (seed default) |

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Cloud Build `gcloud run deploy` permission denied | Grant `roles/run.admin` + `roles/iam.serviceAccountUser` to Cloud Build SA on `mikasa-load-management` |
| Web cannot call API (403) | Grant web runtime SA `roles/run.invoker` on API service, or use dev auth headers |
| SQL stopped (night schedule) | Run sql schedule start job or wait for weekday 08:00 JST |
| Migrate job fails | Check VPC connector, DATABASE_URL secret, job logs in Cloud Console |
| `gcloud auth` expired | `gcloud auth login` and re-run apply |

## Related docs

- [google-cloud/terraform/live/README.md](../google-cloud/terraform/live/README.md)
- [google-cloud/cloudbuild/README.md](../google-cloud/cloudbuild/README.md)
- [docs/issues/mikasa/3/github-cd-checklist.md](../issues/mikasa/3/github-cd-checklist.md)
- Issue workflow: `docs/issues/mikasa/3/`
