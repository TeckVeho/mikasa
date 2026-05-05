# Firebase Admin SDK uses ADC when FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY are unset (see apps/api firebase-admin.ts).
# Default Cloud Run SA = Compute default ({project_number}-compute@developer.gserviceaccount.com) — grant Auth admin + enable Identity Toolkit API.

resource "google_project_service" "identitytoolkit" {
  count   = var.grant_cloud_run_sa_firebase_auth_admin ? 1 : 0
  project = var.project_id
  service = "identitytoolkit.googleapis.com"
}

resource "google_project_iam_member" "cloud_run_sa_firebase_auth_admin" {
  count   = var.grant_cloud_run_sa_firebase_auth_admin ? 1 : 0
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${local.cloud_run_service_account}"

  depends_on = [google_project_service.identitytoolkit]
}
