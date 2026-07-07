-- CreateTable
CREATE TABLE `product_types` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `product_types_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_types` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `display_order` INTEGER NOT NULL,
    `default_ratio` DECIMAL(6, 4) NOT NULL,
    `is_welding` BOOLEAN NOT NULL DEFAULT false,

    INDEX `process_types_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `teams_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` VARCHAR(26) NOT NULL,
    `team_id` VARCHAR(26) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `team_members_team_id_idx`(`team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendars` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `date` DATE NOT NULL,
    `is_holiday` BOOLEAN NOT NULL DEFAULT false,
    `holiday_name` VARCHAR(100) NULL,

    UNIQUE INDEX `calendars_tenant_id_date_key`(`tenant_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `capacity_settings` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `team_id` VARCHAR(26) NULL,
    `category` VARCHAR(20) NOT NULL,
    `regular_hours_per_day` DECIMAL(5, 1) NOT NULL,
    `overtime_2h_per_day` DECIMAL(5, 1) NOT NULL,
    `overtime_4h_per_day` DECIMAL(5, 1) NOT NULL,
    `headcount` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `capacity_settings_tenant_id_team_id_category_key`(`tenant_id`, `team_id`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `project_number` VARCHAR(20) NOT NULL,
    `client_name` VARCHAR(200) NULL,
    `project_name` VARCHAR(200) NOT NULL,
    `product_type_id` VARCHAR(26) NULL,
    `deadline` DATE NULL,
    `weight` DECIMAL(10, 2) NULL,
    `drawing_received_at` DATE NULL,
    `planned_hours` DECIMAL(8, 1) NULL,
    `welding_ratio` DECIMAL(6, 4) NULL,
    `team_id` VARCHAR(26) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `stacking_required` BOOLEAN NOT NULL DEFAULT true,
    `category` VARCHAR(20) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `projects_tenant_id_team_id_idx`(`tenant_id`, `team_id`),
    INDEX `projects_tenant_id_status_idx`(`tenant_id`, `status`),
    UNIQUE INDEX `projects_tenant_id_project_number_key`(`tenant_id`, `project_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_phases` (
    `id` VARCHAR(26) NOT NULL,
    `project_id` VARCHAR(26) NOT NULL,
    `phase_number` INTEGER NOT NULL,
    `ratio` DECIMAL(6, 4) NOT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `is_confirmed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `project_phases_project_id_phase_number_key`(`project_id`, `phase_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_allocations` (
    `id` VARCHAR(26) NOT NULL,
    `project_id` VARCHAR(26) NOT NULL,
    `date` DATE NOT NULL,
    `allocated_hours` DECIMAL(6, 2) NOT NULL,
    `source` VARCHAR(10) NOT NULL DEFAULT 'planned',
    `phase_number` INTEGER NULL,

    INDEX `daily_allocations_date_idx`(`date`),
    UNIQUE INDEX `daily_allocations_project_id_date_key`(`project_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process_records` (
    `id` VARCHAR(26) NOT NULL,
    `project_id` VARCHAR(26) NOT NULL,
    `process_type_id` VARCHAR(26) NOT NULL,
    `date` DATE NOT NULL,
    `hours` DECIMAL(6, 2) NOT NULL,
    `recorded_by` VARCHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `process_records_date_idx`(`date`),
    UNIQUE INDEX `process_records_project_id_process_type_id_date_key`(`project_id`, `process_type_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historical_records` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `project_number` VARCHAR(20) NULL,
    `product_type_id` VARCHAR(26) NOT NULL,
    `process_type_id` VARCHAR(26) NULL,
    `weight` DECIMAL(10, 2) NULL,
    `hours` DECIMAL(8, 1) NOT NULL,
    `year` INTEGER NOT NULL,

    INDEX `historical_records_tenant_id_product_type_id_idx`(`tenant_id`, `product_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_types` ADD CONSTRAINT `product_types_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_types` ADD CONSTRAINT `process_types_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendars` ADD CONSTRAINT `calendars_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `capacity_settings` ADD CONSTRAINT `capacity_settings_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `capacity_settings` ADD CONSTRAINT `capacity_settings_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_product_type_id_fkey` FOREIGN KEY (`product_type_id`) REFERENCES `product_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_phases` ADD CONSTRAINT `project_phases_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_allocations` ADD CONSTRAINT `daily_allocations_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_records` ADD CONSTRAINT `process_records_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `process_records` ADD CONSTRAINT `process_records_process_type_id_fkey` FOREIGN KEY (`process_type_id`) REFERENCES `process_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_records` ADD CONSTRAINT `historical_records_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_records` ADD CONSTRAINT `historical_records_product_type_id_fkey` FOREIGN KEY (`product_type_id`) REFERENCES `product_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
