/**
 * WebSocket Upgrade Routes
 *
 * Two endpoints:
 *   GET /ws          — Personal WebSocket (requires session auth)
 *   GET /ws/broadcast — Public broadcast WebSocket (no auth)
 */

import { Hono } from 'hono';
import type { Env } from '../../types/worker.js';
import { getCurrentUser } from '../lib/auth.js';

export function createWSRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /ws — Personal WebSocket (auth required)
   *
   * Authenticates via session cookie, then forwards the upgrade
   * to the user's UserNotificationDO instance.
   */
  app.get('/', async (c) => {
    if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') {
      return c.json({ error: 'Expected WebSocket upgrade' }, 426);
    }

    const auth = await getCurrentUser(c);
    const userId = auth?.user.id ?? null;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!c.env.USER_NOTIFICATIONS) {
      return c.json({ error: 'WebSocket notifications not available' }, 503);
    }

    const id = c.env.USER_NOTIFICATIONS.idFromName(userId);
    const stub = c.env.USER_NOTIFICATIONS.get(id);

    // Forward the upgrade request to the DO with userId header for validation
    const doUrl = new URL(c.req.url);
    doUrl.pathname = '/websocket';
    const doHeaders = new Headers(c.req.raw.headers);
    doHeaders.set('X-User-Id', userId);
    return stub.fetch(new Request(doUrl.toString(), {
      headers: doHeaders,
      method: c.req.raw.method,
    }));
  });

  /**
   * GET /ws/broadcast — Public broadcast WebSocket (no auth)
   *
   * Forwards upgrade to the singleton BroadcastDO instance.
   */
  app.get('/broadcast', async (c) => {
    if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') {
      return c.json({ error: 'Expected WebSocket upgrade' }, 426);
    }

    if (!c.env.BROADCAST) {
      return c.json({ error: 'Broadcast not available' }, 503);
    }

    const id = c.env.BROADCAST.idFromName('global');
    const stub = c.env.BROADCAST.get(id);

    const doUrl = new URL(c.req.url);
    doUrl.pathname = '/websocket';
    return stub.fetch(new Request(doUrl.toString(), c.req.raw));
  });

  return app;
}

export const wsRoutes = createWSRoutes();
