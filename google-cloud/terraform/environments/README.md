# Environments Inputs (Terragrunt Mode)

`environments/` now stores shared Terraform roots and per-environment tfvars inputs.

Terragrunt execution happens from `google-cloud/terraform/live/*`.

## Directory model

```text
environments/
├── _shared/
│   ├── app/      # shared Terraform root for app stack
│   └── network/  # shared Terraform root for network stack
├── dev/
│   ├── app/      # terraform.tfvars(.example) only
│   └── network/  # terraform.tfvars(.example) only
├── stg/
│   ├── app/      # terraform.tfvars.example
│   └── network/  # terraform.tfvars.example
└── prod/
    ├── app/      # terraform.tfvars(.example) only
    └── network/  # terraform.tfvars(.example) only
```

## What lives where

- Terraform root logic: `_shared/app` and `_shared/network`
- Environment values: `dev|stg|prod/*/terraform.tfvars` and `terraform.tfvars.example`
- Orchestration / backend / dependency order: `google-cloud/terraform/live/*/terragrunt.hcl`

## Commands

Run from Terragrunt live units:

```bash
cd google-cloud/terraform/live
terragrunt run-all plan
```
