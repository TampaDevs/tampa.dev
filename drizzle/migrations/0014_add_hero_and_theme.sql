-- Add hero image and theme color to users table for enhanced public profiles
ALTER TABLE `users` ADD COLUMN `hero_image_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `theme_color` text;
