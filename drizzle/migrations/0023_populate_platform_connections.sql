-- Populate group_platform_connections from existing groups data.
-- Creates one connection row per existing group from its current platform/platformId fields.
-- This decouples sync from the groups table, enabling multi-platform aggregation.

INSERT INTO `group_platform_connections` (`id`, `group_id`, `platform`, `platform_id`, `platform_urlname`, `platform_link`, `is_active`, `last_sync_at`, `created_at`)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
  `id` as group_id,
  `platform`,
  `platform_id`,
  `urlname` as platform_urlname,
  `link` as platform_link,
  `is_active`,
  `last_sync_at`,
  datetime('now')
FROM `groups`
WHERE `platform` IN ('meetup', 'eventbrite', 'luma');
