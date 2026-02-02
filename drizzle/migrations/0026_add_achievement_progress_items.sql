-- Add achievement_progress_items table for distinct progress tracking
CREATE TABLE `achievement_progress_items` (
  `id` text PRIMARY KEY NOT NULL,
  `progress_id` text NOT NULL,
  `field_value` text NOT NULL,
  `recorded_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`progress_id`) REFERENCES `achievement_progress`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `achievement_progress_items_progress_idx` ON `achievement_progress_items` (`progress_id`);
CREATE UNIQUE INDEX `achievement_progress_items_unique_idx` ON `achievement_progress_items` (`progress_id`, `field_value`);
