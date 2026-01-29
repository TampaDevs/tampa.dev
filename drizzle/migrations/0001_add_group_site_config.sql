-- Add site display configuration fields to groups table
ALTER TABLE `groups` ADD COLUMN `website` text;--> statement-breakpoint
ALTER TABLE `groups` ADD COLUMN `display_on_site` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `groups` ADD COLUMN `is_featured` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `groups` ADD COLUMN `tags` text;--> statement-breakpoint
ALTER TABLE `groups` ADD COLUMN `social_links` text;--> statement-breakpoint
CREATE INDEX `groups_display_on_site_idx` ON `groups` (`display_on_site`);
