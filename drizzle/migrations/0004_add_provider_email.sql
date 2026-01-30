-- Add provider_email to user_identities for account linking and primary email selection
ALTER TABLE `user_identities` ADD COLUMN `provider_email` text;
