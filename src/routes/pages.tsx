import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import * as util from '../../lib/utils.js';
import { EventQuerySchema } from './events.js';
import { EventsPage } from '../components/index.js';

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
    const nextEvents = await EventController.getNextEvents(c);

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    c.header('Etag', EventController.generateETag({ events: nextEvents }));

    return c.html(<EventsPage events={nextEvents} />);
  };

  app.openapi(htmlPageRoute, htmlHandler);
  app.openapi(upcomingEventsRoute, htmlHandler);
}
