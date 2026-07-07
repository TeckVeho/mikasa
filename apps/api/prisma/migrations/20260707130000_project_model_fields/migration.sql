-- AlterTable
ALTER TABLE `projects` ADD COLUMN `member_length` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `product_types` ADD COLUMN `regression_a` DECIMAL(12, 8) NULL,
    ADD COLUMN `regression_b` DECIMAL(10, 3) NULL,
    ADD COLUMN `process_ratios` JSON NULL;
