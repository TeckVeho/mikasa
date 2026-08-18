#!/usr/bin/env bash
# Default env for mikasa-load-management GCP (issue #24).
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-mikasa-load-management}"
export GCP_REGION="${GCP_REGION:-asia-northeast1}"
export GCP_STATE_BUCKET="${GCP_STATE_BUCKET:-mikasa-load-management-terraform-state}"
export GCP_AR_REPO="${GCP_AR_REPO:-mikasa-load-management-docker}"
