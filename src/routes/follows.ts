/**
 * User Following API Routes
 *
 * Endpoints for following/unfollowing users and listing followers/following.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, userFollows } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { emitEvent } from '../lib/event-bus.js';

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

export function createFollowsRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * POST /users/:username/follow - Follow a user
   */
  app.post('/users/:username/follow', async (c) => {
    const currentUser = await getCurrentUser(c);
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    // Look up target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (targetUser.id === currentUser.id) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    if (existing) {
      return c.json({ success: true, message: 'Already following' });
    }

    await db.insert(userFollows).values({
      followerId: currentUser.id,
      followedId: targetUser.id,
    });

    // Emit event
    emitEvent(c, {
      type: 'dev.tampa.user.followed',
      payload: { followerId: currentUser.id, followedId: targetUser.id },
      metadata: { userId: currentUser.id, source: 'follows' },
    });

    return c.json({ success: true });
  });

  /**
   * DELETE /users/:username/follow - Unfollow a user
   */
  app.delete('/users/:username/follow', async (c) => {
    const currentUser = await getCurrentUser(c);
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    await db.delete(userFollows).where(
      and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    );

    return c.json({ success: true });
  });

  /**
   * GET /users/:username/followers - List user's followers with pagination
   */
  app.get('/users/:username/followers', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const limit = Math.min(Math.max(Number(c.req.query('limit') || '20'), 1), 100);
    const offset = Math.max(Number(c.req.query('offset') || '0'), 0);

    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get follower count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userFollows)
      .where(eq(userFollows.followedId, targetUser.id));
    const total = countResult[0]?.count ?? 0;

    // Get paginated followers
    const followerRows = await db
      .select({
        followerId: userFollows.followerId,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .where(eq(userFollows.followedId, targetUser.id))
      .limit(limit)
      .offset(offset);

    // Enrich with user info
    const followers = await Promise.all(
      followerRows.map(async (row) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, row.followerId),
        });
        return user ? {
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          followedAt: row.createdAt,
        } : null;
      })
    );

    return c.json({
      followers: followers.filter(Boolean),
      total,
      limit,
      offset,
    });
  });

  /**
   * GET /users/:username/following - List who a user is following with pagination
   */
  app.get('/users/:username/following', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const limit = Math.min(Math.max(Number(c.req.query('limit') || '20'), 1), 100);
    const offset = Math.max(Number(c.req.query('offset') || '0'), 0);

    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get following count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userFollows)
      .where(eq(userFollows.followerId, targetUser.id));
    const total = countResult[0]?.count ?? 0;

    // Get paginated following
    const followingRows = await db
      .select({
        followedId: userFollows.followedId,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .where(eq(userFollows.followerId, targetUser.id))
      .limit(limit)
      .offset(offset);

    // Enrich with user info
    const following = await Promise.all(
      followingRows.map(async (row) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, row.followedId),
        });
        return user ? {
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          followedAt: row.createdAt,
        } : null;
      })
    );

    return c.json({
      following: following.filter(Boolean),
      total,
      limit,
      offset,
    });
  });

  /**
   * GET /me/following/:username - Check if current user follows a target user
   */
  app.get('/me/following/:username', async (c) => {
    const currentUser = await getCurrentUser(c);
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    return c.json({ following: !!existing });
  });

  return app;
}

export const followsRoutes = createFollowsRoutes();
