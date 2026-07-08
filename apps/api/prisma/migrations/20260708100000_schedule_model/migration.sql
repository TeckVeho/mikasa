-- AlterTable
ALTER TABLE `projects` ADD COLUMN `schedule_start_date` DATE NULL;

-- AlterTable
ALTER TABLE `process_records` ADD COLUMN `record_type` VARCHAR(10) NOT NULL DEFAULT 'actual';

-- MySQL uses the composite unique index as FK support for project_id; add a dedicated index first.
CREATE INDEX `process_records_project_id_idx` ON `process_records`(`project_id`);

-- CreateIndex
CREATE UNIQUE INDEX `process_records_project_id_process_type_id_date_record_type_key` ON `process_records`(`project_id`, `process_type_id`, `date`, `record_type`);

-- DropIndex
DROP INDEX `process_records_project_id_process_type_id_date_key` ON `process_records`;

-- CreateIndex
CREATE INDEX `process_records_record_type_idx` ON `process_records`(`record_type`);

-- CreateTable
CREATE TABLE `schedule_models` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `total_days` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `schedule_models_tenant_id_key`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_model_days` (
    `id` VARCHAR(26) NOT NULL,
    `schedule_model_id` VARCHAR(26) NOT NULL,
    `process_type_id` VARCHAR(26) NOT NULL,
    `day_offset` INTEGER NOT NULL,
    `hours_ratio` DECIMAL(8, 6) NOT NULL,

    INDEX `schedule_model_days_schedule_model_id_idx`(`schedule_model_id`),
    UNIQUE INDEX `schedule_model_days_model_proc_day_key`(`schedule_model_id`, `process_type_id`, `day_offset`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schedule_models` ADD CONSTRAINT `schedule_models_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_model_days` ADD CONSTRAINT `schedule_model_days_schedule_model_id_fkey` FOREIGN KEY (`schedule_model_id`) REFERENCES `schedule_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_model_days` ADD CONSTRAINT `schedule_model_days_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
