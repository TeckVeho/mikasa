# GitHub Actions — Workload Identity Federation (GCP)

This guide explains how to create **`GCP_WORKLOAD_IDENTITY_PROVIDER`** and related resources so [`.github/workflows/cd-gcp.yml`](../../.github/workflows/cd-gcp.yml) can authenticate to Google Cloud **without** a long-lived JSON key.

**Quick setup (single project `mikasa-lm-dev`):** run [`../scripts/setup-github-actions-wif.sh`](../scripts/setup-github-actions-wif.sh) from a shell with `gcloud` authenticated as project admin. Use `--dry-run` to preview commands.

## What you are creating

| Item | Purpose |
|------|---------|
| **Workload identity pool** | Container for external identities (here: GitHub OIDC). |
| **OIDC provider** | Trusts GitHub’s issuer `https://token.actions.githubusercontent.com` and maps token claims to GCP attributes. |
| **`GCP_WORKLOAD_IDENTITY_PROVIDER`** | The provider’s **full resource name**, e.g. `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`. Paste this into GitHub Environment **secret** `GCP_WORKLOAD_IDENTITY_PROVIDER`. |
| **Service account** | The GCP identity that GitHub Actions **impersonates** after token exchange. |
| **`roles/iam.workloadIdentityUser`** | Allows the GitHub **principal** (this repo only, if configured that way) to use that service account. |

## Prerequisites

- GCP project with billing enabled (if required by your org).
- APIs enabled (enable if prompted): **IAM**, **IAM Credentials**, **Security Token Service** (often enabled automatically with Workload Identity Federation).
- Your GitHub repo in the form `OWNER/REPO` (this document uses **`TeckVeho/mikasa`** as an example).
- `gcloud` CLI authenticated as a user with permission to create pools, providers, and service accounts (`roles/owner` or equivalent).

Set shell variables (adjust IDs to match your naming):

```bash
export PROJECT_ID="your-gcp-project-id"
export PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
```

---

## Step 1 — Create a workload identity pool

```bash
gcloud iam workload-identity-pools create "${POOL_ID}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions"
```

---

## Step 2 — Create the OIDC provider (GitHub)

GitHub Actions requires an **OIDC** provider. For GitHub, Google **requires** an **`attribute-condition`** that references claims from the GitHub token (for example, restrict to a single repository).

**Example: allow only the repository `TeckVeho/mikasa`:**

```bash
gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_ID}" \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == 'TeckVeho/mikasa'"
```

To restrict by **organization** instead, use something like:

`--attribute-condition="assertion.repository_owner == 'YOUR_ORG'"`

Do **not** leave out `attribute-condition` for GitHub; the API may return `INVALID_ARGUMENT` about attribute conditions.

Optional: leave **JWK** empty in the Console (GitHub’s issuer is public).

---

## Step 3 — Obtain `GCP_WORKLOAD_IDENTITY_PROVIDER`

Print the provider’s full resource name and copy it **exactly** (no extra spaces or quotes):

```bash
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"
```

Example output:

```text
projects/739321310569/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

That string is the value for **`GCP_WORKLOAD_IDENTITY_PROVIDER`** in GitHub **Settings → Environments → [environment] → Secrets** (the workflow reads WIF, project ID, and service account email from **secrets**, not variables).

---

## Step 4 — Create a dedicated service account (if you do not have one)

```bash
export SA_ID="github-actions-mikasa"

gcloud iam service-accounts create "${SA_ID}" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Mikasa"
```

Set the email:

```bash
export SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
```

**If you already have a service account** (recommended: reuse it), you do **not** need to create one in Step 4. Set `SA_EMAIL` to that account’s email (same value you will store in GitHub secret `GCP_SERVICE_ACCOUNT`). To list service accounts in the project:

```bash
gcloud iam service-accounts list --project="${PROJECT_ID}" \
  --format="table(email,displayName)"
