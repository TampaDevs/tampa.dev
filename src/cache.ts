/**
 * Cloudflare Cache API wrapper for response caching
 *
 * Caches full responses based on URL with a 30-minute TTL.
 * Cache is automatically invalidated on deployment via version ID.
 */

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const CACHE_NAME = 'events-api-v1';

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
 * Includes version ID to invalidate cache on deployment
 */
function buildCacheKeyUrl(request: Request, cacheVersion?: string): string {
  const url = new URL(request.url);
  if (cacheVersion) {
    url.searchParams.set('_v', cacheVersion);
  }
  return url.toString();
}

/**
 * Try to get a cached response for the given request
 */
export async function getCachedResponse(
  request: Request,
  cacheVersion?: string
): Promise<Response | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKeyUrl = buildCacheKeyUrl(request, cacheVersion);

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
 * @param cacheVersion - Optional version for cache invalidation
 * @param waitUntil - Optional waitUntil function from execution context
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  cacheVersion?: string,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<Response> {
  // Clone the response first so we can return it
  const responseToReturn = response.clone();

  // Create a new response with cache headers for storage
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
  headers.set('X-Cache', 'MISS');

  const responseForClient = new Response(responseToReturn.body, {
    status: responseToReturn.status,
    statusText: responseToReturn.statusText,
    headers,
  });

  // Store in cache - use waitUntil if available to ensure completion
  const cacheOperation = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheKeyUrl = buildCacheKeyUrl(request, cacheVersion);
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
