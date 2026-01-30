-- User Entitlements: gate features based on achievements or admin grants
CREATE TABLE `user_entitlements` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `entitlement` text NOT NULL,
  `granted_at` text NOT NULL DEFAULT (datetime('now')),
  `expires_at` text,
  `source` text NOT NULL DEFAULT 'system'
);
CREATE INDEX `user_entitlements_user_idx` ON `user_entitlements` (`user_id`);
CREATE UNIQUE INDEX `user_entitlements_user_ent_idx` ON `user_entitlements` (`user_id`, `entitlement`);

-- Achievement Progress: track user milestones toward badges/entitlements
CREATE TABLE `achievement_progress` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `achievement_key` text NOT NULL,
  `current_value` integer NOT NULL DEFAULT 0,
  `target_value` integer NOT NULL,
  `completed_at` text,
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `achievement_progress_user_idx` ON `achievement_progress` (`user_id`);
CREATE UNIQUE INDEX `achievement_progress_user_key_idx` ON `achievement_progress` (`user_id`, `achievement_key`);
