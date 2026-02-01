/**
 * Vitest setup file for integration tests.
 *
 * Initializes Miniflare once (beforeAll), cleans all data tables
 * before each test, and tears down Miniflare after all tests.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { initMiniflare, disposeMiniflare } from './global-setup';

// Tables in deletion order: children before parents
const TABLES_IN_DELETE_ORDER = [
  'user_onboarding',
  'user_follows',
  'badge_claim_links',
  'achievement_progress',
  'user_entitlements',
  'webhook_deliveries',
  'webhooks',
  'group_feature_flags',
  'user_feature_flags',
  'feature_flags',
  'user_portfolio_items',
  'user_badges',
  'badges',
  'achievements',
  'user_favorites',
  'group_creation_requests',
  'group_claim_invites',
  'group_claim_requests',
  'event_checkins',
  'event_checkin_codes',
  'event_rsvps',
  'group_platform_connections',
  'group_members',
  'api_tokens',
  'sessions',
  'user_identities',
  'onboarding_steps',
  'events',
  'sync_logs',
  'venues',
  'groups',
  'users',
];

beforeAll(async () => {
  await initMiniflare();
}, 30_000);

afterAll(async () => {
  await disposeMiniflare();
});

beforeEach(async () => {
  const { DB } = globalThis.__TEST_ENV__;
  for (const table of TABLES_IN_DELETE_ORDER) {
    try {
      await DB.exec(`DELETE FROM ${table}`);
    } catch {
      // Table may not exist in older migration states — safe to skip
    }
  }
});
