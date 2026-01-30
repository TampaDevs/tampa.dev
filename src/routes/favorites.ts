/**
 * Favorites API Routes
 *
 * Allows authenticated users to save and manage their favorite groups.
 * Supports syncing with localStorage for seamless cross-device experience.
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, inArray } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, groups, userFavorites } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { EventBus } from '../lib/event-bus.js';

/**
 * Helper to get the current user from session
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

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  return user;
}

export function createFavoritesRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/favorites - Get current user's favorites
   *
   * Returns list of favorited group slugs for the authenticated user.
   */
  app.get('/', async (c) => {
    const user = await getCurrentUser(c);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);

    const favorites = await db
      .select({
        groupId: userFavorites.groupId,
        urlname: groups.urlname,
        name: groups.name,
        photoUrl: groups.photoUrl,
        createdAt: userFavorites.createdAt,
      })
      .from(userFavorites)
      .innerJoin(groups, eq(userFavorites.groupId, groups.id))
      .where(eq(userFavorites.userId, user.id));

    return c.json({
      favorites: favorites.map((f) => ({
        groupSlug: f.urlname,
        groupName: f.name,
        groupPhotoUrl: f.photoUrl,
        groupId: f.groupId,
        createdAt: f.createdAt,
      })),
    });
  });

  /**
   * POST /api/favorites/:groupSlug - Add a group to favorites
   */
  app.post('/:groupSlug', async (c) => {
    const user = await getCurrentUser(c);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupSlug = c.req.param('groupSlug');
    const db = createDatabase(c.env.DB);

    // Find the group by urlname
    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, groupSlug),
    });

    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Check if already favorited
    const existing = await db.query.userFavorites.findFirst({
      where: and(
        eq(userFavorites.userId, user.id),
        eq(userFavorites.groupId, group.id)
      ),
    });

    if (existing) {
      return c.json({ success: true, message: 'Already favorited' });
    }

    // Add favorite
    await db.insert(userFavorites).values({
      id: crypto.randomUUID(),
      userId: user.id,
      groupId: group.id,
    });

    // Emit event for achievement tracking
    if (c.env.EVENTS_QUEUE) {
      const eventBus = new EventBus(c.env.EVENTS_QUEUE);
      eventBus.publish({
        type: 'user.favorite_added',
        payload: { userId: user.id, groupId: group.id },
        metadata: { userId: user.id, source: 'favorites' },
      }).catch(() => {}); // fire-and-forget
    }

    return c.json({ success: true });
  });

  /**
   * DELETE /api/favorites/:groupSlug - Remove a group from favorites
   */
  app.delete('/:groupSlug', async (c) => {
    const user = await getCurrentUser(c);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupSlug = c.req.param('groupSlug');
    const db = createDatabase(c.env.DB);

    // Find the group by urlname
    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, groupSlug),
    });

    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Remove favorite
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, user.id),
          eq(userFavorites.groupId, group.id)
        )
      );

    return c.json({ success: true });
  });

  /**
   * POST /api/favorites/sync - Sync localStorage favorites with server
   *
   * Accepts an array of group slugs and merges them with existing server favorites.
   * Returns the complete list of favorites after merge.
   */
  app.post('/sync', async (c) => {
    const user = await getCurrentUser(c);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<{ slugs: string[] }>().catch(() => ({ slugs: [] }));
    const localSlugs = body.slugs || [];

    const db = createDatabase(c.env.DB);

    // Get all groups by slugs
    const groupsToAdd =
      localSlugs.length > 0
        ? await db.query.groups.findMany({
            where: inArray(groups.urlname, localSlugs),
          })
        : [];

    // Get existing favorites
    const existingFavorites = await db
      .select({ groupId: userFavorites.groupId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, user.id));

    const existingGroupIds = new Set(existingFavorites.map((f) => f.groupId));

    // Add new favorites from localStorage
    const newFavorites = groupsToAdd.filter((g) => !existingGroupIds.has(g.id));

    if (newFavorites.length > 0) {
      await db.insert(userFavorites).values(
        newFavorites.map((g) => ({
          id: crypto.randomUUID(),
          userId: user.id,
          groupId: g.id,
        }))
      );

      // Emit events for achievement tracking (one per new favorite)
      if (c.env.EVENTS_QUEUE) {
        const eventBus = new EventBus(c.env.EVENTS_QUEUE);
        eventBus.publishBatch(
          newFavorites.map((g) => ({
            type: 'user.favorite_added',
            payload: { userId: user.id, groupId: g.id },
            metadata: { userId: user.id, source: 'favorites-sync' },
          }))
        ).catch(() => {}); // fire-and-forget
      }
    }

    // Return complete list of favorites
    const allFavorites = await db
      .select({
        urlname: groups.urlname,
        groupId: userFavorites.groupId,
        createdAt: userFavorites.createdAt,
      })
      .from(userFavorites)
      .innerJoin(groups, eq(userFavorites.groupId, groups.id))
      .where(eq(userFavorites.userId, user.id));

    return c.json({
      favorites: allFavorites.map((f) => ({
        groupSlug: f.urlname,
        groupId: f.groupId,
        createdAt: f.createdAt,
      })),
      added: newFavorites.length,
    });
  });

  return app;
}

export const favoritesRoutes = createFavoritesRoutes();
