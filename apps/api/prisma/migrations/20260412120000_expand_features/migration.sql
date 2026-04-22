-- AlterTable tenants
ALTER TABLE "tenants" ADD COLUMN "maintenance_mode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "maintenance_message" TEXT;
ALTER TABLE "tenants" ADD COLUMN "billing_plan" VARCHAR(40) NOT NULL DEFAULT 'standard';

-- AlterTable scenarios
ALTER TABLE "scenarios" ADD COLUMN "scenario_type" VARCHAR(20) NOT NULL DEFAULT 'inbound';
ALTER TABLE "scenarios" ADD COLUMN "description" TEXT;

CREATE INDEX "scenarios_tenant_id_scenario_type_idx" ON "scenarios"("tenant_id", "scenario_type");

-- AlterTable call_logs
ALTER TABLE "call_logs" ADD COLUMN "transcript_segments" JSONB;
ALTER TABLE "call_logs" ADD COLUMN "callback_done" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable scenario_versions
CREATE TABLE "scenario_versions" (
    "id" VARCHAR(26) NOT NULL,
    "scenario_id" VARCHAR(26) NOT NULL,
    "version" INTEGER NOT NULL,
    "flow_json" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" VARCHAR(26),

    CONSTRAINT "scenario_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scenario_versions_scenario_id_version_idx" ON "scenario_versions"("scenario_id", "version");

ALTER TABLE "scenario_versions" ADD CONSTRAINT "scenario_versions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable speech_dictionaries
CREATE TABLE "speech_dictionaries" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "word" VARCHAR(100) NOT NULL,
    "reading" VARCHAR(100) NOT NULL,
    "category" VARCHAR(20) NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speech_dictionaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "speech_dictionaries_tenant_id_idx" ON "speech_dictionaries"("tenant_id");

ALTER TABLE "speech_dictionaries" ADD CONSTRAINT "speech_dictionaries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable voice_templates
CREATE TABLE "voice_templates" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "storage_path" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "voice_templates_tenant_id_idx" ON "voice_templates"("tenant_id");

ALTER TABLE "voice_templates" ADD CONSTRAINT "voice_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable callback_requests
CREATE TABLE "callback_requests" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "call_log_id" VARCHAR(26),
    "caller_number" VARCHAR(20) NOT NULL,
    "preferred_time" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "callback_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "callback_requests_tenant_id_status_idx" ON "callback_requests"("tenant_id", "status");

ALTER TABLE "callback_requests" ADD CONSTRAINT "callback_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
