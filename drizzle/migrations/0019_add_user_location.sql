-- Add freeform location field to user profiles
ALTER TABLE `users` ADD COLUMN `location` text;
