-- Add missing indexes on frequently filtered columns
CREATE INDEX IF NOT EXISTS `users_profile_visibility_idx` ON `users` (`profile_visibility`);
CREATE INDEX IF NOT EXISTS `users_role_idx` ON `users` (`role`);
