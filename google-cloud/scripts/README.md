# `google-cloud/scripts`

| Script | Purpose |
|--------|---------|
| [`setup-github-actions-wif.sh`](setup-github-actions-wif.sh) | **Primary** — WIF + least-privilege IAM for GitHub Actions CD (`mikasa-load-management`). Edit CONFIG, then `--dry-run` → apply. |
| `issue-24-*`, `issue-28-*` | One-off migrations / Secret Manager hygiene (not part of routine CD). |
| `load-env.sh` | Local env helpers. |

**After merging a PR that changes `serviceAccount` in cloudbuild YAML:** project Owner must run `setup-github-actions-wif.sh` before CD can succeed (see [`../cloudbuild/GITHUB_ACTIONS_WIF.md`](../cloudbuild/GITHUB_ACTIONS_WIF.md)).
