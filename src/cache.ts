/**
 * Cloudflare Cache API wrapper for response caching
 *
 * Uses D1 sync timestamps for cache invalidation - responses are cached indefinitely
 * until a new sync completes (detected via latest sync timestamp).
 */

import {
  CACHE_NAME,
  RESPONSE_CACHE_MAX_AGE,
  STALE_WHILE_REVALIDATE,
} from './config/cache.js';
import { createDatabase } from './db/index.js';
import { syncLogs } from './db/schema.js';
import { desc, eq } from 'drizzle-orm';

/**
 * Bump the cache version by inserting a synthetic sync log entry.
 * This effectively invalidates all cached responses keyed on the sync version,
 * since a new version means new cache key URLs.
 */
export async function invalidateResponseCache(db: D1Database): Promise<void> {
  const drizzleDb = createDatabase(db);
  const now = new Date().toISOString();

  await drizzleDb.insert(syncLogs).values({
    id: crypto.randomUUID(),
    platform: 'admin',
    startedAt: now,
    completedAt: now,
    status: 'success',
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
  });
}

/**
 * Sync metadata from D1
 */
export interface SyncMetadata {
  lastSyncAt: string;
  status: string;
  eventsCreated: number;
  eventsUpdated: number;
}

/**
 * Get the latest sync timestamp from D1 for cache invalidation
 * Returns a hash-like string derived from the latest sync completion time
 */
export async function getSyncVersion(db: D1Database): Promise<string | null> {
  try {
    const drizzleDb = createDatabase(db);

    // Get the most recent successful sync
    const latestSync = await drizzleDb.query.syncLogs.findFirst({
      where: eq(syncLogs.status, 'success'),
      orderBy: [desc(syncLogs.completedAt)],
    });

    if (latestSync?.completedAt) {
      // Convert timestamp to a short hash for cache key
      // Using base36 encoding of timestamp for compactness
      const timestamp = new Date(latestSync.completedAt).getTime();
      return timestamp.toString(36);
    }
  } catch {
    // Database not available
  }
  return null;
}

/**
 * Get sync metadata from D1
 */
export async function getSyncMetadata(db: D1Database): Promise<SyncMetadata | null> {
  try {
    const drizzleDb = createDatabase(db);

    const latestSync = await drizzleDb.query.syncLogs.findFirst({
      where: eq(syncLogs.status, 'success'),
      orderBy: [desc(syncLogs.completedAt)],
    });

    if (latestSync) {
      return {
        lastSyncAt: latestSync.completedAt || latestSync.startedAt,
        status: latestSync.status,
        eventsCreated: latestSync.eventsCreated || 0,
        eventsUpdated: latestSync.eventsUpdated || 0,
      };
    }
  } catch {
    // Database not available
  }
  return null;
}

/**
 * Generate a hash from a string (utility function)
 */
export function generateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Alias for backwards compatibility with tests
export const generateDataHash = generateHash;

/**
 * Build a versioned cache key URL
 * Uses sync version for cache invalidation - when a new sync completes,
 * version changes, creating a new cache key and effectively invalidating old responses.
 */
function buildCacheKeyUrl(request: Request, syncVersion?: string): string {
  const url = new URL(request.url);
  if (syncVersion) {
    url.searchParams.set('_v', syncVersion);
  }
  return url.toString();
}

/**
 * Try to get a cached response for the given request
 * @param request - The original request
 * @param syncVersion - Sync version for cache key (from getSyncVersion)
 */
export async function getCachedResponse(
  request: Request,
  syncVersion?: string
): Promise<Response | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKeyUrl = buildCacheKeyUrl(request, syncVersion);

    const cachedResponse = await cache.match(cacheKeyUrl);

    if (cachedResponse) {
      // Clone the response and add a header indicating cache hit
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'HIT');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }
  } catch {
    // Cache API not available or failed - continue without cache
  }

  return null;
}

/**
 * Cache a response for the given request
 * @param request - The original request
 * @param response - The response to cache
 * @param syncVersion - Sync version for cache key (enables indefinite caching)
 * @param waitUntil - Optional waitUntil function from execution context
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  syncVersion?: string,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<Response> {
  // Clone the response first so we can return it
  const responseToReturn = response.clone();

  // Create a new response with cache headers for storage
  const headers = new Headers(response.headers);

  // Use long cache with stale-while-revalidate
  // The sync version in the URL ensures we get fresh data when a new sync completes
  headers.set(
    'Cache-Control',
    `public, max-age=${RESPONSE_CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
  );
  headers.set('X-Cache', 'MISS');

  // Add ETag based on sync version for conditional requests
  if (syncVersion) {
    headers.set('ETag', `"${syncVersion}"`);
  }

  const responseForClient = new Response(responseToReturn.body, {
    status: responseToReturn.status,
    statusText: responseToReturn.statusText,
    headers,
  });

  // Store in cache - use waitUntil if available to ensure completion
  const cacheOperation = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheKeyUrl = buildCacheKeyUrl(request, syncVersion);
      await cache.put(cacheKeyUrl, responseForClient.clone());
    } catch {
      // Cache API not available or failed - continue without caching
    }
  })();

  if (waitUntil) {
    waitUntil(cacheOperation);
  }

  return responseForClient;
}

/**
 * Check if the request has a matching ETag (for 304 responses)
 * @param request - The request to check
 * @param syncVersion - The current sync version
 */
export function checkConditionalRequest(request: Request, syncVersion: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) {
    // Handle weak ETags (W/"...") and quoted ETags ("...")
    // First remove the weak prefix, then remove quotes
    const etag = ifNoneMatch.replace(/^W\//, '').replace(/^"|"$/g, '');
    return etag === syncVersion;
  }
  return false;
}

/**
 * Create a 304 Not Modified response
 * @param syncVersion - The current sync version for ETag
 */
export function createNotModifiedResponse(syncVersion: string): Response {
  return new Response(null, {
    status: 304,
    headers: {
      'ETag': `"${syncVersion}"`,
      'Cache-Control': `public, max-age=${RESPONSE_CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'X-Cache': 'NOT_MODIFIED',
    },
  });
}
