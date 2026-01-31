-- Achievement definitions table (replaces code-defined ACHIEVEMENTS array)
CREATE TABLE `achievements` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `icon` text,
  `color` text,
  `target_value` integer NOT NULL DEFAULT 1,
  `badge_slug` text,
  `entitlement` text,
  `event_type` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX `achievements_key_idx` ON `achievements` (`key`);
CREATE INDEX `achievements_event_type_idx` ON `achievements` (`event_type`);

-- Seed existing 3 achievements
INSERT INTO `achievements` (`id`, `key`, `name`, `description`, `icon`, `color`, `target_value`, `badge_slug`, `event_type`, `sort_order`)
VALUES
  (lower(hex(randomblob(16))), 'groups_favorited_3', 'Explorer', 'Favorite 3 groups', '🔍', '#4CAF50', 3, 'explorer', 'dev.tampa.user.favorite_added', 0),
  (lower(hex(randomblob(16))), 'providers_linked_3', 'Connected', 'Link 3 identity providers', '🔗', '#2196F3', 3, 'connected', 'dev.tampa.user.identity_linked', 1),
  (lower(hex(randomblob(16))), 'portfolio_items_1', 'Builder', 'Add a portfolio item', '🔨', '#FF9800', 1, 'builder', 'dev.tampa.user.portfolio_item_created', 2);

-- Profile visibility for public user directory (defaults to private)
ALTER TABLE `users` ADD COLUMN `profile_visibility` text NOT NULL DEFAULT 'private';
