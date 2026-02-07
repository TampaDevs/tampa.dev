/**
 * Public Badges API Routes
 *
 * Returns public badge information. No authentication required.
 */

import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { createDatabase } from '../db';
import { badges } from '../db/schema';
import { getEmojiUrl } from '../../lib/emoji.js';
import { getCachedTotalPublicUsers, getCachedBadgeHolderCounts, computeRarity } from '../lib/badge-rarity.js';
import type { Env } from '../../types/worker';

export function createBadgesPublicRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /badges - List all badges (public, no auth)
   */
  app.get('/', async (c) => {
    const db = createDatabase(c.env.DB);

    // Only show platform badges (no groupId) in the public directory
    const allBadges = await db.query.badges.findMany({
      where: and(eq(badges.hideFromDirectory, 0), isNull(badges.groupId)),
      orderBy: [badges.sortOrder],
    });

    const badgeIds = allBadges.map((b) => b.id);

    // Fetch total users and per-badge holder counts (KV-cached)
    const [totalUsers, holderCountMap] = await Promise.all([
      getCachedTotalPublicUsers(db, c.env.kv),
      getCachedBadgeHolderCounts(db, c.env.kv, badgeIds),
    ]);

    const badgesWithCounts = allBadges.map((badge) => {
      const awardedCount = holderCountMap.get(badge.id) ?? 0;
      return {
        id: badge.id,
        name: badge.name,
        slug: badge.slug,
        description: badge.description,
        icon: badge.icon,
        iconUrl: getEmojiUrl(badge.icon),
        color: badge.color,
        points: badge.points,
        sortOrder: badge.sortOrder,
        awardedCount,
        rarity: computeRarity(totalUsers, awardedCount),
      };
    });

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

    // Fetch total users and holder count for this badge (KV-cached)
    const [totalUsers, holderCountMap] = await Promise.all([
      getCachedTotalPublicUsers(db, c.env.kv),
      getCachedBadgeHolderCounts(db, c.env.kv, [badge.id]),
    ]);
    const awardedCount = holderCountMap.get(badge.id) ?? 0;

    return c.json({
      id: badge.id,
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      iconUrl: getEmojiUrl(badge.icon),
      color: badge.color,
      points: badge.points,
      sortOrder: badge.sortOrder,
      awardedCount,
      rarity: computeRarity(totalUsers, awardedCount),
      createdAt: badge.createdAt,
    });
  });

  return app;
}

export const badgesPublicRoutes = createBadgesPublicRoutes();
