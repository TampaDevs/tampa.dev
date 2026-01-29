import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import { EventQuerySchema } from './events.js';
import { EventsPage } from '../components/index.js';
import { getCachedResponse, cacheResponse, getSyncVersion, checkConditionalRequest, createNotModifiedResponse } from '../cache.js';

/**
 * GET /html - HTML page with upcoming events
 */
const htmlPageRoute = createRoute({
  method: 'get',
  path: '/html',
  summary: 'HTML page with upcoming events',
  description: 'Returns a formatted HTML page displaying upcoming events',
  tags: ['Pages'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'HTML page',
      content: {
        'text/html': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /upcoming-events - Alias for /html
 */
const upcomingEventsRoute = createRoute({
  method: 'get',
  path: '/upcoming-events',
  summary: 'Upcoming events HTML page',
  description: 'Alias for /html - returns a formatted HTML page displaying upcoming events',
  tags: ['Pages'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'HTML page',
      content: {
        'text/html': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * Register page routes with the app
 */
export function registerPageRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  const htmlHandler = async (c: any) => {
    const syncVersion = await getSyncVersion(c.env.DB);

    // Check for conditional request (If-None-Match)
    if (syncVersion && checkConditionalRequest(c.req.raw, syncVersion)) {
      return createNotModifiedResponse(syncVersion);
    }

    // Check cache first
    const cached = await getCachedResponse(c.req.raw, syncVersion || undefined);
    if (cached) {
      return cached;
    }

    // Generate fresh response
    const nextEvents = await EventController.getNextEvents(c);
    const html = await c.html(<EventsPage events={nextEvents} />);

    // Cache and return (pass waitUntil to ensure cache operation completes)
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(c.req.raw, html, syncVersion || undefined, waitUntil);
  };

  app.openapi(htmlPageRoute, htmlHandler);
  app.openapi(upcomingEventsRoute, htmlHandler);
}
