import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { EventController } from '../controllers/EventController.js';
import * as util from '../../lib/utils.js';
import Handlebars from 'handlebars/runtime.js';
import { hbsAsyncRender } from 'hbs-async-render';

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
 * Register widget routes with the app
 */
export function registerWidgetRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // GET /widget/next-event
  app.openapi(nextEventWidgetRoute, async (c) => {
    const events = await EventController.getNextEvents(c);
    const html = await hbsAsyncRender(Handlebars, 'widget-next-event', {
      events: events,
    });

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    c.header('Etag', util.cyrb53(html));

    return c.html(html);
  });

  // GET /widget/carousel
  app.openapi(carouselWidgetRoute, async (c) => {
    const events = await EventController.getAllEvents(c);
    const sortedEvents = util.getSortedEvents(events);
    const html = await hbsAsyncRender(Handlebars, 'widget-carousel', {
      events: sortedEvents,
    });

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Cache-Control', 'public, max-age=3600');
    c.header('Etag', util.cyrb53(html));

    return c.html(html);
  });
}
