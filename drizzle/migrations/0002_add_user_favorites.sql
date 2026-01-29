-- Add user_favorites table for storing user's favorited groups
CREATE TABLE `user_favorites` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `group_id` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);--> statement-breakpoint
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_favorites_group_idx` ON `user_favorites` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_favorites_user_group_idx` ON `user_favorites` (`user_id`, `group_id`);
