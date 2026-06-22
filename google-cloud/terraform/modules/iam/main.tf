# Optional project-level IAM for Google Groups / SAs (internal wiki §5). Keep empty if managed elsewhere.

resource "google_project_iam_member" "extra" {
  for_each = local.project_iam_members_resolved

  project = var.project_id
  role    = each.value.role
  member  = each.value.member

  dynamic "condition" {
    for_each = each.value.condition != null ? [each.value.condition] : []
    content {
      title       = condition.value.title
      expression  = condition.value.expression
      description = try(condition.value.description, null)
    }
  }
}

# GCP project label `tier` — always set from resource_tier on apply (overwrites prior value).
# One-time per app stack state: terraform import 'google_project.wiki_labels' PROJECT_ID
# Shared project: each env apply may update the label; last apply wins (same resource_tier → no drift).

moved {
  from = google_project.wiki_labels[0]
  to   = google_project.wiki_labels
}

locals {
  tier_label = replace(lower(trimspace(var.resource_tier)), "_", "-")
}

resource "google_project" "wiki_labels" {
  project_id = var.project_id
  name       = var.project_display_name != "" ? var.project_display_name : var.project_id

  labels = {
    tier = local.tier_label
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      billing_account,
      org_id,
      folder_id,
    ]
  }
}
