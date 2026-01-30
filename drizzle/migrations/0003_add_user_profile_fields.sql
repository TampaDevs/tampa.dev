-- Add profile fields to users table for public profiles
ALTER TABLE `users` ADD COLUMN `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `social_links` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);
