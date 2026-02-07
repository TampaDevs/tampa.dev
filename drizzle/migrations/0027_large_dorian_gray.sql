CREATE TABLE `oauth_grants` (
	`grant_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`grant_key` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `og_user_idx` ON `oauth_grants` (`user_id`);--> statement-breakpoint
CREATE INDEX `og_client_idx` ON `oauth_grants` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `og_user_client_idx` ON `oauth_grants` (`user_id`,`client_id`);