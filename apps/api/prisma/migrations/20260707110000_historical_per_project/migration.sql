-- DropIndex
DROP INDEX `historical_averages_tenant_id_product_type_id_team_id_key` ON `historical_averages`;

-- AlterTable
ALTER TABLE `historical_averages`
    ADD COLUMN `project_number` VARCHAR(26) NULL,
    ADD COLUMN `client_name` VARCHAR(200) NULL,
    ADD COLUMN `bridge_name` VARCHAR(200) NULL,
    ADD COLUMN `completed_at` DATE NULL;

-- Backfill unique project numbers for legacy rows
UPDATE `historical_averages`
SET `project_number` = `id`
WHERE `project_number` IS NULL;

-- AlterTable
ALTER TABLE `historical_averages`
    MODIFY `project_number` VARCHAR(26) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `historical_averages_tenant_id_product_type_id_project_number_key` ON `historical_averages`(`tenant_id`, `product_type_id`, `project_number`);

-- CreateIndex
CREATE INDEX `historical_averages_tenant_id_product_type_id_team_id_idx` ON `historical_averages`(`tenant_id`, `product_type_id`, `team_id`);

-- DropIndex
DROP INDEX `historical_averages_tenant_id_product_type_id_idx` ON `historical_averages`;
