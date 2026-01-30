-- Webhooks: allow developers to register webhook URLs that receive domain events
CREATE TABLE `webhooks` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `url` text NOT NULL,
  `secret` text NOT NULL,
  `event_types` text NOT NULL DEFAULT '["*"]',
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `webhooks_user_idx` ON `webhooks` (`user_id`);

-- Webhook Deliveries: log of each delivery attempt
CREATE TABLE `webhook_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `webhook_id` text NOT NULL REFERENCES `webhooks`(`id`) ON DELETE CASCADE,
  `event_type` text NOT NULL,
  `payload` text NOT NULL,
  `status_code` integer,
  `response_body` text,
  `attempt` integer NOT NULL DEFAULT 1,
  `delivered_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `webhook_deliveries_webhook_idx` ON `webhook_deliveries` (`webhook_id`);
CREATE INDEX `webhook_deliveries_delivered_idx` ON `webhook_deliveries` (`delivered_at`);
