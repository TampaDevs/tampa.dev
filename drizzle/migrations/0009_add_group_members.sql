-- Group Members: models group-to-user relationships (owner, admin, member)
CREATE TABLE `group_members` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'member',
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `group_members_group_idx` ON `group_members` (`group_id`);
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);
CREATE UNIQUE INDEX `group_members_group_user_idx` ON `group_members` (`group_id`, `user_id`);
