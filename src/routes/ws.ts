/**
 * WebSocket Upgrade Routes
 *
 * Two endpoints:
 *   GET /ws          — Personal WebSocket (requires session auth)
 *   GET /ws/broadcast — Public broadcast WebSocket (no auth)
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { getSessionCookieName } from '../lib/session.js';
import type { Env } from '../../types/worker.js';

/**
 * Get user ID from session cookie, or null if not authenticated.
 */
async function getUserIdFromSession(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(env);
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionToken = match?.[1];
  if (!sessionToken) return null;

  const db = createDatabase(env.DB);
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) return null;
  return session.userId;
}

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

    const userId = await getUserIdFromSession(c.req.raw, c.env);
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!c.env.USER_NOTIFICATIONS) {
      return c.json({ error: 'WebSocket notifications not available' }, 503);
    }

    const id = c.env.USER_NOTIFICATIONS.idFromName(userId);
    const stub = c.env.USER_NOTIFICATIONS.get(id);

    // Forward the upgrade request to the DO
    const doUrl = new URL(c.req.url);
    doUrl.pathname = '/websocket';
    return stub.fetch(new Request(doUrl.toString(), c.req.raw));
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
