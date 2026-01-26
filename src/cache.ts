/**
 * Cloudflare Cache API wrapper for response caching
 *
 * Uses data hash for cache invalidation - responses are cached indefinitely
 * until the underlying event data changes (detected via hash).
 */

import {
  CACHE_NAME,
  METADATA_EDGE_CACHE_TTL,
  RESPONSE_CACHE_MAX_AGE,
  STALE_WHILE_REVALIDATE,
} from './config/cache.js';

/**
 * Aggregation metadata stored in KV
 */
export interface AggregationMetadata {
  lastRunAt: string;
  durationMs: number;
  groupsProcessed: number;
  groupsFailed: number;
  dataHash: string;
  errors: string[];
}

/**
 * Get the current data hash from KV metadata
 * Uses edge caching to avoid KV reads on every request
 */
export async function getDataHash(kv: KVNamespace): Promise<string | null> {
  try {
    const metadataJson = await kv.get('aggregation_metadata', { cacheTtl: METADATA_EDGE_CACHE_TTL });
    if (metadataJson) {
      const metadata: AggregationMetadata = JSON.parse(metadataJson);
      return metadata.dataHash;
    }
  } catch {
    // Metadata not available
  }
  return null;
}

/**
 * Get the full aggregation metadata from KV
 * Uses edge caching to avoid KV reads on every request
 */
export async function getAggregationMetadata(kv: KVNamespace): Promise<AggregationMetadata | null> {
  try {
    const metadataJson = await kv.get('aggregation_metadata', { cacheTtl: METADATA_EDGE_CACHE_TTL });
    if (metadataJson) {
      return JSON.parse(metadataJson);
    }
  } catch {
    // Metadata not available
  }
  return null;
}

/**
 * Generate a hash of the event data (kept for backwards compatibility with tests)
 */
export function generateDataHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build a versioned cache key URL
 * Uses data hash for cache invalidation - when data changes, hash changes,
 * creating a new cache key and effectively invalidating old cached responses.
 */
function buildCacheKeyUrl(request: Request, dataHash?: string): string {
  const url = new URL(request.url);
  if (dataHash) {
    url.searchParams.set('_h', dataHash);
  }
  return url.toString();
}

/**
 * Try to get a cached response for the given request
 */
export async function getCachedResponse(
  request: Request,
  dataHash?: string
): Promise<Response | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKeyUrl = buildCacheKeyUrl(request, dataHash);

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
 * @param dataHash - Data hash for cache key (enables indefinite caching)
 * @param waitUntil - Optional waitUntil function from execution context
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  dataHash?: string,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<Response> {
  // Clone the response first so we can return it
  const responseToReturn = response.clone();

  // Create a new response with cache headers for storage
  const headers = new Headers(response.headers);

  // Use long cache with stale-while-revalidate
  // The data hash in the URL ensures we get fresh data when content changes
  headers.set(
    'Cache-Control',
    `public, max-age=${RESPONSE_CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`
  );
  headers.set('X-Cache', 'MISS');

  // Add ETag based on data hash for conditional requests
  if (dataHash) {
    headers.set('ETag', `"${dataHash}"`);
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
      const cacheKeyUrl = buildCacheKeyUrl(request, dataHash);
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
 */
export function checkConditionalRequest(request: Request, dataHash: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) {
    // Handle both quoted and unquoted ETags
    const etag = ifNoneMatch.replace(/^"|"$/g, '').replace(/^W\//, '');
    return etag === dataHash;
  }
  return false;
}

/**
 * Create a 304 Not Modified response
 */
export function createNotModifiedResponse(dataHash: string): Response {
  return new Response(null, {
    status: 304,
    headers: {
      'ETag': `"${dataHash}"`,
      'Cache-Control': `public, max-age=${RESPONSE_CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'X-Cache': 'NOT_MODIFIED',
    },
  });
}
