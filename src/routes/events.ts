import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import { getCachedResponse, cacheResponse, getSyncVersion, checkConditionalRequest, createNotModifiedResponse } from '../cache.js';

/**
 * Query parameters schema for event filtering
 */
export const EventQuerySchema = z.object({
  groups: z.string().optional().openapi({
    param: {
      name: 'groups',
      in: 'query',
    },
    description: 'Comma-separated list of group urlnames to filter (e.g., "tampadevs,suncoast-js")',
    example: 'tampadevs,suncoast-js',
  }),
  noonline: z.string().optional().openapi({
    param: {
      name: 'noonline',
      in: 'query',
    },
    description: 'Exclude online events (set to "1" to exclude)',
    example: '1',
  }),
  within_hours: z.string().optional().openapi({
    param: {
      name: 'within_hours',
      in: 'query',
    },
    description: 'Only show events within the next N hours',
    example: '24',
  }),
  within_days: z.string().optional().openapi({
    param: {
      name: 'within_days',
      in: 'query',
    },
    description: 'Only show events within the next N days',
    example: '7',
  }),
  noempty: z.string().optional().openapi({
    param: {
      name: 'noempty',
      in: 'query',
    },
    description: 'Exclude groups with no events (set to "1" to exclude)',
    example: '1',
  }),
});

/**
 * Event response schema (for OpenAPI documentation)
 */
const EventResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dateTime: z.string(),
  duration: z.string().optional(),
  eventUrl: z.string(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'DRAFT']),
  eventType: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']).optional(),
  rsvpCount: z.number(),
  venues: z.array(z.any()),
  photo: z.any().optional(),
  group: z.any(),
  address: z.string().nullish(),
  googleMapsUrl: z.string().nullish(),
  appleMapsUrl: z.string().nullish(),
  photoUrl: z.string().nullish(),
  isOnline: z.boolean(),
});

/**
 * GET /2026-01-25/events - Get all events
 */
const getAllEventsRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/events',
  summary: 'Get all events',
  description: 'Returns a list of all upcoming events, optionally filtered by query parameters',
  tags: ['Events'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'List of events',
      content: {
        'application/json': {
          schema: z.array(EventResponseSchema),
        },
      },
    },
    503: {
      description: 'Service unavailable - no event data',
      content: {
        'text/plain': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/events/next - Get next event per group
 */
const getNextEventsRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/events/next',
  summary: 'Get next event per group',
  description: 'Returns one upcoming event for each group (the next event)',
  tags: ['Events'],
  request: {
    query: EventQuerySchema,
  },
  responses: {
    200: {
      description: 'Next event for each group',
      content: {
        'application/json': {
          schema: z.array(EventResponseSchema),
        },
      },
    },
    503: {
      description: 'Service unavailable - no event data',
      content: {
        'text/plain': {
          schema: z.string(),
        },
      },
    },
  },
});

/**
 * Register event routes with the app
 */
export function registerEventRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // Handler for all events
  const allEventsHandler = async (c: any) => {
    try {
      const url = new URL(c.req.url);
      const noCache = url.searchParams.get('nocache') === '1';

      // Get sync version for cache key (enables indefinite caching until new sync completes)
      const syncVersion = noCache ? null : await getSyncVersion(c.env.DB, c.env.kv);

      // Check for conditional request (If-None-Match)
      if (syncVersion && checkConditionalRequest(c.req.raw, syncVersion)) {
        return createNotModifiedResponse(syncVersion);
      }

      // Check cache first (skip if nocache=1)
      if (!noCache) {
        const cached = await getCachedResponse(c.req.raw, syncVersion || undefined);
        if (cached) {
          return cached;
        }
      }

      // Generate fresh response
      const events = await EventController.getAllEvents(c);
      const json = events.map((e) => e.toJSON()) as z.infer<typeof EventResponseSchema>[];

      const response = new Response(JSON.stringify(json), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Cache and return (pass waitUntil to ensure cache operation completes)
      const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
      return cacheResponse(c.req.raw, response, syncVersion || undefined, waitUntil);
    } catch (error) {
      console.error('[Events] Error loading events:', error);
      return c.text('No event data available', 503);
    }
  };

  // Handler for next events
  const nextEventsHandler = async (c: any) => {
    try {
      // Get sync version for cache key (enables indefinite caching until new sync completes)
      const syncVersion = await getSyncVersion(c.env.DB, c.env.kv);

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
      const events = await EventController.getNextEvents(c);
      const json = events.map((e) => e.toJSON()) as z.infer<typeof EventResponseSchema>[];

      const response = new Response(JSON.stringify(json), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Cache and return (pass waitUntil to ensure cache operation completes)
      const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
      return cacheResponse(c.req.raw, response, syncVersion || undefined, waitUntil);
    } catch (error) {
      console.error('[Events] Error loading next events:', error);
      return c.text('No event data available', 503);
    }
  };

  // Versioned routes (OpenAPI documented)
  app.openapi(getAllEventsRoute, allEventsHandler);
  app.openapi(getNextEventsRoute, nextEventsHandler);

  // Legacy unversioned routes (for backwards compatibility)
  app.get('/events', allEventsHandler);
  app.get('/events/next', nextEventsHandler);
}
