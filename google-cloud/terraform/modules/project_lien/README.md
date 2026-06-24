# project_lien

Attaches a [Resource Manager lien](https://cloud.google.com/resource-manager/docs/project-liens) on a GCP project to block deletion.

## Usage

```hcl
module "project_lien" {
  source = "../../modules/project_lien"

  project_id = var.project_id
  enable     = var.enable_project_delete_lien
  origin     = var.project_delete_lien_origin
  reason     = var.project_delete_lien_reason
}
```

## Decommission

Set `enable = false` and apply, or delete manually:

```bash
gcloud alpha resource-manager liens delete LIEN_NAME --project=PROJECT_ID
```
