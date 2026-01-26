/**
 * Cloudflare Cache API wrapper for response caching
 *
 * Caches full responses based on URL with a 30-minute TTL.
 * Cache is automatically invalidated on deployment via CACHE_VERSION.
 */

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

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
 * Build a versioned cache key from the request
 * Includes CACHE_VERSION to invalidate cache on deployment
 */
function buildCacheKey(request: Request, cacheVersion?: string): Request {
  if (!cacheVersion) {
    return request;
  }

  const url = new URL(request.url);
  url.searchParams.set('_v', cacheVersion);

  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
  });
}

/**
 * Try to get a cached response for the given request
 */
export async function getCachedResponse(
  request: Request,
  cacheVersion?: string
): Promise<Response | null> {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request, cacheVersion);

  const cachedResponse = await cache.match(cacheKey);

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

  return null;
}

/**
 * Cache a response for the given request
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  cacheVersion?: string
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request, cacheVersion);

  // Clone the response to cache it
  const responseToCache = response.clone();

  // Create a new response with cache headers
  const headers = new Headers(responseToCache.headers);
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
  headers.set('X-Cache', 'MISS');

  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers,
  });

  // Store in cache (don't await - fire and forget)
  cache.put(cacheKey, cachedResponse.clone());

  return cachedResponse;
}
