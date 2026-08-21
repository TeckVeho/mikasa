# Plan — Issue #26

1. Worktree `mikasa-issue-26`, branch `26-ops-gcp-tier-label`
2. Add `deletion_policy = ABANDON` to `modules/iam/main.tf`
3. Dev stack: init → import if missing → plan gate → targeted apply `wiki_labels`
4. Document stg/prod runbook + fax ref in `dev.md`
5. PR `Closes #26` → CI → dev smoke → Kido gate → merge
