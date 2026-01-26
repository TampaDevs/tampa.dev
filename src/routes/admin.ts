import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';

/**
 * GET /service/status - Service status and configuration info
 */
const serviceStatusRoute = createRoute({
  method: 'get',
  path: '/service/status',
  summary: 'Service status',
  description:
    'Returns service status and configuration information, including which event platforms are configured.',
  tags: ['Service'],
  responses: {
    200: {
      description: 'Service status',
      content: {
        'application/json': {
          schema: z.object({
            platforms: z.array(
              z.object({
                name: z.string(),
                configured: z.boolean(),
              })
            ),
            totalGroups: z.number(),
          }),
        },
      },
    },
  },
});

/**
 * Register service routes with the app
 */
export function registerAdminRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // Import platform registry here to ensure it's initialized
  const { platformRegistry } = require('../scheduled/platforms/base.js');
  const { getAllGroups } = require('../scheduled/groups.js');

  // GET /service/status - Service status
  app.openapi(serviceStatusRoute, async (c) => {
    const platforms = platformRegistry.getAll().map((p: any) => ({
      name: p.name,
      configured: p.isConfigured(c.env),
    }));

    const totalGroups = getAllGroups().length;

    return c.json({
      platforms,
      totalGroups,
    });
  });
}
