-- API tokens for Personal Access Token (PAT) authentication
CREATE TABLE `api_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `token_hash` text NOT NULL,
  `token_prefix` text NOT NULL,
  `scopes` text NOT NULL DEFAULT '[]',
  `last_used_at` text,
  `expires_at` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `api_tokens_user_idx` ON `api_tokens` (`user_id`);
CREATE UNIQUE INDEX `api_tokens_hash_idx` ON `api_tokens` (`token_hash`);
