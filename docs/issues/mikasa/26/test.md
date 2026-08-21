# Test evidence — Issue #26

## Terraform / GCP

| Check | Result |
|-------|--------|
| Pre-audit `labels.tier` | **tier3** (already on project) |
| `wiki_labels` in dev state | Already imported |
| Plan fax gate | No destroy `google_project`; `wiki_labels` update in-place (`ABANDON`) |
| Targeted apply | `module.app_compose.module.iam.google_project.wiki_labels` |
| Post-apply labels | `tier: tier3` |

## Dev domain smoke

| Step | URL | Status |
|------|-----|--------|
| API health | `GET https://mikasa-api.vw-dev.com/health` | **200** |
| Web login | `GET https://mikasa.vw-dev.com/login` | **200** |

## CI (PR)

| Job | Result |
|-----|--------|
| ci-test | (pending → update after merge gate) |
| ci-e2e | (pending) |
| pr-policy-check | (pending) |
