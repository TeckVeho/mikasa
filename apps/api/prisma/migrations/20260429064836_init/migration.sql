-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `maintenance_mode` BOOLEAN NOT NULL DEFAULT false,
    `maintenance_message` TEXT NULL,
    `billing_plan` VARCHAR(40) NOT NULL DEFAULT 'standard',
    `voice_engine` VARCHAR(20) NOT NULL DEFAULT 'flow',
    `notify_call_complete` BOOLEAN NOT NULL DEFAULT false,
    `notify_transfer` BOOLEAN NOT NULL DEFAULT false,
    `notify_email` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `firebase_uid` VARCHAR(128) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'operator',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_firebase_uid_key`(`firebase_uid`),
    INDEX `users_firebase_uid_idx`(`firebase_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phone_numbers` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `scenario_id` VARCHAR(26) NULL,
    `number` VARCHAR(20) NOT NULL,
    `twilio_number_sid` VARCHAR(64) NULL,
    `byoc_trunk_sid` VARCHAR(64) NULL,
    `number_type` VARCHAR(20) NOT NULL DEFAULT 'twilio',
    `status` VARCHAR(20) NOT NULL DEFAULT 'inactive',
    `ivr_enabled` BOOLEAN NOT NULL DEFAULT false,
    `ivr_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `phone_numbers_twilio_number_sid_key`(`twilio_number_sid`),
    UNIQUE INDEX `phone_numbers_byoc_trunk_sid_key`(`byoc_trunk_sid`),
    UNIQUE INDEX `phone_numbers_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scenarios` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `flow_json` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `scenario_type` VARCHAR(20) NOT NULL DEFAULT 'inbound',
    `description` TEXT NULL,

    INDEX `scenarios_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `scenarios_tenant_id_scenario_type_idx`(`tenant_id`, `scenario_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scenario_versions` (
    `id` VARCHAR(26) NOT NULL,
    `scenario_id` VARCHAR(26) NOT NULL,
    `version` INTEGER NOT NULL,
    `flow_json` JSON NOT NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_by` VARCHAR(26) NULL,

    INDEX `scenario_versions_scenario_id_version_idx`(`scenario_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `call_logs` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `phone_number_id` VARCHAR(26) NOT NULL,
    `scenario_id` VARCHAR(26) NOT NULL,
    `twilio_call_sid` VARCHAR(64) NOT NULL,
    `caller_number` VARCHAR(20) NOT NULL,
    `duration_seconds` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL,
    `transcript_text` TEXT NULL,
    `summary_text` TEXT NULL,
    `structured_data` JSON NULL,
    `transcript_segments` JSON NULL,
    `audio_storage_path` TEXT NULL,
    `operator_note` TEXT NOT NULL,
    `callback_done` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `call_logs_twilio_call_sid_key`(`twilio_call_sid`),
    INDEX `call_logs_tenant_id_created_at_idx`(`tenant_id`, `created_at` DESC),
    INDEX `call_logs_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `speech_dictionaries` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `word` VARCHAR(100) NOT NULL,
    `reading` VARCHAR(100) NOT NULL,
    `category` VARCHAR(20) NOT NULL DEFAULT 'general',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `speech_dictionaries_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `callback_requests` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `call_log_id` VARCHAR(26) NULL,
    `caller_number` VARCHAR(20) NOT NULL,
    `preferred_time` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `assignee_id` VARCHAR(26) NULL,
    `note` TEXT NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `callback_requests_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gemini_scenarios` (
    `id` VARCHAR(191) NOT NULL,
    `scenario_id` VARCHAR(26) NOT NULL,
    `persona` TEXT NOT NULL,
    `conversation_rules` TEXT NOT NULL,
    `business_knowledge` TEXT NOT NULL,
    `guard_rails` TEXT NOT NULL,
    `tool_definitions` JSON NOT NULL,
    `voice_name` VARCHAR(50) NOT NULL DEFAULT 'Aoede',
    `language_code` VARCHAR(10) NOT NULL DEFAULT 'ja-JP',
    `transfer_enabled` BOOLEAN NOT NULL DEFAULT true,
    `transfer_number` VARCHAR(20) NULL,
    `transfer_timeout` INTEGER NOT NULL DEFAULT 30,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `gemini_scenarios_scenario_id_key`(`scenario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ivr_routes` (
    `id` VARCHAR(191) NOT NULL,
    `phone_number_id` VARCHAR(26) NOT NULL,
    `digit` VARCHAR(1) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `scenario_id` VARCHAR(26) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ivr_routes_phone_number_id_idx`(`phone_number_id`),
    UNIQUE INDEX `ivr_routes_phone_number_id_digit_key`(`phone_number_id`, `digit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_handoffs` (
    `id` VARCHAR(191) NOT NULL,
    `call_log_id` VARCHAR(26) NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `call_sid` VARCHAR(64) NOT NULL,
    `caller_number` VARCHAR(20) NOT NULL,
    `reason` TEXT NOT NULL,
    `collected_info` JSON NULL,
    `transcript` TEXT NULL,
    `priority` VARCHAR(10) NOT NULL DEFAULT 'normal',
    `department` VARCHAR(40) NOT NULL DEFAULT 'general',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `handled_by` VARCHAR(26) NULL,
    `handled_note` TEXT NOT NULL,
    `handled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transfer_handoffs_tenant_id_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `phone_numbers` ADD CONSTRAINT `phone_numbers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `phone_numbers` ADD CONSTRAINT `phone_numbers_scenario_id_fkey` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scenarios` ADD CONSTRAINT `scenarios_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scenario_versions` ADD CONSTRAINT `scenario_versions_scenario_id_fkey` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_phone_number_id_fkey` FOREIGN KEY (`phone_number_id`) REFERENCES `phone_numbers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_scenario_id_fkey` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `speech_dictionaries` ADD CONSTRAINT `speech_dictionaries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `callback_requests` ADD CONSTRAINT `callback_requests_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gemini_scenarios` ADD CONSTRAINT `gemini_scenarios_scenario_id_fkey` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ivr_routes` ADD CONSTRAINT `ivr_routes_phone_number_id_fkey` FOREIGN KEY (`phone_number_id`) REFERENCES `phone_numbers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ivr_routes` ADD CONSTRAINT `ivr_routes_scenario_id_fkey` FOREIGN KEY (`scenario_id`) REFERENCES `scenarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_handoffs` ADD CONSTRAINT `transfer_handoffs_call_log_id_fkey` FOREIGN KEY (`call_log_id`) REFERENCES `call_logs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
