-- Add show_achievements toggle (defaults to true = visible on public profile)
ALTER TABLE `users` ADD COLUMN `show_achievements` integer NOT NULL DEFAULT 1;
