import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { getSyncMetadata } from '../cache.js';

/**
 * Register admin/service routes with the app
 * These routes are NOT included in the OpenAPI documentation (internal use only)
 */
export function registerAdminRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // Import platform registry here to ensure it's initialized
  const { platformRegistry } = require('../scheduled/platforms/base.js');
  const { getAllGroups } = require('../scheduled/groups.js');

  // GET /service/status - Service status (not in OpenAPI docs)
  app.get('/service/status', async (c) => {
    const platforms = platformRegistry.getAll().map((p: any) => ({
      name: p.name,
      configured: p.isConfigured(c.env),
    }));

    const groups = getAllGroups().map((g: any) => ({
      urlname: g.urlname,
      platform: g.platform,
    }));

    const totalGroups = groups.length;

    // Get sync metadata from D1
    const syncMetadata = await getSyncMetadata(c.env.DB);

    return c.json({
      platforms,
      groups,
      totalGroups,
      sync: syncMetadata,
    });
  });
}
