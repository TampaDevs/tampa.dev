/**
 * Linked Accounts API Routes
 *
 * Returns the current user's connected OAuth providers.
 * Excludes sensitive data (tokens).
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { userIdentities } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionUser } from '../lib/auth.js';
import { ok, unauthorized } from '../lib/responses.js';

export function createLinkedAccountsRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /me/linked-accounts - List user's connected providers
   *
   * Returns provider info without tokens.
   */
  app.get('/', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);

    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, user.id),
    });

    return ok(c, identities.map((i) => ({
      provider: i.provider,
      providerUsername: i.providerUsername,
      providerEmail: i.providerEmail,
      createdAt: i.createdAt,
    })));
  });

  return app;
}

export const linkedAccountsRoutes = createLinkedAccountsRoutes();
