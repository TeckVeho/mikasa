-- Ephemeral key-value cache (replaces Cloud Memorystore Redis for session/transfer).
CREATE TABLE `kv_cache` (
    `cache_key` VARCHAR(255) NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`cache_key`),
    INDEX `kv_cache_expires_at_idx`(`expires_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
