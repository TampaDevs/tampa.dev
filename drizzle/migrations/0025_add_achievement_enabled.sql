-- Allow admins to disable achievements without deleting them
ALTER TABLE `achievements` ADD COLUMN `enabled` integer NOT NULL DEFAULT 1;
