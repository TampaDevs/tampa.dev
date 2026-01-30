-- Badges table
CREATE TABLE `badges` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `icon` text NOT NULL,
  `color` text NOT NULL DEFAULT '#E5574F',
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `badges_slug_idx` ON `badges` (`slug`);

-- User badges (many-to-many)
CREATE TABLE `user_badges` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `badge_id` text NOT NULL REFERENCES `badges`(`id`) ON DELETE CASCADE,
  `awarded_at` text NOT NULL DEFAULT (datetime('now')),
  `awarded_by` text REFERENCES `users`(`id`)
);

CREATE INDEX `user_badges_user_idx` ON `user_badges` (`user_id`);
CREATE UNIQUE INDEX `user_badges_user_badge_idx` ON `user_badges` (`user_id`, `badge_id`);
