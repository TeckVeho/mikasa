-- AlterTable tenants
ALTER TABLE "tenants" ADD COLUMN "voice_engine" VARCHAR(20) NOT NULL DEFAULT 'flow';

-- CreateTable gemini_scenarios
CREATE TABLE "gemini_scenarios" (
    "id" TEXT NOT NULL,
    "scenario_id" VARCHAR(26) NOT NULL,
    "persona" TEXT NOT NULL,
    "conversation_rules" TEXT NOT NULL,
    "business_knowledge" TEXT NOT NULL,
    "guard_rails" TEXT NOT NULL,
    "tool_definitions" JSONB NOT NULL DEFAULT '[]',
    "voice_name" VARCHAR(50) NOT NULL DEFAULT 'Aoede',
    "language_code" VARCHAR(10) NOT NULL DEFAULT 'ja-JP',
    "transfer_enabled" BOOLEAN NOT NULL DEFAULT true,
    "transfer_number" VARCHAR(20),
    "transfer_timeout" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gemini_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gemini_scenarios_scenario_id_key" ON "gemini_scenarios"("scenario_id");

ALTER TABLE "gemini_scenarios" ADD CONSTRAINT "gemini_scenarios_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable transfer_handoffs
CREATE TABLE "transfer_handoffs" (
    "id" TEXT NOT NULL,
    "call_log_id" VARCHAR(26),
    "tenant_id" VARCHAR(26) NOT NULL,
    "call_sid" VARCHAR(64) NOT NULL,
    "caller_number" VARCHAR(20) NOT NULL,
    "reason" TEXT NOT NULL,
    "collected_info" JSONB,
    "transcript" TEXT,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'normal',
    "department" VARCHAR(40) NOT NULL DEFAULT 'general',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transfer_handoffs_tenant_id_status_idx" ON "transfer_handoffs"("tenant_id", "status");

ALTER TABLE "transfer_handoffs" ADD CONSTRAINT "transfer_handoffs_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
