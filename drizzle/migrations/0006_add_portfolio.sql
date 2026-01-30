-- Portfolio items for user profiles
CREATE TABLE `user_portfolio_items` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `title` text NOT NULL,
  `description` text,
  `url` text,
  `image_url` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `user_portfolio_user_idx` ON `user_portfolio_items` (`user_id`);
