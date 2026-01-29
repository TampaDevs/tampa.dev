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
