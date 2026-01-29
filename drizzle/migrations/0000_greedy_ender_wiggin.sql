CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`platform_id` text NOT NULL,
	`group_id` text NOT NULL,
	`venue_id` text,
	`title` text NOT NULL,
	`description` text,
	`event_url` text NOT NULL,
	`photo_url` text,
	`start_time` text NOT NULL,
	`end_time` text,
	`timezone` text NOT NULL,
	`duration` text,
	`status` text DEFAULT 'active' NOT NULL,
	`event_type` text DEFAULT 'physical',
	`rsvp_count` integer DEFAULT 0,
	`max_attendees` integer,
	`is_featured` integer DEFAULT false,
	`last_sync_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_platform_idx` ON `events` (`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_platform_id_idx` ON `events` (`platform`,`platform_id`);--> statement-breakpoint
CREATE INDEX `events_group_idx` ON `events` (`group_id`);--> statement-breakpoint
CREATE INDEX `events_start_time_idx` ON `events` (`start_time`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`platform_id` text NOT NULL,
	`urlname` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`link` text NOT NULL,
	`member_count` integer DEFAULT 0,
	`photo_url` text,
	`is_active` integer DEFAULT true,
	`last_sync_at` text,
	`sync_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `groups_platform_idx` ON `groups` (`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `groups_urlname_idx` ON `groups` (`urlname`);--> statement-breakpoint
CREATE INDEX `groups_platform_id_idx` ON `groups` (`platform`,`platform_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`group_id` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`status` text NOT NULL,
	`events_created` integer DEFAULT 0,
	`events_updated` integer DEFAULT 0,
	`events_deleted` integer DEFAULT 0,
	`error` text,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sync_logs_platform_idx` ON `sync_logs` (`platform`);--> statement-breakpoint
CREATE INDEX `sync_logs_started_at_idx` ON `sync_logs` (`started_at`);--> statement-breakpoint
CREATE TABLE `user_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`provider_username` text,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_identities_user_idx` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_identities_provider_idx` ON `user_identities` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`postal_code` text,
	`country` text,
	`latitude` real,
	`longitude` real,
	`is_online` integer DEFAULT false,
	`platform_venue_id` text,
	`platform` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `venues_city_idx` ON `venues` (`city`);--> statement-breakpoint
CREATE INDEX `venues_platform_venue_idx` ON `venues` (`platform`,`platform_venue_id`);