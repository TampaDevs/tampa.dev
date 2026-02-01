/**
 * Rate Limiting Middleware
 *
 * KV-based sliding window rate limiter for Cloudflare Workers.
 * Uses CF-Connecting-IP (or X-Forwarded-For) to identify clients.
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import type { Env } from '../../types/worker';

export interface RateLimitOptions {
  prefix: string;
  maxRequests: number;
  windowSeconds: number;
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const kv = c.env.kv;

    // Skip rate limiting if KV is unavailable
    if (!kv) {
      await next();
      return;
    }

    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';

    const key = `rate:${ip}:${opts.prefix}`;

    try {
      const current = await kv.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= opts.maxRequests) {
        c.header('Retry-After', String(opts.windowSeconds));
        return c.json({ error: 'Too many requests' }, 429);
      }

      await kv.put(key, String(count + 1), {
        expirationTtl: opts.windowSeconds,
      });
    } catch {
      // If KV operations fail, allow the request through
    }

    await next();
  };
}
