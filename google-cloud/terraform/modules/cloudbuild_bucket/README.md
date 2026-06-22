# cloudbuild_bucket

Manages **Object Lifecycle** on GCP’s default Cloud Build staging bucket `gs://{project_id}_cloudbuild`.

Cloud Build uploads submitted source to `source/` on each `gcloud builds submit`. GCP does **not** delete these objects automatically.

## Lifecycle rule

- **Prefix:** `source/`
- **Action:** Delete when object age ≥ **7 days**

Builds only need staging source for minutes; a 7-day window is safe for normal CI.

## First-time apply (existing bucket)

The bucket is usually created by Cloud Build before Terraform manages it. **Import** once per project:

```bash
cd google-cloud/terraform/live/bootstrap
terraform import \
  'module.cloudbuild_bucket.google_storage_bucket.cloudbuild_staging' \
  veho-kumu_cloudbuild
```

Then `terraform plan` / `apply`. Expect the plan to add `lifecycle_rule` only; other bucket settings are ignored via `lifecycle.ignore_changes`.

Verify in Console: bucket → **Lifecycle** → Delete, prefix `source/`, age 7 days.

## Variables

| Variable | Description |
|----------|-------------|
| `project_id` | Build project ID |
