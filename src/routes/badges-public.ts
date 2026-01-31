/**
 * Public Badges API Routes
 *
 * Returns public badge information. No authentication required.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { badges, userBadges, users } from '../db/schema';
import type { Env } from '../../types/worker';

function getRarityTierName(percentage: number): string {
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 50) return 'uncommon';
  return 'common';
}

export function createBadgesPublicRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /badges - List all badges (public, no auth)
   */
  app.get('/', async (c) => {
    const db = createDatabase(c.env.DB);

    const allBadges = await db.query.badges.findMany({
      where: eq(badges.hideFromDirectory, 0),
      orderBy: [badges.sortOrder],
    });

    // Get total public users count for rarity computation
    const totalUsersResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.profileVisibility, 'public'), sql`${users.username} IS NOT NULL`));
    const totalUsers = totalUsersResult[0]?.count ?? 0;

    // Get user count per badge
    const badgesWithCounts = await Promise.all(
      allBadges.map(async (badge) => {
        const badgeUsers = await db.query.userBadges.findMany({
          where: eq(userBadges.badgeId, badge.id),
        });
        const awardedCount = badgeUsers.length;
        const rarityPercentage = totalUsers > 0 ? (awardedCount / totalUsers) * 100 : 100;
        return {
          id: badge.id,
          name: badge.name,
          slug: badge.slug,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          points: badge.points,
          sortOrder: badge.sortOrder,
          awardedCount,
          rarity: {
            tier: getRarityTierName(rarityPercentage),
            percentage: Math.round(rarityPercentage * 10) / 10,
          },
        };
      })
    );

    return c.json({ badges: badgesWithCounts });
  });

  /**
   * GET /badges/:slug - Get single badge detail by slug
   */
  app.get('/:slug', async (c) => {
    const slug = c.req.param('slug');
    const db = createDatabase(c.env.DB);

    const badge = await db.query.badges.findFirst({
      where: eq(badges.slug, slug),
    });

    if (!badge) {
      return c.json({ error: 'Badge not found' }, 404);
    }

    // Get count of users with this badge
    const badgeUsers = await db.query.userBadges.findMany({
      where: eq(userBadges.badgeId, badge.id),
    });
    const awardedCount = badgeUsers.length;

    // Get total public users count for rarity computation
    const totalUsersResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.profileVisibility, 'public'), sql`${users.username} IS NOT NULL`));
    const totalUsers = totalUsersResult[0]?.count ?? 0;

    const rarityPercentage = totalUsers > 0 ? (awardedCount / totalUsers) * 100 : 100;

    return c.json({
      id: badge.id,
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      points: badge.points,
      sortOrder: badge.sortOrder,
      awardedCount,
      rarity: {
        tier: getRarityTierName(rarityPercentage),
        percentage: Math.round(rarityPercentage * 10) / 10,
      },
      createdAt: badge.createdAt,
    });
  });

  return app;
}

export const badgesPublicRoutes = createBadgesPublicRoutes();
