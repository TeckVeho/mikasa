# State migration: flat root -> module.app_compose (zero-diff).
# Flat state never applied prior module-level moved blocks.

moved {
  from = google_project_service.sqladmin
  to   = module.app_compose.module.cloud_sql.google_project_service.sqladmin
}

moved {
  from = google_project_service.secretmanager
  to   = module.app_compose.module.cloud_sql.google_project_service.secretmanager
}

moved {
  from = random_password.sql_app
  to   = module.app_compose.module.cloud_sql.random_password.sql_app
}

moved {
  from = random_password.sql_root
  to   = module.app_compose.module.cloud_sql.random_password.sql_root
}

moved {
  from = google_sql_database_instance.main
  to   = module.app_compose.module.cloud_sql.google_sql_database_instance.main
}

moved {
  from = google_sql_database.app
  to   = module.app_compose.module.cloud_sql.google_sql_database.app
}

moved {
  from = google_sql_user.app
  to   = module.app_compose.module.cloud_sql.google_sql_user.app
}

moved {
  from = google_secret_manager_secret.database_url
  to   = module.app_compose.module.cloud_sql.google_secret_manager_secret.database_url
}

moved {
  from = google_secret_manager_secret_version.database_url
  to   = module.app_compose.module.cloud_sql.google_secret_manager_secret_version.database_url
}

moved {
  from = google_secret_manager_secret_iam_member.cloudrun_database_url
  to   = module.app_compose.module.cloud_sql.google_secret_manager_secret_iam_member.cloudrun_database_url
}

moved {
  from = google_project_iam_member.cloudrun_sql_client
  to   = module.app_compose.module.cloud_sql.google_project_iam_member.cloudrun_sql_client
}

moved {
  from = google_project_service.storage
  to   = module.app_compose.module.gcs.google_project_service.storage
}

moved {
  from = google_project_service.iamcredentials
  to   = module.app_compose.module.gcs.google_project_service.iamcredentials
}

moved {
  from = google_storage_bucket.uploads
  to   = module.app_compose.module.gcs.google_storage_bucket.uploads
}

moved {
  from = google_storage_bucket_iam_member.cloudrun_gcs_admin
  to   = module.app_compose.module.gcs.google_storage_bucket_iam_member.cloudrun_gcs_admin
}

moved {
  from = google_service_account_iam_member.cloudrun_sign_blob_self
  to   = module.app_compose.module.gcs.google_service_account_iam_member.cloudrun_sign_blob_self
}

moved {
  from = google_secret_manager_secret_iam_member.cloudrun_secret_accessor
  to   = module.app_compose.module.secrets.google_secret_manager_secret_iam_member.cloudrun_secret_accessor
}

moved {
  from = google_project_iam_member.extra
  to   = module.app_compose.module.iam.google_project_iam_member.extra
}

moved {
  from = google_project.wiki_labels
  to   = module.app_compose.module.iam.google_project.wiki_labels
}

moved {
  from = google_project_service.cloudscheduler
  to   = module.app_compose.google_project_service.cloudscheduler
}

moved {
  from = google_project_service.cloudfunctions
  to   = module.app_compose.module.sql_schedule.google_project_service.cloudfunctions
}

moved {
  from = google_project_service.cloudbuild
  to   = module.app_compose.module.sql_schedule.google_project_service.cloudbuild
}

moved {
  from = google_service_account.sql_schedule_fn
  to   = module.app_compose.module.sql_schedule.google_service_account.sql_schedule_fn
}

moved {
  from = google_project_iam_member.sql_schedule_fn_sql_editor
  to   = module.app_compose.module.sql_schedule.google_project_iam_member.sql_schedule_fn_sql_editor
}

moved {
  from = google_project_iam_member.cf_build_logging
  to   = module.app_compose.module.sql_schedule.google_project_iam_member.cf_build_logging
}

moved {
  from = google_project_iam_member.cf_build_ar
  to   = module.app_compose.module.sql_schedule.google_project_iam_member.cf_build_ar
}

moved {
  from = google_project_iam_member.cf_build_storage
  to   = module.app_compose.module.sql_schedule.google_project_iam_member.cf_build_storage
}

