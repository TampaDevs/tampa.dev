import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import { FeedController } from '../controllers/FeedController.js';
import { EventQuerySchema } from './events.js';
import { getCachedResponse, cacheResponse, getDataHash, checkConditionalRequest, createNotModifiedResponse } from '../cache.js';

/**
 * GET /2026-01-25/rss - RSS feed
 */
const rssRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/rss',
  summary: 'Get RSS feed',
  description: 'Returns events as an RSS 2.0 feed',
  tags: ['Feeds'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'RSS feed',
      content: {
        'application/rss+xml': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/feed - Alias for RSS feed
 */
const feedRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/feed',
  summary: 'Get RSS feed (alias)',
  description: 'Alias for /rss - returns events as an RSS 2.0 feed',
  tags: ['Feeds'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'RSS feed',
      content: {
        'application/rss+xml': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/ics - iCalendar feed
 */
const icsRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/ics',
  summary: 'Get iCalendar feed',
  description: 'Returns events as an iCalendar (.ics) feed',
  tags: ['Feeds'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'iCalendar feed',
      content: {
        'text/calendar': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/ical - Alias for iCalendar feed
 */
const icalRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/ical',
  summary: 'Get iCalendar feed (alias)',
  description: 'Alias for /ics - returns events as an iCalendar (.ics) feed',
  tags: ['Feeds'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'iCalendar feed',
      content: {
        'text/calendar': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/webcal - Webcal feed (iCalendar with webcal:// protocol hint)
 */
const webcalRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/webcal',
  summary: 'Get webcal feed',
  description: 'Returns events as an iCalendar feed (same as /ics, for webcal:// protocol)',
  tags: ['Feeds'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'iCalendar feed',
      content: {
        'text/calendar': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * Register feed routes with the app
 */
export function registerFeedRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // RSS handler
  const rssHandler = async (c: any) => {
    const dataHash = await getDataHash(c.env.kv);

    // Check for conditional request (If-None-Match)
    if (dataHash && checkConditionalRequest(c.req.raw, dataHash)) {
      return createNotModifiedResponse(dataHash);
    }

    // Check cache first
    const cached = await getCachedResponse(c.req.raw, dataHash || undefined);
    if (cached) {
      return cached;
    }

    // Generate fresh response
    const events = await EventController.getAllEvents(c);
    const rss = FeedController.generateRSS(events, c.req.raw);

    const response = new Response(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    });

    // Cache and return (pass waitUntil to ensure cache operation completes)
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(c.req.raw, response, dataHash || undefined, waitUntil);
  };

  // iCalendar handler
  const icalHandler = async (c: any) => {
    const dataHash = await getDataHash(c.env.kv);

    // Check for conditional request (If-None-Match)
    if (dataHash && checkConditionalRequest(c.req.raw, dataHash)) {
      return createNotModifiedResponse(dataHash);
    }

    // Check cache first
    const cached = await getCachedResponse(c.req.raw, dataHash || undefined);
    if (cached) {
      return cached;
    }

    // Generate fresh response
    const events = await EventController.getAllEvents(c);
    const ical = FeedController.generateICal(events);

    const response = new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
      },
    });

    // Cache and return (pass waitUntil to ensure cache operation completes)
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(c.req.raw, response, dataHash || undefined, waitUntil);
  };

  // Versioned RSS routes
  app.openapi(rssRoute, rssHandler);
  app.openapi(feedRoute, rssHandler);

  // Versioned iCalendar routes
  app.openapi(icsRoute, icalHandler);
  app.openapi(icalRoute, icalHandler);
  app.openapi(webcalRoute, icalHandler);

  // Unversioned RSS routes (for convenience)
  app.get('/rss', rssHandler);
  app.get('/feed', rssHandler);

  // Unversioned iCalendar routes (for convenience)
  app.get('/ics', icalHandler);
  app.get('/ical', icalHandler);
  app.get('/webcal', icalHandler);
}
