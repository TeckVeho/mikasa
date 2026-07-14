# Issue #3 — dev log

**Issue:** [ops: Initial GCP setup (dev)](https://github.com/TeckVeho/mikasa/issues/3)  
**Infra PR:** [#6](https://github.com/TeckVeho/mikasa/pull/6) — merged to `main` (2026-07-09)  
**CD branch:** `develop` — pushed to origin (2026-07-09)

## Summary

Adapted LogiVoice GCP template for mikasa dev in project **`mikasa-load-management`**: Terraform `enable_worker` toggle, mikasa naming in tfvars / Terragrunt / Cloud Build / WIF, runbook.

## Completed

| Step | Status |
|------|--------|
| Rename `mikasa-lm-dev` → `mikasa-load-management` | Done (PR #6) |
| Issue #3 updated on GitHub (chị Vững) | Done |
| PR #6 merged to `main` | Done |
| Branch `develop` pushed | Done |
| Local `terraform.tfvars` copied (gitignored) | Done |
| `gcloud config set project mikasa-load-management` | Done |

## Blocked — billing not enabled

GCP project **`mikasa-load-management`** exists but **`billingEnabled: false`**.

- **Bootstrap `terragrunt apply`:** failed — Artifact Registry / Cloud Build APIs require billing
- **WIF script:** partial (IAM APIs enabled); failed at Cloud Build API enable
- **GitHub secrets:** not set — WIF pool/SA not fully created
- **Cloud Run / migrate / smoke:** not started

**Action required:** Billing admin links a billing account, then re-run runbook sections 2–6.

```bash
gcloud billing projects link mikasa-load-management --billing-account=BILLING_ACCOUNT_ID
```

## Pending after billing

1. `terragrunt apply` — bootstrap → dev/network → build images → dev/app
2. Secret Manager — Firebase keys (`mikasa-firebase-private-key-dev`, `mikasa-firebase-client-email-dev`)
3. `./google-cloud/scripts/setup-github-actions-wif.sh`
4. GitHub Environment `develop` secrets/vars — [`github-cd-checklist.md`](github-cd-checklist.md)
5. Migrate job + smoke (`/health`, `/dashboard`)
6. Verify `cd-gcp.yml` green on `develop`

## Smoke (pending GCP)

- [ ] `GET /health` on `mikasa-load-management-api-dev`
- [ ] `/dashboard` on Web with dev auth bypass
- [ ] `cd-gcp.yml` green on push to `develop`

## Notes

- npm scope remains `@logivoice/*` (out of scope)
- AR image names: `mikasa-api`, `mikasa-web`
- Dev web: `allow_unauthenticated_web = true` in tfvars example
