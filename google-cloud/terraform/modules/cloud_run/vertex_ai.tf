# Vertex AI for Gemini (when enable_vertex_ai = true).
# Sets VERTEX_AI=true on Cloud Run; app uses ADC — no GEMINI_API_KEY required.

resource "google_project_service" "vertex_ai" {
  count = var.enable_vertex_ai ? 1 : 0

  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_iam_member" "cloudrun_vertex_user" {
  count = var.enable_vertex_ai ? 1 : 0

  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${var.cloud_run_service_account}"

  depends_on = [google_project_service.vertex_ai]
}
