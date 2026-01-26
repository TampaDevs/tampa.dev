/**
 * Cloudflare Cache API wrapper for response caching
 *
 * Caches full responses based on URL + event data hash.
 * Responses are invalidated when:
 * - Event data changes (hash mismatch)
 * - 30 minutes have passed (TTL)
 */

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

/**
 * Generate a hash of the event data for cache invalidation
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
 * Build a cache key from the request URL and data hash
 */
function buildCacheKey(request: Request, dataHash: string): string {
  const url = new URL(request.url);
  // Include the data hash in the cache key URL
  url.searchParams.set('_dataHash', dataHash);
  return url.toString();
}

/**
 * Try to get a cached response for the given request
 */
export async function getCachedResponse(
  request: Request,
  dataHash: string
): Promise<Response | null> {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request, dataHash);

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
  dataHash: string
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = buildCacheKey(request, dataHash);

  // Clone the response to cache it
  const responseToCache = response.clone();

  // Create a new response with cache headers
  const headers = new Headers(responseToCache.headers);
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
  headers.set('X-Cache', 'MISS');
  headers.set('X-Data-Hash', dataHash);

  const cachedResponse = new Response(responseToCache.body, {
    status: responseToCache.status,
    statusText: responseToCache.statusText,
    headers,
  });

  // Store in cache (don't await - fire and forget)
  cache.put(cacheKey, cachedResponse.clone());

  return cachedResponse;
}

/**
 * Wrapper for cached route handlers
 *
 * Usage:
 * ```
 * const handler = withCache(async (c) => {
 *   // Your handler logic
 *   return c.json(data);
 * });
 * ```
 */
export function withCache<T>(
  handler: (c: T) => Promise<Response>,
  getDataHash: (c: T) => Promise<string>
) {
  return async (c: T & { req: { raw: Request } }): Promise<Response> => {
    const request = c.req.raw;
    const dataHash = await getDataHash(c);

    // Try to get cached response
    const cached = await getCachedResponse(request, dataHash);
    if (cached) {
      return cached;
    }

    // Generate fresh response
    const response = await handler(c);

    // Cache and return
    return cacheResponse(request, response, dataHash);
  };
}
