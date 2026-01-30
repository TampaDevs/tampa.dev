/**
 * Public User Profile API Routes
 *
 * Returns public profile information for users who have set a username.
 * No authentication required. Never exposes email, id, or role.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, userIdentities, userFavorites, groups, badges, userBadges, userPortfolioItems, achievementProgress } from '../db/schema';
import type { Env } from '../../types/worker';
import { ACHIEVEMENTS } from '../lib/achievements.js';

export function createPublicUsersRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/users/:username - Get a user's public profile
   */
  app.get('/:username', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get GitHub identity for the public github link
    const githubIdentity = await db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, user.id),
        eq(userIdentities.provider, 'github')
      ),
    });

    // Get user's favorited groups (public info)
    const favorites = await db.query.userFavorites.findMany({
      where: eq(userFavorites.userId, user.id),
    });

    let favoriteGroups: Array<{ slug: string; name: string; photoUrl: string | null }> = [];
    if (favorites.length > 0) {
      const groupResults = await Promise.all(
        favorites.map((f) =>
          db.query.groups.findFirst({ where: eq(groups.id, f.groupId) })
        )
      );
      favoriteGroups = groupResults
        .filter((g): g is NonNullable<typeof g> => g !== null && g.displayOnSite === true)
        .map((g) => ({ slug: g.urlname, name: g.name, photoUrl: g.photoUrl }));
    }

    // Fetch user's badges
    const ub = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, user.id),
    });

    let userBadgeList: Array<{ name: string; slug: string; icon: string; color: string }> = [];
    if (ub.length > 0) {
      const badgeResults = await Promise.all(
        ub.map((b) => db.query.badges.findFirst({ where: eq(badges.id, b.badgeId) }))
      );
      userBadgeList = badgeResults
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map((b) => ({ name: b.name, slug: b.slug, icon: b.icon, color: b.color }));
    }

    // Fetch portfolio items
    const portfolioItems = await db.query.userPortfolioItems.findMany({
      where: eq(userPortfolioItems.userId, user.id),
      orderBy: [userPortfolioItems.sortOrder],
    });

    // Fetch completed achievements (public — only if user has opted in)
    let completedAchievements: Array<{ key: string; name: string; description: string }> = [];
    if (user.showAchievements) {
      const progress = await db.query.achievementProgress.findMany({
        where: eq(achievementProgress.userId, user.id),
      });
      completedAchievements = ACHIEVEMENTS
        .filter((def) => {
          const p = progress.find((pr) => pr.achievementKey === def.key);
          return p?.completedAt;
        })
        .map((def) => ({
          key: def.key,
          name: def.name,
          description: def.description,
        }));
    }

    // Return ONLY public fields — never email, id, or role
    return c.json({
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      socialLinks: user.socialLinks ? JSON.parse(user.socialLinks) : null,
      githubUsername: githubIdentity?.providerUsername || null,
      favoriteGroups,
      badges: userBadgeList,
      achievements: completedAchievements,
      portfolioItems: portfolioItems.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        url: p.url,
        imageUrl: p.imageUrl,
      })),
      memberSince: user.createdAt,
    });
  });

  return app;
}

export const publicUsersRoutes = createPublicUsersRoutes();
