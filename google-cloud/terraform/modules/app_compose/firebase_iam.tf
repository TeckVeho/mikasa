# Firebase Admin SDK uses ADC on the dedicated Cloud Run runtime SA (see apps/api firebase-admin.ts).

resource "google_project_service" "identitytoolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_iam_member" "runtime_firebase_auth_admin" {
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.runtime.email}"

  depends_on = [google_project_service.identitytoolkit]
}
