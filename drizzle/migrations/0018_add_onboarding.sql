-- Onboarding steps and user progress
CREATE TABLE `onboarding_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `sort_order` integer NOT NULL DEFAULT 0,
  `event_key` text
);--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_steps_key_idx` ON `onboarding_steps` (`key`);--> statement-breakpoint

CREATE TABLE `user_onboarding` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `step_key` text NOT NULL,
  `completed_at` text,
  `dismissed` integer NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `step_key`)
);--> statement-breakpoint

-- Seed default onboarding steps
INSERT INTO `onboarding_steps` (`id`, `key`, `title`, `description`, `sort_order`, `event_key`) VALUES
  ('onb_1', 'set_username', 'Set your username', 'Choose a unique username for your profile', 1, 'dev.tampa.user.profile_updated'),
  ('onb_2', 'join_group', 'Favorite a group', 'Add any Tampa Bay tech group to your favorites', 2, 'dev.tampa.user.favorite_added'),
  ('onb_3', 'add_profile_content', 'Add social links or portfolio content', 'Share your GitHub, LinkedIn, website, or other links on your profile', 3, 'dev.tampa.user.profile_updated'),
  ('onb_4', 'reach_10_xp', 'Reach at least 10 XP', 'Earn XP by completing achievements and collecting badges', 4, 'dev.tampa.user.score_changed'),
  ('onb_5', 'follow_user', 'Follow a user', 'Follow someone in the Tampa Bay tech community', 5, 'dev.tampa.user.followed');
