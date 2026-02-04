CREATE TABLE `oauth_client_registry` (
	`client_id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL CHECK (`source` IN ('dcr', 'developer_portal')),
	`owner_id` text,
	`client_name` text,
	`registered_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_grant_at` text
);
--> statement-breakpoint
CREATE INDEX `ocr_source_idx` ON `oauth_client_registry` (`source`);
--> statement-breakpoint
CREATE INDEX `ocr_owner_idx` ON `oauth_client_registry` (`owner_id`);
--> statement-breakpoint
CREATE INDEX `ocr_registered_at_idx` ON `oauth_client_registry` (`registered_at`);
--> statement-breakpoint
CREATE INDEX `ocr_last_grant_at_idx` ON `oauth_client_registry` (`last_grant_at`);
--> statement-breakpoint
CREATE INDEX `ocr_source_registered_idx` ON `oauth_client_registry` (`source`, `registered_at`);
--> statement-breakpoint
CREATE INDEX `ocr_source_last_grant_idx` ON `oauth_client_registry` (`source`, `last_grant_at`);
