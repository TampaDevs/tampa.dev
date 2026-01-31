-- Badge claim links: shareable URLs for claiming badges
CREATE TABLE `badge_claim_links` (
  `id` text PRIMARY KEY NOT NULL,
  `badge_id` text NOT NULL REFERENCES `badges`(`id`),
  `code` text NOT NULL,
  `max_uses` integer,
  `current_uses` integer NOT NULL DEFAULT 0,
  `expires_at` text,
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `achievement_id` text REFERENCES `achievements`(`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `badge_claim_links_code_idx` ON `badge_claim_links` (`code`);--> statement-breakpoint
CREATE INDEX `badge_claim_links_badge_idx` ON `badge_claim_links` (`badge_id`);