moved {
  from = google_service_account.scheduler_invoker
  to   = module.app_compose.module.sql_schedule.google_service_account.scheduler_invoker
}

moved {
  from = google_storage_bucket.cf_source
  to   = module.app_compose.module.sql_schedule.google_storage_bucket.cf_source
}

moved {
  from = data.archive_file.sql_activation
  to   = module.app_compose.module.sql_schedule.data.archive_file.sql_activation
}

moved {
  from = google_storage_bucket_iam_member.cloudbuild_cf_source_reader
  to   = module.app_compose.module.sql_schedule.google_storage_bucket_iam_member.cloudbuild_cf_source_reader
}

moved {
  from = google_storage_bucket_object.sql_activation_zip
  to   = module.app_compose.module.sql_schedule.google_storage_bucket_object.sql_activation_zip
}

moved {
  from = google_cloudfunctions2_function.sql_activation
  to   = module.app_compose.module.sql_schedule.google_cloudfunctions2_function.sql_activation
}

moved {
  from = google_cloud_run_v2_service_iam_member.scheduler_invokes_sql_fn
  to   = module.app_compose.module.sql_schedule.google_cloud_run_v2_service_iam_member.scheduler_invokes_sql_fn
}

moved {
  from = google_cloud_scheduler_job.sql_stop
  to   = module.app_compose.module.sql_schedule.google_cloud_scheduler_job.sql_stop
}

moved {
  from = google_cloud_scheduler_job.sql_start
  to   = module.app_compose.module.sql_schedule.google_cloud_scheduler_job.sql_start
}

moved {
  from = google_project_service.run
  to   = module.app_compose.module.cloud_run.google_project_service.run
}

moved {
  from = google_project_service.artifactregistry
  to   = module.app_compose.google_project_service.artifactregistry
}

moved {
  from = google_cloud_run_v2_service.api
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_service.api
}

moved {
  from = google_cloud_run_v2_service_iam_member.public_invoker
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_service_iam_member.public_invoker
}

moved {
  from = google_cloud_run_v2_service.web
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_service.web
}

moved {
  from = google_cloud_run_v2_service_iam_member.public_invoker_web
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_service_iam_member.public_invoker_web
}

moved {
  from = google_cloud_run_domain_mapping.api
  to   = module.app_compose.module.cloud_run.google_cloud_run_domain_mapping.api
}

moved {
  from = google_cloud_run_domain_mapping.web
  to   = module.app_compose.module.cloud_run.google_cloud_run_domain_mapping.web
}

moved {
  from = google_cloud_run_v2_job.migrate
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_job.migrate
}

moved {
  from = google_project_service.vertex_ai
  to   = module.app_compose.module.cloud_run.google_project_service.vertex_ai
}

moved {
  from = google_project_iam_member.cloudrun_vertex_user
  to   = module.app_compose.module.cloud_run.google_project_iam_member.cloudrun_vertex_user
}

moved {
  from = google_service_account.cron_api_scheduler
  to   = module.app_compose.module.cloud_run.google_service_account.cron_api_scheduler
}

moved {
  from = google_cloud_run_v2_service_iam_member.cron_scheduler_invokes_api
  to   = module.app_compose.module.cloud_run.google_cloud_run_v2_service_iam_member.cron_scheduler_invokes_api
}

moved {
  from = google_cloud_scheduler_job.cron_cleanup_tokens
  to   = module.app_compose.module.cloud_run.google_cloud_scheduler_job.cron_cleanup_tokens
}

moved {
  from = google_cloud_scheduler_job.cron_tbs_batch
  to   = module.app_compose.module.cloud_run.google_cloud_scheduler_job.cron_tbs_batch
}

moved {
  from = google_cloud_scheduler_job.cron_recommendations
  to   = module.app_compose.module.cloud_run.google_cloud_scheduler_job.cron_recommendations
}

moved {
  from = data.google_project.current
  to   = module.app_compose.data.google_project.current
}

moved {
  from = data.terraform_remote_state.network
  to   = module.app_compose.data.terraform_remote_state.network
}

moved {
  from = module.tier_specs
  to   = module.app_compose.module.tier_specs
}