```

Or in the [Google Cloud Console → IAM & Admin → Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), open the account and copy **Email**.

---

## Step 5 — Allow this GitHub repo to impersonate the service account

Bind **`roles/iam.workloadIdentityUser`** on the **service account** so the workload identity **principal** for your repo can assume it.

For **`TeckVeho/mikasa`** and pool `github-pool`:

```bash
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/TeckVeho/mikasa"
```

If you used a different `OWNER/REPO`, replace `TeckVeho/mikasa` in both the **attribute-condition** (Step 2) and this **`member`** path.

---

## Step 6 — Grant the service account permissions to run Cloud Build

The same service account must be allowed to submit builds, upload sources, and push images. **Local `gcloud builds submit` uses your user identity**; **GitHub Actions uses only this service account**, so it needs explicit roles even if builds work on your laptop.

Enable APIs (once per project, if not already):

```bash
gcloud services enable cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  serviceusage.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="${PROJECT_ID}"
```

Project-level roles (adjust to your org’s least-privilege policy):

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"
```

**Cloud Build staging bucket (`*_cloudbuild`).** `gcloud builds submit` uploads the source code to a GCS bucket (default `gs://[PROJECT_ID]_cloudbuild`) before building it. If this bucket doesn't exist yet, Cloud Build needs permission to create it. To avoid the *forbidden from accessing the bucket* or *serviceusage.services.use* errors, grant **Storage Admin** at the project level:

**Source cleanup** — GCP does not delete objects under `source/` automatically. Bootstrap Terraform sets a GCS lifecycle rule (default: delete after 7 days). Import the existing bucket once: see [`../terraform/environments/bootstrap/README.md`](../terraform/environments/bootstrap/README.md).

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

*(Note: If you have strict company security policies, you can pre-create the bucket manually and grant `roles/storage.objectAdmin` explicitly on that bucket instead, but for most setups, project-level Storage Admin is required so it can auto-create the staging bucket.)*

**Cloud Build execution service account — read source + push images.**
GCP recently changed the default execution SA for Cloud Build. Depending on your project
configuration it can be one of:

| SA | When used |
|----|-----------|
| `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` | Legacy Cloud Build service account (older projects) |
| `PROJECT_NUMBER-compute@developer.gserviceaccount.com` | Compute Engine default SA (newer projects / default since 2024) |

Check which one your project uses: **Cloud Build → Settings** in Console, or
`gcloud builds describe <any-build-id> --project=ID --format='value(serviceAccount)'`.

The execution SA needs to **read source from the staging bucket** and **push images to Artifact Registry**.
If it lacks `storage.objects.get` on `gs://PROJECT_ID_cloudbuild`, the build fails with
`403: …-compute@developer.gserviceaccount.com does not have storage.objects.get access`.

```bash
# Determine which execution SA your project uses (pick one):
export CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
# or:
export CLOUDBUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Storage: read/write the _cloudbuild staging bucket
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/storage.objectAdmin"

# Artifact Registry: push images
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.writer"

# Cloud Logging: stream build step logs (otherwise you see INFO about Logs Writer)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/logging.logWriter"
```

**Cloud Run / Cloud Run Jobs — deploy permissions (often a second project).**

If [`cloudbuild.dev.yaml`](cloudbuild.dev.yaml) (or prod) runs `gcloud run jobs deploy` and `gcloud run deploy` with `--project ${_DEPLOY_PROJECT_ID}`, that **`--project` is the app project** (e.g. `logivoice-dev`), which is **not** always the same as the project where `gcloud builds submit` runs (e.g. `logivoice-common` when `GCP_PROJECT_ID` is the common/build project).

| Where IAM is needed | Typical project | Roles (on the **execution SA** `CLOUDBUILD_SA`) |
|---------------------|-----------------|-----------------------------------------------|
| Upload source, Docker push, build logs | **Build** project (`GCP_PROJECT_ID` / `gcloud builds submit --project`) | `storage.objectAdmin`, `artifactregistry.writer`, `logging.logWriter` (see blocks above) |
| `gcloud run … --project=APP` | **App / deploy** project (`_DEPLOY_PROJECT_ID`, e.g. `logivoice-dev`) | **`roles/run.admin`** and **`roles/iam.serviceAccountUser`** |

