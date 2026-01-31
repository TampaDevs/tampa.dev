-- User following system
CREATE TABLE `user_follows` (
  `follower_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `followed_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`follower_id`, `followed_id`)
);--> statement-breakpoint
CREATE INDEX `user_follows_followed_idx` ON `user_follows` (`followed_id`);
