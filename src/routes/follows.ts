/**
 * User Following API Routes
 *
 * Endpoints for following/unfollowing users and listing followers/following.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, userFollows } from '../db/schema';
import type { Env } from '../../types/worker';
import { getCurrentUser } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, success, list, unauthorized, notFound, badRequest, parsePagination } from '../lib/responses.js';

export function createFollowsRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * POST /users/:username/follow - Follow a user
   */
  app.post('/users/:username/follow', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const currentUser = auth.user;

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    // Look up target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) return notFound(c, 'User not found');

    if (targetUser.id === currentUser.id) {
      return badRequest(c, 'Cannot follow yourself');
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    if (existing) {
      return success(c, { message: 'Already following' });
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

    return success(c);
  });

  /**
   * DELETE /users/:username/follow - Unfollow a user
   */
  app.delete('/users/:username/follow', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const currentUser = auth.user;

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) return notFound(c, 'User not found');

    await db.delete(userFollows).where(
      and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    );

    return success(c);
  });

  /**
   * GET /users/:username/followers - List user's followers with pagination
   */
  app.get('/users/:username/followers', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const { limit, offset } = parsePagination(c);

    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) return notFound(c, 'User not found');

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

    return list(c, followers.filter(Boolean), { total, limit, offset });
  });

  /**
   * GET /users/:username/following - List who a user is following with pagination
   */
  app.get('/users/:username/following', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const { limit, offset } = parsePagination(c);

    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) return notFound(c, 'User not found');

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

    return list(c, following.filter(Boolean), { total, limit, offset });
  });

  /**
   * GET /me/following/:username - Check if current user follows a target user
   */
  app.get('/me/following/:username', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const currentUser = auth.user;

    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!targetUser) return notFound(c, 'User not found');

    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    return ok(c, { following: !!existing });
  });

  return app;
}

export const followsRoutes = createFollowsRoutes();
