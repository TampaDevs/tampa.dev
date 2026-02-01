-- First-Party Groups Foundation
-- Adds tables and columns for native group/event management, RSVP, checkin,
-- group claims, and group-scoped badges.

-- ============== NEW TABLES ==============

-- 1. group_platform_connections: Decouples sync from groups table.
-- A group can have 0..N platform connections (meetup, eventbrite, luma).
-- Native groups have zero connections. Hybrid groups have 1+.
CREATE TABLE `group_platform_connections` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `platform` text NOT NULL,
  `platform_id` text NOT NULL,
  `platform_urlname` text,
  `platform_link` text,
  `is_active` integer NOT NULL DEFAULT 1,
  `last_sync_at` text,
  `sync_error` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `gpc_group_idx` ON `group_platform_connections` (`group_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `gpc_platform_id_idx` ON `group_platform_connections` (`platform`, `platform_id`);
--> statement-breakpoint
CREATE INDEX `gpc_active_idx` ON `group_platform_connections` (`is_active`);
--> statement-breakpoint

-- 2. event_rsvps: RSVP tracking for native events with waitlist support.
CREATE TABLE `event_rsvps` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `status` text NOT NULL DEFAULT 'confirmed',
  `rsvp_at` text NOT NULL DEFAULT (datetime('now')),
  `waitlist_position` integer,
  `cancelled_at` text
);
--> statement-breakpoint
CREATE INDEX `event_rsvps_event_idx` ON `event_rsvps` (`event_id`);
--> statement-breakpoint
CREATE INDEX `event_rsvps_user_idx` ON `event_rsvps` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_rsvps_event_user_idx` ON `event_rsvps` (`event_id`, `user_id`);
--> statement-breakpoint

-- 3. event_checkin_codes: Shareable codes for event checkin (link, QR, NFC).
CREATE TABLE `event_checkin_codes` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `code` text NOT NULL,
  `max_uses` integer,
  `current_uses` integer NOT NULL DEFAULT 0,
  `expires_at` text,
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_checkin_codes_code_idx` ON `event_checkin_codes` (`code`);
--> statement-breakpoint
CREATE INDEX `event_checkin_codes_event_idx` ON `event_checkin_codes` (`event_id`);
--> statement-breakpoint

-- 4. event_checkins: Records of who checked in to what event.
CREATE TABLE `event_checkins` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `checkin_code_id` text REFERENCES `event_checkin_codes`(`id`),
  `method` text NOT NULL DEFAULT 'link',
  `checked_in_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_checkins_event_user_idx` ON `event_checkins` (`event_id`, `user_id`);
--> statement-breakpoint
CREATE INDEX `event_checkins_event_idx` ON `event_checkins` (`event_id`);
--> statement-breakpoint

-- 5. group_claim_requests: Requests to claim ownership of synced groups.
-- verification_data is scaffolding for future Meetup/Eventbrite API verification
-- when sign-in-with-platform is implemented. The claim review UI can display
-- this data to the reviewing admin. For now it remains NULL.
CREATE TABLE `group_claim_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `status` text NOT NULL DEFAULT 'pending',
  `reviewed_by` text REFERENCES `users`(`id`),
  `reviewed_at` text,
  `notes` text,
  `verification_data` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `gcr_group_idx` ON `group_claim_requests` (`group_id`);
--> statement-breakpoint
CREATE INDEX `gcr_user_idx` ON `group_claim_requests` (`user_id`);
--> statement-breakpoint
CREATE INDEX `gcr_status_idx` ON `group_claim_requests` (`status`);
--> statement-breakpoint

-- 6. group_claim_invites: Admin-generated invite links for group ownership claims.
CREATE TABLE `group_claim_invites` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `token` text NOT NULL,
  `auto_approve` integer NOT NULL DEFAULT 0,
  `expires_at` text,
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `used_by` text REFERENCES `users`(`id`),
  `used_at` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gci_token_idx` ON `group_claim_invites` (`token`);
--> statement-breakpoint
CREATE INDEX `gci_group_idx` ON `group_claim_invites` (`group_id`);
--> statement-breakpoint

-- 7. group_creation_requests: Self-serve group creation requests (feature-flagged).
CREATE TABLE `group_creation_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `group_name` text NOT NULL,
  `description` text,
  `status` text NOT NULL DEFAULT 'pending',
  `reviewed_by` text REFERENCES `users`(`id`),
  `reviewed_at` text,
  `group_id` text REFERENCES `groups`(`id`),
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `gcreq_user_idx` ON `group_creation_requests` (`user_id`);
--> statement-breakpoint
CREATE INDEX `gcreq_status_idx` ON `group_creation_requests` (`status`);
--> statement-breakpoint

-- ============== COLUMN ADDITIONS ==============

-- Groups: badge governance limits
ALTER TABLE `groups` ADD COLUMN `max_badges` integer NOT NULL DEFAULT 10;
--> statement-breakpoint
ALTER TABLE `groups` ADD COLUMN `max_badge_points` integer NOT NULL DEFAULT 50;
--> statement-breakpoint

-- Events: track who created native events
ALTER TABLE `events` ADD COLUMN `created_by` text REFERENCES `users`(`id`);
--> statement-breakpoint

-- Badges: optional group scope (NULL = platform badge, set = group badge)
ALTER TABLE `badges` ADD COLUMN `group_id` text REFERENCES `groups`(`id`);
--> statement-breakpoint
CREATE INDEX `badges_group_idx` ON `badges` (`group_id`);
--> statement-breakpoint

-- Group members: rename 'admin' role to 'manager'
UPDATE `group_members` SET `role` = 'manager' WHERE `role` = 'admin';
