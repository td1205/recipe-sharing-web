-- CreateTable
CREATE TABLE `content_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporter_id` INTEGER NULL,
    `target_type` ENUM('recipe', 'comment') NOT NULL,
    `target_id` INTEGER NOT NULL,
    `recipe_id` INTEGER NULL,
    `comment_id` INTEGER NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `status` ENUM('Pending', 'Resolved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `resolved_by` INTEGER NULL,

    INDEX `content_reports_status_created_at_idx`(`status`, `created_at`),
    INDEX `content_reports_reporter_id_created_at_idx`(`reporter_id`, `created_at`),
    INDEX `content_reports_recipe_id_idx`(`recipe_id`),
    INDEX `content_reports_comment_id_idx`(`comment_id`),
    INDEX `content_reports_resolved_by_idx`(`resolved_by`),
    UNIQUE INDEX `report_once_per_member_target`(`reporter_id`, `target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_id` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `target_type` VARCHAR(20) NOT NULL,
    `target_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_audit_logs_created_at_idx`(`created_at`),
    INDEX `admin_audit_logs_admin_id_created_at_idx`(`admin_id`, `created_at`),
    INDEX `admin_audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `admin_audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- MySQL disallows CHECK on columns participating in FK SET NULL actions.
-- Target links are validated by the service; FKs validate existence and retain reports on deletion.
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_input_check` CHECK (`target_id` > 0 AND CHAR_LENGTH(TRIM(`reason`)) > 0);
ALTER TABLE `content_reports` ADD CONSTRAINT `content_reports_resolution_check` CHECK (
  (`status` = 'Pending' AND `resolved_at` IS NULL) OR
  (`status` IN ('Resolved', 'Rejected') AND `resolved_at` IS NOT NULL)
);
