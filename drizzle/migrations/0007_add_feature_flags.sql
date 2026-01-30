-- Feature flags system
CREATE TABLE `feature_flags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `enabled_by_default` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_flags_slug_idx` ON `feature_flags` (`slug`);
--> statement-breakpoint
CREATE TABLE `user_feature_flags` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `flag_id` text NOT NULL REFERENCES `feature_flags`(`id`) ON DELETE CASCADE,
  `enabled` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_feature_flags_user_flag_idx` ON `user_feature_flags` (`user_id`, `flag_id`);
--> statement-breakpoint
CREATE TABLE `group_feature_flags` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `flag_id` text NOT NULL REFERENCES `feature_flags`(`id`) ON DELETE CASCADE,
  `enabled` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_feature_flags_group_flag_idx` ON `group_feature_flags` (`group_id`, `flag_id`);
