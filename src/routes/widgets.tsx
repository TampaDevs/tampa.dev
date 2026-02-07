import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import * as util from '../../lib/utils.js';
import { WidgetNextEvent, WidgetCarousel } from '../components/index.js';
import { getCachedResponse, cacheResponse, getSyncVersion, checkConditionalRequest, createNotModifiedResponse } from '../cache.js';

/**
 * Widget query parameters
 */
const WidgetQuerySchema = z.object({
  groups: z.string().optional().openapi({
    param: {
      name: 'groups',
      in: 'query',
    },
    description: 'Comma-separated list of group URL names to filter by',
    example: 'tampadevs,suncoast-js',
  }),
});

/**
 * GET /widget/next-event - HTML widget for next event
 */
const nextEventWidgetRoute = createRoute({
  method: 'get',
  path: '/widget/next-event',
  summary: 'Next event HTML widget',
  description: 'Returns an HTML widget showing the next upcoming event',
  tags: ['Widgets'],
  request: {
    query: WidgetQuerySchema,
  },
  responses: {
    200: {
      description: 'HTML widget',
      content: {
        'text/html': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /widget/carousel - HTML carousel widget
 */
const carouselWidgetRoute = createRoute({
  method: 'get',
  path: '/widget/carousel',
  summary: 'Carousel HTML widget',
  description: 'Returns an HTML carousel widget showing upcoming events',
  tags: ['Widgets'],
  request: {
    query: WidgetQuerySchema,
  },
  responses: {
    200: {
      description: 'HTML carousel widget',
      content: {
        'text/html': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * Extract the visitor's IANA timezone from Cloudflare's geolocation data.
 * Falls back to America/New_York (Tampa Bay local time).
 */
function getVisitorTimeZone(request: Request): string {
  const cf = (request as unknown as { cf?: { timezone?: string } }).cf;
  return cf?.timezone || 'America/New_York';
}

/**
 * Create a cache-key request that includes the visitor's timezone,
 * so different timezones get separately cached responses.
 */
function withTimeZoneCacheKey(request: Request, timeZone: string): Request {
  const url = new URL(request.url);
  url.searchParams.set('_tz', timeZone);
  return new Request(url.toString(), request);
}

/**
 * Register widget routes with the app
 */
export function registerWidgetRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // GET /widget/next-event
  app.openapi(nextEventWidgetRoute, async (c) => {
    const syncVersion = await getSyncVersion(c.env.DB, c.env.kv);
    const timeZone = getVisitorTimeZone(c.req.raw);
    const cacheReq = withTimeZoneCacheKey(c.req.raw, timeZone);

    // Check for conditional request (If-None-Match)
    if (syncVersion && checkConditionalRequest(cacheReq, syncVersion)) {
      return createNotModifiedResponse(syncVersion);
    }

    // Check cache first (keyed by timezone)
    const cached = await getCachedResponse(cacheReq, syncVersion || undefined);
    if (cached) {
      return cached;
    }

    // Generate fresh response with visitor's timezone
    const events = await EventController.getNextEvents(c);
    const html = await c.html(<WidgetNextEvent events={events} timeZone={timeZone} />);

    // Cache and return (pass waitUntil to ensure cache operation completes)
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(cacheReq, html, syncVersion || undefined, waitUntil);
  });

  // GET /widget/carousel
  app.openapi(carouselWidgetRoute, async (c) => {
    const syncVersion = await getSyncVersion(c.env.DB, c.env.kv);
    const timeZone = getVisitorTimeZone(c.req.raw);
    const cacheReq = withTimeZoneCacheKey(c.req.raw, timeZone);

    // Check for conditional request (If-None-Match)
    if (syncVersion && checkConditionalRequest(cacheReq, syncVersion)) {
      return createNotModifiedResponse(syncVersion);
    }

    // Check cache first (keyed by timezone)
    const cached = await getCachedResponse(cacheReq, syncVersion || undefined);
    if (cached) {
      return cached;
    }

    // Generate fresh response with visitor's timezone
    const events = await EventController.getAllEvents(c);
    const sortedEvents = util.getSortedEvents(events);
    const html = await c.html(<WidgetCarousel events={sortedEvents} timeZone={timeZone} />);

    // Cache and return (pass waitUntil to ensure cache operation completes)
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(cacheReq, html, syncVersion || undefined, waitUntil);
  });
}