**Do not confuse the two:** granting **`roles/logging.logWriter`** (or storage / Artifact Registry) only on the **build** project fixes upload, image push, and log streaming — it does **not** grant permission to create or update Cloud Run **resources in another project**. If the build fails at a step like `gcloud run jobs deploy … --project logivoice-dev`, you must add **`run.admin`** (and **`iam.serviceAccountUser`**) for **`CLOUDBUILD_SA`** on **`logivoice-dev`** (or whatever `_DEPLOY_PROJECT_ID` is), even if IAM on the build project is already correct.

**Single project:** build and deploy use the same GCP project — use `"${PROJECT_ID}"` for all bindings above.

**Cross-project** (shared registry + app in another project):

1. Set `CLOUDBUILD_SA` to the execution SA of the **build** project (same as in the table at the start of this section), e.g. `BUILD_PROJECT_NUMBER-compute@developer.gserviceaccount.com`.
2. Run the following on the **deploy** project (replace `logivoice-dev` with your `GCP_DEPLOY_PROJECT_ID` / `_DEPLOY_PROJECT_ID`).

```bash
# Execution SA from the project where Cloud Build runs (see Cloud Build → Settings or any build’s serviceAccount field)
export CLOUDBUILD_SA="${BUILD_PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
# or: export CLOUDBUILD_SA="${BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

export DEPLOY_PROJECT_ID="dx-logivoice-dev"   # must match GitHub var GCP_DEPLOY_PROJECT_ID / Cloud Build _DEPLOY_PROJECT_ID

gcloud projects add-iam-policy-binding "${DEPLOY_PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${DEPLOY_PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

**Concrete example** (build in `logivoice-common`, deploy to `logivoice-dev`): `BUILD_PROJECT_NUMBER` is the numeric ID of `logivoice-common` (shown in Console or `gcloud projects describe logivoice-common --format='value(projectNumber)'`). The member is `208940635170-compute@developer.gserviceaccount.com` when that number is `logivoice-common`’s project number — bind **`run.admin`** and **`iam.serviceAccountUser`** on **`logivoice-dev`**, not only roles on `logivoice-common`.

### Shared Artifact Registry (common project) and deploy to another project

If images are stored in a **common** GCP project but builds run elsewhere (see [`README.md`](README.md) and [`scripts/gcp/README.md`](../scripts/gcp/README.md) for `_AR_PROJECT_ID` / `_DEPLOY_PROJECT_ID`):

1. **Push to Artifact Registry in `common`**  
   Grant **`roles/artifactregistry.writer`** on the **repository** in the common project (not only on the build project) to the **Cloud Build execution SA of the project where `gcloud builds submit` runs** — either `BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com` (legacy) or `BUILD_PROJECT_NUMBER-compute@developer.gserviceaccount.com` (newer projects). Manage this in Terraform via `additional_artifact_registry_writer_members` in [`../terraform/environments/bootstrap`](../terraform/environments/bootstrap).

2. **Deploy Cloud Run in dev / stg / prod**  
   If Cloud Build runs in project A but `gcloud run deploy --project` targets project B, grant the **same** Cloud Build SA from (1) **`roles/run.admin`** and **`roles/iam.serviceAccountUser`** (for the Cloud Run runtime service account) on **project B**.

3. **GitHub Actions workflow**  
   [`.github/workflows/cd-gcp.yml`](../.github/workflows/cd-gcp.yml) passes `_TAG`, optional `_NEXT_PUBLIC_*`, and **`_AR_PROJECT_ID` / `_DEPLOY_PROJECT_ID`** from Environment variables **`GCP_AR_PROJECT_ID`** / **`GCP_DEPLOY_PROJECT_ID`**. Leave those two unset (or empty) for single-project builds; set them for a shared registry + cross-project deploy.

The federated **`GCP_SERVICE_ACCOUNT`** still needs **`roles/cloudbuild.builds.editor`** (and related Step 6 roles) on **`GCP_PROJECT_ID`** so it can **submit** builds; image push and deploy permissions are primarily on the **Cloud Build** service account as above.

---

## Where to find `GCP_PROJECT_ID` and `GCP_SERVICE_ACCOUNT` (for GitHub)

Use the **same** `PROJECT_ID` and `SA_EMAIL` in GitHub Environment secrets as in the commands above.

| Value | Where to get it |
|-------|-----------------|
| **`GCP_PROJECT_ID`** | GCP Console project picker (project **ID**, not necessarily the display name). Or: `gcloud projects describe "${PROJECT_ID}" --format='value(projectId)'`. |
| **`GCP_SERVICE_ACCOUNT`** | The full service account **email** `something@PROJECT_ID.iam.gserviceaccount.com`. From Step 4 / list command above, or **GitHub → Settings → Environments → [env] → Secrets** if you stored it already (GitHub does not show the value again after save — use GCP Console / `gcloud` if you forgot). |

The workload identity provider string (**`GCP_WORKLOAD_IDENTITY_PROVIDER`**) comes from Step 3.

---

## Step 7 — Configure GitHub

1. Create **Environments** (for example `develop`, `staging`, `production`) if you use [environment-scoped secrets and variables](../.github/workflows/cd-gcp.yml).
2. In each environment, under **Secrets**, set:
   - **`GCP_WORKLOAD_IDENTITY_PROVIDER`** — string from Step 3.
   - **`GCP_SERVICE_ACCOUNT`** — `SA_EMAIL` (existing account or from Step 4); must match the IAM bindings in Steps 5–6.
   - **`GCP_PROJECT_ID`** — your `PROJECT_ID`.
3. Under **Variables** (not secrets), set:
   - **`GCP_NEXT_PUBLIC_API_URL`** / **`GCP_NEXT_PUBLIC_BASE_URL`** — required for **full** and **frontend** workflow modes (see comments in `cloudbuild.dev.yaml` / `cloudbuild.prod.yaml`). `GCP_NEXT_PUBLIC_API_URL` must be the API origin only (e.g. `https://logivoice-api.example.com`), **not** `.../api/v1` — the web app appends `/v1/...` paths itself.
   - **`GCP_NEXT_PUBLIC_FIREBASE_API_KEY`**, **`GCP_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`**, **`GCP_NEXT_PUBLIC_FIREBASE_PROJECT_ID`** — Firebase Web アプリ設定（Console の「ウェブアプリ」）に合わせる。**full / web-only** で Cloud Build の `_NEXT_PUBLIC_FIREBASE_*` に渡され、Docker build で bake されます（ログインが「Firebase が設定されていません」のときは未設定または古いイメージの可能性）。
   - Optional: **`GCP_IMAGE_TAG`** — overrides default tag per branch (`dev` / `stage` / `prod` for `develop` / `staging` / `production`).
   - Optional: **`GCP_AR_PROJECT_ID`** / **`GCP_DEPLOY_PROJECT_ID`** — map to Cloud Build substitutions `_AR_PROJECT_ID` / `_DEPLOY_PROJECT_ID` (common Artifact Registry project and Cloud Run deploy project; see **Shared Artifact Registry** above). Omit for single-project layout.
   - Optional: **`GCP_WORKER_SERVICE_NAME`** — sets Cloud Build `_WORKER_SERVICE_NAME` if your Cloud Run worker id differs from the YAML defaults (`logivoice-worker-dev` / `logivoice-worker-prod`).

