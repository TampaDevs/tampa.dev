-- Achievement conditions, progress mode, and hidden flag
ALTER TABLE `achievements` ADD COLUMN `conditions` text;
ALTER TABLE `achievements` ADD COLUMN `progress_mode` text;
ALTER TABLE `achievements` ADD COLUMN `gauge_field` text;
ALTER TABLE `achievements` ADD COLUMN `hidden` integer NOT NULL DEFAULT 0;

-- Claim link custom event emission
ALTER TABLE `badge_claim_links` ADD COLUMN `emit_event_type` text;
ALTER TABLE `badge_claim_links` ADD COLUMN `emit_event_payload` text;
