-- AlterTable
ALTER TABLE `gemini_scenarios`
    ADD COLUMN `transfer_number_claims` VARCHAR(20) NULL AFTER `transfer_number`,
    ADD COLUMN `human_first_enabled` BOOLEAN NOT NULL DEFAULT false AFTER `transfer_timeout`,
    ADD COLUMN `human_first_number` VARCHAR(20) NULL AFTER `human_first_enabled`,
    ADD COLUMN `human_first_timeout` INT NOT NULL DEFAULT 18 AFTER `human_first_number`;
