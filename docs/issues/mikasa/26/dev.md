# Dev log — Issue #26

**Issue:** https://github.com/TeckVeho/mikasa/issues/26

## Pre-apply audit

```bash
gcloud projects describe mikasa-load-management --format="yaml(labels)"
# labels:
#   tier: tier3   (already present before PR)
```

State: `module.app_compose.module.iam.google_project.wiki_labels` **already imported** in `app/dev` — no import needed.

## Code change

[`google-cloud/terraform/modules/iam/main.tf`](../../google-cloud/terraform/modules/iam/main.tf): `deletion_policy = "ABANDON"` on `google_project.wiki_labels` (`prevent_destroy` pre-existing).

## Dev stack apply

Auth: `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)` (worktree `terragrunt init -upgrade` failed: git `$GIT_DIR too big`; applied from main repo cache with same module patch).

```bash
cd google-cloud/terraform/live/dev/app
terragrunt plan -no-color
```

**Fax gate:** no destroy `google_project*` — only `~ update in-place` on `wiki_labels`:

```
~ deletion_policy = "DELETE" -> "ABANDON"
~ name = "Veho Mikasa" -> "mikasa-load-management"  (cosmetic)
labels.tier = tier3 (unchanged)
```

Full plan also wanted secret version replace — used targeted apply:

```bash
terragrunt apply -target='module.app_compose.module.iam.google_project.wiki_labels' -auto-approve
```

Post-apply:

```bash
gcloud projects describe mikasa-load-management --format="yaml(labels)"
# tier: tier3
```

## Fax incident runbook

Ref: [fax-logistics-mvp/infra/TERRAFORM_AND_CD.md](https://github.com/TeckVeho/fax-logistics-mvp/blob/develop/infra/TERRAFORM_AND_CD.md)

1. Always `terragrunt plan` — **stop** if destroy `google_project*`
2. Never remove `wiki_labels` from code without `terraform state rm` + SRE review
3. `prevent_destroy` + `ABANDON` on `wiki_labels` after this PR

## Stg/prod runbook (when bootstrap)

Stacks `live/stg/app`, `live/prod/app` have **no GCS state** yet.

1. `project_id = "mikasa-load-management"`, `resource_tier = "tier3"` in tfvars
2. `terragrunt import 'module.app_compose.module.iam.google_project.wiki_labels' mikasa-load-management`
3. Plan gate → `terragrunt apply -target='module.app_compose.module.iam.google_project.wiki_labels'`

Single project: label `tier` shared across dev/stg/prod (same as `dx-driveelink`).
