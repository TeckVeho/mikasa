# Issue #26 — GCP tier label verify/sync

| Field | Value |
|-------|--------|
| **URL** | https://github.com/TeckVeho/mikasa/issues/26 |
| **SP** | 2 (`sp:2`) |
| **Labels** | ops |

## Context / Codebase Paths

```yaml
repository: TeckVeho/mikasa
repo: mikasa
issue_url: https://github.com/TeckVeho/mikasa/issues/26
terraform_path: ./google-cloud/terraform
live_dev_app: ./google-cloud/terraform/live/dev/app
workspace_root: .
```

## Summary

Verify/sync GCP label **`tier=tier3`** on **`mikasa-load-management`** via `module.app_compose.module.iam.google_project.wiki_labels`. Add fax-safe `deletion_policy = ABANDON`.

## Acceptance criteria

- Console `labels.tier=tier3`
- Plan: no destroy `google_project`
- `wiki_labels`: `prevent_destroy` + `deletion_policy = ABANDON`
- `docs/issues/mikasa/26/dev.md` with plan snippet + fax runbook
