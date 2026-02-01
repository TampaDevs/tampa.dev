-- Add points columns to achievements and badges for XP scoring system
ALTER TABLE `achievements` ADD COLUMN `points` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `badges` ADD COLUMN `points` integer NOT NULL DEFAULT 0;
