-- DropTable
DROP TABLE `historical_records`;

-- CreateTable
CREATE TABLE `historical_averages` (
    `id` VARCHAR(26) NOT NULL,
    `tenant_id` VARCHAR(26) NOT NULL,
    `product_type_id` VARCHAR(26) NOT NULL,
    `team_id` VARCHAR(26) NOT NULL,
    `manufacturing_planned` DECIMAL(8, 1) NULL,
    `sales_planned` DECIMAL(8, 1) NULL,
    `weight` DECIMAL(10, 2) NULL,
    `assembly_prep_hours` DECIMAL(8, 1) NULL,
    `assembly_hours` DECIMAL(8, 1) NULL,
    `welding_hours` DECIMAL(8, 1) NULL,
    `distortion_hours` DECIMAL(8, 1) NULL,
    `painting_hours` DECIMAL(8, 1) NULL,
    `finishing_hours` DECIMAL(8, 1) NULL,
    `total_hours` DECIMAL(8, 1) NULL,
    `project_count` INTEGER NULL,
    `member_length` DECIMAL(10, 2) NULL,
    `weight_per_meter` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `historical_averages_tenant_id_product_type_id_idx`(`tenant_id`, `product_type_id`),
    UNIQUE INDEX `historical_averages_tenant_id_product_type_id_team_id_key`(`tenant_id`, `product_type_id`, `team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `historical_averages` ADD CONSTRAINT `historical_averages_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_averages` ADD CONSTRAINT `historical_averages_product_type_id_fkey` FOREIGN KEY (`product_type_id`) REFERENCES `product_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historical_averages` ADD CONSTRAINT `historical_averages_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
