/**
 * Cache Configuration
 *
 * Centralized cache settings for easy tuning.
 * All durations are in seconds.
 */

/**
 * Response cache max-age
 * How long browsers/CDNs should cache responses.
 * Set very high since cache key includes sync version - new sync = new cache key.
 */
export const RESPONSE_CACHE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Stale-while-revalidate window
 * How long stale responses can be served while fetching fresh data in background.
 */
export const STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour

/**
 * Cache namespace for Cloudflare Cache API
 */
export const CACHE_NAME = 'events-api-v1';

// ============== KV Cache Keys ==============

/** KV key for cached sync version (D1 sync_logs latest timestamp) */
export const KV_KEY_SYNC_VERSION = 'cache:sync-version';
/** TTL for cached sync version (seconds). Syncs happen every 30 min. */
export const KV_TTL_SYNC_VERSION = 30;

/** KV key for cached group favorites aggregation counts */
export const KV_KEY_FAV_COUNTS = 'cache:fav-counts';
/** TTL for cached favorites counts (seconds) */
export const KV_TTL_FAV_COUNTS = 60;

/** KV key for cached total public users count (profileVisibility='public' + username set) */
export const KV_KEY_TOTAL_PUBLIC_USERS = 'cache:total-public-users';
/** TTL for cached total public users count (seconds). Changes infrequently. */
export const KV_TTL_TOTAL_PUBLIC_USERS = 300; // 5 minutes

/** KV key for cached badge holder counts (JSON map of badgeId → count) */
export const KV_KEY_BADGE_HOLDER_COUNTS = 'cache:badge-holder-counts';
/** TTL for cached badge holder counts (seconds). Changes on badge award/revoke. */
export const KV_TTL_BADGE_HOLDER_COUNTS = 300; // 5 minutes
