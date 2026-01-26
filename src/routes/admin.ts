import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { getAggregationMetadata } from '../cache.js';

/**
 * GET /service/status - Service status and configuration info
 */
const serviceStatusRoute = createRoute({
  method: 'get',
  path: '/service/status',
  summary: 'Service status',
  description:
    'Returns service status and configuration information, including platforms, groups, and aggregation diagnostics.',
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
            groups: z.array(
              z.object({
                urlname: z.string(),
                platform: z.string(),
              })
            ),
            totalGroups: z.number(),
            aggregation: z
              .object({
                lastRunAt: z.string().nullable(),
                durationMs: z.number().nullable(),
                groupsProcessed: z.number().nullable(),
                groupsFailed: z.number().nullable(),
                dataHash: z.string().nullable(),
                errors: z.array(z.string()),
              })
              .nullable(),
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

    const groups = getAllGroups().map((g: any) => ({
      urlname: g.urlname,
      platform: g.platform,
    }));

    const totalGroups = groups.length;

    // Get aggregation metadata from KV
    const metadata = await getAggregationMetadata(c.env.kv);

    const aggregation = metadata
      ? {
          lastRunAt: metadata.lastRunAt,
          durationMs: metadata.durationMs,
          groupsProcessed: metadata.groupsProcessed,
          groupsFailed: metadata.groupsFailed,
          dataHash: metadata.dataHash,
          errors: metadata.errors,
        }
      : null;

    return c.json({
      platforms,
      groups,
      totalGroups,
      aggregation,
    });
  });
}
