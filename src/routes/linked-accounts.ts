/**
 * Linked Accounts API Routes
 *
 * Returns the current user's connected OAuth providers.
 * Excludes sensitive data (tokens).
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, userIdentities } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';

/**
 * Get current user from session cookie
 */
async function getCurrentUser(c: { env: Env; req: { raw: Request } }) {
  const cookieHeader = c.req.raw.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(c.env);
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionToken = sessionMatch?.[1];
  if (!sessionToken) return null;

  const db = createDatabase(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
}

export function createLinkedAccountsRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /me/linked-accounts - List user's connected providers
   *
   * Returns provider info without tokens.
   */
  app.get('/', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);

    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, user.id),
    });

    return c.json({
      linkedAccounts: identities.map((i) => ({
        provider: i.provider,
        providerUsername: i.providerUsername,
        providerEmail: i.providerEmail,
        createdAt: i.createdAt,
      })),
    });
  });

  return app;
}

export const linkedAccountsRoutes = createLinkedAccountsRoutes();
