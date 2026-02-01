/**
 * Leaderboard API Routes
 *
 * Returns users ranked by XP score (sum of badge points).
 * Only includes users with public profiles who have opted in to showing achievements.
 */

import { Hono } from 'hono';
import { sql, eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { userBadges, badges, groups } from '../db/schema';
import type { Env } from '../../types/worker';
import { ok, notFound, parsePagination } from '../lib/responses.js';

export function createLeaderboardRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/leaderboard - Get XP leaderboard
   *
   * Query params:
   *   - limit: number of entries (default 50, max 100)
   *   - offset: pagination offset (default 0)
   *
   * Returns users ranked by XP score (SUM of badge points, DESC).
   * Users must have at least one badge with points to appear.
   */
  app.get('/', async (c) => {
    const { limit, offset } = parsePagination(c, { limit: 50, maxLimit: 100 });

    const db = createDatabase(c.env.DB);

    // Rank users by total XP from badge points
    const rankedUsers = await db.all<{
      id: string;
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
      earliest_badge: string;
    }>(sql`
      SELECT u.id, u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count,
             MIN(ub.awarded_at) AS earliest_badge
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.show_achievements = 1 AND u.profile_visibility = 'public' AND u.username IS NOT NULL
        AND b.group_id IS NULL
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC, earliest_badge ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Fetch total count of eligible users and total achievable achievements
    const [totalResult, achievementCountResult] = await Promise.all([
      db.all<{ total: number }>(sql`
        SELECT COUNT(*) AS total FROM (
          SELECT u.id
          FROM users u
          JOIN user_badges ub ON ub.user_id = u.id
          JOIN badges b ON b.id = ub.badge_id
          WHERE u.show_achievements = 1 AND u.profile_visibility = 'public' AND u.username IS NOT NULL
            AND b.group_id IS NULL
          GROUP BY u.id
          HAVING SUM(b.points) > 0
        )
      `),
      db.all<{ total: number }>(sql`
        SELECT COUNT(*) AS total FROM achievements
      `),
    ]);
    const total = totalResult[0]?.total ?? 0;
    const totalAchievements = achievementCountResult[0]?.total ?? 0;

    // Fetch badges for all ranked users in a single query
    const userIds = rankedUsers.map((u) => u.id);
    let userBadgesMap: Record<string, { name: string; slug: string; icon: string; color: string }[]> = {};

    if (userIds.length > 0) {
      const allUserBadges = await db
        .select({
          userId: userBadges.userId,
          name: badges.name,
          slug: badges.slug,
          icon: badges.icon,
          color: badges.color,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(sql`${userBadges.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}) AND ${badges.groupId} IS NULL`)
        .orderBy(badges.sortOrder, userBadges.awardedAt);

      for (const row of allUserBadges) {
        if (!userBadgesMap[row.userId]) {
          userBadgesMap[row.userId] = [];
        }
        userBadgesMap[row.userId].push({
          name: row.name,
          slug: row.slug,
          icon: row.icon,
          color: row.color,
        });
      }
    }

    // Build response entries with rank
    const entries = rankedUsers.map((user, index) => ({
      rank: offset + index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      score: user.score,
      completedCount: user.badge_count,
      badges: userBadgesMap[user.id] ?? [],
    }));

    return ok(c, { entries, total, totalAchievements });
  });

  return app;
}

export const leaderboardRoutes = createLeaderboardRoutes();

// ============== Group Leaderboard ==============

/**
 * Group XP Leaderboard.
 * Mounted at /groups/:slug/leaderboard via the groups routes.
 * Public endpoint — no auth required.
 */
export function createGroupLeaderboardRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /groups/:slug/leaderboard - Group XP leaderboard (public)
   *
   * Returns users ranked by sum of badge points for badges scoped
   * to this group. Only public users with a username are included.
   *
   * Query params:
   *   - limit: number of entries (default 50, max 100)
   *   - offset: pagination offset (default 0)
   */
  app.get('/', async (c) => {
    const slug = c.req.param('slug');
    const { limit, offset } = parsePagination(c, { limit: 50, maxLimit: 100 });

    const db = createDatabase(c.env.DB);

    // Look up group by slug
    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, slug),
    });
    if (!group) return notFound(c, 'Group not found');

    const rankedUsers = await db.all<{
      id: string;
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
    }>(sql`
      SELECT u.id, u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.profile_visibility = 'public' AND u.username IS NOT NULL
        AND b.group_id = ${group.id}
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.all<{ total: number }>(sql`
      SELECT COUNT(*) AS total FROM (
        SELECT u.id
        FROM users u
        JOIN user_badges ub ON ub.user_id = u.id
        JOIN badges b ON b.id = ub.badge_id
        WHERE u.profile_visibility = 'public' AND u.username IS NOT NULL
          AND b.group_id = ${group.id}
        GROUP BY u.id
        HAVING SUM(b.points) > 0
      )
    `);
    const total = totalResult[0]?.total ?? 0;

    // Fetch group badges for all ranked users
    const userIds = rankedUsers.map((u) => u.id);
    let userBadgesMap: Record<string, { name: string; slug: string; icon: string; color: string }[]> = {};

    if (userIds.length > 0) {
      const allUserBadges = await db
        .select({
          userId: userBadges.userId,
          name: badges.name,
          slug: badges.slug,
          icon: badges.icon,
          color: badges.color,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(sql`${userBadges.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}) AND ${badges.groupId} = ${group.id}`)
        .orderBy(badges.sortOrder, userBadges.awardedAt);

      for (const row of allUserBadges) {
        if (!userBadgesMap[row.userId]) {
          userBadgesMap[row.userId] = [];
        }
        userBadgesMap[row.userId].push({
          name: row.name,
          slug: row.slug,
          icon: row.icon,
          color: row.color,
        });
      }
    }

    const entries = rankedUsers.map((user, index) => ({
      rank: offset + index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      score: user.score,
      badgeCount: user.badge_count,
      badges: userBadgesMap[user.id] ?? [],
    }));

    return ok(c, {
      group: {
        id: group.id,
        name: group.name,
        urlname: group.urlname,
        photoUrl: group.photoUrl,
      },
      entries,
      total,
    });
  });

  return app;
}

export const groupLeaderboardRoutes = createGroupLeaderboardRoutes();
