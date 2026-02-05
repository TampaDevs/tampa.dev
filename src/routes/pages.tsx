import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';

/**
 * GET /html - Deprecated, redirects to calendar
 */
const htmlPageRoute = createRoute({
  method: 'get',
  path: '/html',
  summary: 'Deprecated — redirects to calendar',
  description: 'Formerly returned an HTML page with upcoming events. Now redirects to the calendar.',
  tags: ['Pages'],
  responses: {
    301: {
      description: 'Permanent redirect to calendar',
    },
  },
});

/**
 * GET /upcoming-events - Deprecated, redirects to calendar
 */
const upcomingEventsRoute = createRoute({
  method: 'get',
  path: '/upcoming-events',
  summary: 'Deprecated — redirects to calendar',
  description: 'Formerly returned an HTML page with upcoming events. Now redirects to the calendar.',
  tags: ['Pages'],
  responses: {
    301: {
      description: 'Permanent redirect to calendar',
    },
  },
});

/**
 * Register page routes with the app
 */
export function registerPageRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  const redirectHandler = async (c: any) => {
    return c.redirect('https://tampa.dev/calendar', 301);
  };

  app.openapi(htmlPageRoute, redirectHandler);
  app.openapi(upcomingEventsRoute, redirectHandler);
}
