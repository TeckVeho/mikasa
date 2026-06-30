# Cloud Build configs

YAML files in this directory build Docker images and deploy Cloud Run services. The combined `cloudbuild.{dev|prod}.yaml` files also run the **migrate job** and deploy the **worker**. Substitutions **`_AR_PROJECT_ID`** and **`_DEPLOY_PROJECT_ID`** separate Artifact Registry (common project) from the app project. Empty substitutions fall back to the project where Cloud Build executes.

## Dockerfiles (npm workspaces)

Always run `gcloud builds submit` from **`LogiVoice/`** (monorepo root with `package-lock.json`, `apps/`, `packages/`). Pass configs under **`google-cloud/cloudbuild/`**, e.g. `--config=google-cloud/cloudbuild/cloudbuild.dev.yaml`.

| Image | Dockerfile | Notes |
|-------|------------|--------|
| API + migrate job | [`apps/api/Dockerfile`](../../apps/api/Dockerfile) | Prisma migrate cwd: **`/app/apps/api`** — must match [`migrate_job.tf`](../terraform/modules/cloud_run/migrate_job.tf). |
| Web | [`apps/web/Dockerfile`](../../apps/web/Dockerfile) | Next.js `standalone` ([`next.config.ts`](../../apps/web/next.config.ts)). Pass **`NEXT_PUBLIC_FIREBASE_*`** as Docker build-args so the client bundle is baked at `next build`. |
| Worker | [`apps/worker/Dockerfile`](../../apps/worker/Dockerfile) | Generates Prisma client from `apps/api/prisma` at build time. |

## GitHub Actions — selective deploy (`cd-gcp.yml`)

The workflow runs **`dorny/paths-filter`** on **`develop`**, **`staging`**, and **`production`**:

| Changed paths | What runs |
|----------------|-----------|
| `packages/shared/**`, root `package-lock.json`/`turbo`/`tsconfig.base.json`, `google-cloud/cloudbuild/**`, `.github/workflows/**`, `apps/*/Dockerfile` | Treated as **full stack** → three **parallel** Cloud Build submits (`*-api.yaml`, `*-web.yaml`, `*-worker.yaml`). |
| Only `apps/api/**` | `cloudbuild.*.api.yaml` (API image + `gcloud run jobs` migrate deploy/execute + API deploy). |
| Only `apps/web/**` | `cloudbuild.*.web.yaml`. |
| Only `apps/worker/**` | `cloudbuild.*.worker.yaml`. |
| All of `apps/api/**`, `apps/web/**`, and `apps/worker/**` in one push | Same as full stack — three parallel submits. |
| Nothing matched in deploy scope | **No** Cloud Build submit (cost saver). |

**Manual `workflow_dispatch`:** set `deploy_scope` to **`all`** (parallel api + web + worker), **`auto`** (table above), or force **`api` / `web` / `worker`**.

**Combined configs:** `cloudbuild.dev.yaml` / `cloudbuild.prod.yaml` remain for manual `gcloud builds submit` or GCP Console triggers; GitHub Actions always uses the split YAMLs for parallelism.

## Branch triggers (example)

Create one trigger per branch (or use regex). Set substitutions per environment.

| Branch (example) | Config file | Typical substitutions |
|------------------|-------------|------------------------|
| `develop` | `cloudbuild.dev.yaml` | `_AR_PROJECT_ID=<common-project>`, `_DEPLOY_PROJECT_ID=<dev-project>`, `_TAG=dev`, `_NEXT_PUBLIC_*` (API/base URLs + **`_NEXT_PUBLIC_FIREBASE_*`** for the web image build) |
| `staging` | reuse `cloudbuild.dev*.yaml` with `_TAG=stage` | `_DEPLOY_PROJECT_ID` → staging app |
| `production` | `cloudbuild.prod.yaml` | `_AR_PROJECT_ID`, `_DEPLOY_PROJECT_ID`, `_TAG=prod`, `_NEXT_PUBLIC_*`, optional `_WORKER_SERVICE_NAME` if not default |

**IAM — Cloud Build execution SA**

The execution SA (`…@cloudbuild.gserviceaccount.com` or default compute SA) needs:

- **`roles/storage.objectAdmin`** — read staged source (`gs://…_cloudbuild`).

**Staging bucket cleanup** — Each submit stores a tarball under `gs://PROJECT_ID_cloudbuild/source/`. GCP does not remove them automatically. Bootstrap Terraform ([`../terraform/environments/bootstrap`](../terraform/environments/bootstrap)) can set a GCS lifecycle rule (default: delete `source/` objects after **7 days**).
- **`roles/artifactregistry.writer`** on the Artifact Registry host project (see `additional_artifact_registry_writer_members` in [`../terraform/environments/bootstrap`](../terraform/environments/bootstrap)).
- **`roles/logging.logWriter`** — full step logs.
- **`roles/run.admin`** + **`roles/iam.serviceAccountUser`** on **`_DEPLOY_PROJECT_ID`** (app project) so `gcloud run jobs deploy` / `gcloud run deploy` succeed.

See Cloud Build → Settings, and [`GITHUB_ACTIONS_WIF.md`](GITHUB_ACTIONS_WIF.md) step 6.

**Split configs:** `*-api.yaml`, `*-web.yaml`, and `*-worker.yaml` build and deploy one component each (`*-api` includes the migrate job). `_WORKER_SERVICE_NAME` must match Terraform. GCP Console triggers can narrow with `includedFiles` / `ignoredFiles` (e.g. only `apps/web/**` → `*-web.yaml`).

## Cloud Build substitution syntax

Use only user-defined substitutions (`${_TAG}`, `${_AR_PROJECT_ID}`, …). Avoid bash-only `$FOO` placeholders in YAML that Cloud Build’s template validator does not recognise.
