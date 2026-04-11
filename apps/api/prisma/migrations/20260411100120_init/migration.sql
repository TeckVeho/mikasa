-- CreateTable
CREATE TABLE "tenants" (
    "id" VARCHAR(26) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "firebase_uid" VARCHAR(128) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'operator',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "scenario_id" VARCHAR(26),
    "number" VARCHAR(20) NOT NULL,
    "twilio_number_sid" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'inactive',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "flow_json" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" VARCHAR(26) NOT NULL,
    "tenant_id" VARCHAR(26) NOT NULL,
    "phone_number_id" VARCHAR(26) NOT NULL,
    "scenario_id" VARCHAR(26) NOT NULL,
    "twilio_call_sid" VARCHAR(64) NOT NULL,
    "caller_number" VARCHAR(20) NOT NULL,
    "duration_seconds" INTEGER,
    "status" VARCHAR(20) NOT NULL,
    "transcript_text" TEXT,
    "summary_text" TEXT,
    "structured_data" JSONB,
    "audio_storage_path" TEXT,
    "operator_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_twilio_number_sid_key" ON "phone_numbers"("twilio_number_sid");

-- CreateIndex
CREATE INDEX "scenarios_tenant_id_status_idx" ON "scenarios"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "call_logs_twilio_call_sid_key" ON "call_logs"("twilio_call_sid");

-- CreateIndex
CREATE INDEX "call_logs_tenant_id_created_at_idx" ON "call_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "call_logs_tenant_id_status_idx" ON "call_logs"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_phone_number_id_fkey" FOREIGN KEY ("phone_number_id") REFERENCES "phone_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