The workflow uses **`google-github-actions/auth@v2`** with `workload_identity_provider` and `service_account`; it also requires:

```yaml
permissions:
  id-token: write
  contents: read
```

(already set in `cd-gcp.yml`.)

---

## Which branch / mode (workflow)

The workflow runs on **push** to **`develop`**, **`staging`**, or **`production`**, or on **workflow_dispatch** from those branches.

- Environment name matches **`github.ref_name`** (same as the branch).

**`workflow_dispatch` → `deploy_scope`:**

| Value | Behaviour |
|-------|-----------|
| `auto` | Path-based submits only (`cd-gcp.yml` + paths-filter); see GitHub Actions section in [`README.md`](README.md). |
| `all` | Three parallel submits: `*-api.yaml` (includes migrate), `*-web.yaml`, `*-worker.yaml`. |
| `api` / `web` / `worker` | Submit only that component’s YAML (`*-api.yaml` runs migrate too). |

Other branches / scopes do not submit (push still runs `plan` but may **skip** with a notice).

---

## Console alternative

You can create the pool and OIDC provider in **IAM & Admin → Workload Identity Federation**. Use the same **issuer URL**, **attribute mapping**, and **attribute condition** as in Step 2, then copy the provider **Resource name** from the provider details page — it matches the format from Step 3.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| *The user is forbidden from accessing the bucket [...]_cloudbuild* | Step 6: **`roles/storage.admin`** on the project for `SA_EMAIL` (the federated SA that **uploads** source). |
| `…-compute@developer.gserviceaccount.com does not have storage.objects.get` | The **Cloud Build execution SA** (not the federated SA) cannot read uploaded source from `_cloudbuild` bucket. Grant **`roles/storage.objectAdmin`** to the execution SA — see "Cloud Build execution service account" in Step 6. |
| *does not have permission to write logs to Cloud Logging* / *Logs Writer* | Grant **`roles/logging.logWriter`** on the **build** project to the Cloud Build execution SA (Step 6). Often appears as **`1 message(s) issued`** — that alone does not fail the build; check the next line for **`BUILD FAILURE`**. |
| `BUILD FAILURE` on a **`cloud-sdk`** step (`gcloud run jobs deploy` / `gcloud run deploy`), often step 4 | Open that step’s logs in Console. If **`_DEPLOY_PROJECT_ID`** is another project (e.g. `logivoice-dev`), grant **`roles/run.admin`** and **`roles/iam.serviceAccountUser`** to the **build project’s execution SA** on **that deploy project** — see **Cloud Run / Cloud Run Jobs — deploy permissions** in Step 6. Fixing only storage/logging on the **build** project does not fix this. |
| *caller does not have permission to act as service account* | Step 6: **`roles/iam.serviceAccountUser`** on the project for `SA_EMAIL`. Cloud Build requires this to use the default execution service account. |
| *serviceusage.services.use* / Service Usage | Step 6: **`roles/serviceusage.serviceUsageConsumer`** on the project for `SA_EMAIL`. |
| Works locally but fails in GitHub Actions | Local CLI uses **your user**; CI uses **only** the service account — IAM must be granted to **`GCP_SERVICE_ACCOUNT`**, not only to your account. |
| Push denied to `...-docker.pkg.dev/<common-project>/...` | Grant **`roles/artifactregistry.writer`** on that **repository** to the **execution SA** for the project where the build runs (see **Shared Artifact Registry** above). |
| Auth fails before `gcloud builds submit` | Step 5 (WIF binding) and GitHub secret **`GCP_WORKLOAD_IDENTITY_PROVIDER`**; repo in `attribute-condition` must match. |
| `NOT_FOUND: Requested entity was not found` right after uploading to `gs://…_cloudbuild/source/…` | Usually **`GCP_PROJECT_ID` is wrong** (typo, or **display name** instead of **project ID**). Confirm in Console project picker. Also ensure **`cloudbuild.googleapis.com`** is enabled on that project. The federated SA must have Step 6 roles **on the same project** as `GCP_PROJECT_ID` (the project passed to `gcloud builds submit --project`). |
| `Cloud Resource Manager API has not been used…` / `SERVICE_DISABLED` when running `gcloud projects describe` | Enable **`cloudresourcemanager.googleapis.com`** on that project (see Step 6 `gcloud services enable` list). The workflow’s pre-submit check uses **`gcloud builds list`** instead so CI does not require CRM API. |

---

## References

- [Configure Workload Identity Federation with deployment pipelines (GitHub)](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [Google GitHub Actions auth — security considerations](https://github.com/google-github-actions/auth/blob/main/docs/SECURITY_CONSIDERATIONS.md)
