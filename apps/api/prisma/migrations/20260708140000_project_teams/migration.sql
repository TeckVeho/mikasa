-- CreateTable
CREATE TABLE `project_teams` (
    `id` VARCHAR(26) NOT NULL,
    `project_id` VARCHAR(26) NOT NULL,
    `team_id` VARCHAR(26) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_teams_team_id_idx`(`team_id`),
    UNIQUE INDEX `project_teams_project_id_team_id_key`(`project_id`, `team_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill project_teams from existing projects.team_id
INSERT INTO `project_teams` (`id`, `project_id`, `team_id`, `sort_order`, `created_at`)
SELECT
    CONCAT('pt-', SUBSTRING(p.id, 6)),
    p.id,
    p.team_id,
    0,
    NOW(3)
FROM `projects` p
WHERE p.team_id IS NOT NULL
  AND p.team_id != 'team-unassigned'
  AND p.deleted_at IS NULL;

-- Add team_id to process_records (nullable first for backfill)
ALTER TABLE `process_records` ADD COLUMN `team_id` VARCHAR(26) NULL;

-- Backfill process_records.team_id from projects.team_id
UPDATE `process_records` pr
INNER JOIN `projects` p ON p.id = pr.project_id
SET pr.team_id = CASE
    WHEN p.team_id IS NULL OR p.team_id = 'team-unassigned' THEN 'team-unassigned'
    ELSE p.team_id
END;

-- Make team_id NOT NULL
ALTER TABLE `process_records` MODIFY `team_id` VARCHAR(26) NOT NULL;

-- Drop old unique constraint and add new one with team_id
ALTER TABLE `process_records` DROP INDEX `process_records_project_id_process_type_id_date_record_type_key`;
CREATE UNIQUE INDEX `process_records_proj_proc_team_date_type_key`
    ON `process_records`(`project_id`, `process_type_id`, `team_id`, `date`, `record_type`);
CREATE INDEX `process_records_team_id_idx` ON `process_records`(`team_id`);

-- AddForeignKey
ALTER TABLE `project_teams` ADD CONSTRAINT `project_teams_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `project_teams` ADD CONSTRAINT `project_teams_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `process_records` ADD CONSTRAINT `process_records_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
