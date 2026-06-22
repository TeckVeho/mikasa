# Bootstrap — Terraform state + Artifact Registry + Cloud Build source cleanup

State is **local** for this stack only. After apply, configure remote backend on env stacks to use `terraform_state_bucket_name`.

```bash
cd google-cloud/terraform/live/bootstrap
cp ../../environments/bootstrap/terraform.tfvars.example ../../environments/bootstrap/terraform.tfvars
terragrunt apply
```

## Artifact Registry cleanup

Bootstrap manages Docker repo `{project_id}-docker` (same project as dev/stg/prod) with cleanup policies (keep recent, delete old untagged, optional tag prefix KEEP). Configure via `artifact_cleanup_*` in `terraform.tfvars`.

## Cloud Build staging bucket (`{project_id}_cloudbuild`)

`gcloud builds submit` uploads source to `gs://{project_id}_cloudbuild/source/`. GCP does **not** delete these automatically.

Bootstrap applies a GCS **lifecycle rule**: delete objects under `source/` older than **7 days**.

### First apply when the bucket already exists

Import the bucket once (created by Cloud Build on first submit), then apply:

```bash
cd google-cloud/terraform/live/bootstrap
terraform import \
  'module.cloudbuild_bucket.google_storage_bucket.cloudbuild_staging' \
  veho-kumu_cloudbuild
```

See [`../../modules/cloudbuild_bucket/README.md`](../../modules/cloudbuild_bucket/README.md).

## Rename Terraform state bucket (e.g. `dx-kumu-common-terraform-state` → `veho-kumu-terraform-state`)

Changing `state_bucket_name` makes Terraform **destroy** the old bucket and create a new one. The old bucket cannot be deleted while it still holds state objects and `force_destroy = false`.

1. Copy objects to the new bucket (create the destination bucket manually if it does not exist yet):

```bash
gsutil mb -l asia-northeast1 -b on gs://veho-kumu-terraform-state
gsutil -m cp -r gs://dx-kumu-common-terraform-state/** gs://veho-kumu-terraform-state/
```

2. Remove the old bucket from bootstrap state **without** destroying it in GCP:

```bash
cd google-cloud/terraform/live/bootstrap
terragrunt state rm google_storage_bucket.terraform_state
```

3. Apply again — Terraform creates/manages `veho-kumu-terraform-state` only; the old bucket remains until you delete it manually after verifying remote stacks work.

4. Re-init env stacks if they still point at the old bucket (this repo uses `veho-kumu-terraform-state` in `live/*/terragrunt.hcl`).
