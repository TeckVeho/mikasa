-- Drop genzai (原寸) tables
DROP TABLE IF EXISTS `daily_allocations`;
DROP TABLE IF EXISTS `project_phases`;

-- Alter projects: add senpoku fields, remove stacking_required
ALTER TABLE `projects`
  ADD COLUMN `set_count` INT NULL AFTER `category`,
  ADD COLUMN `detail` VARCHAR(500) NULL AFTER `set_count`,
  ADD COLUMN `past_average_hours` DECIMAL(8, 1) NULL AFTER `detail`;

ALTER TABLE `projects` DROP COLUMN `stacking_required`;
