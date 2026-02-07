/**
 * Public User Profile API Routes
 *
 * Returns public profile information for users who have set a username.
 * No authentication required. Never exposes email, id, or role.
 */

import { Hono } from 'hono';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, userIdentities, userFavorites, groups, badges, userBadges, userPortfolioItems, achievementProgress, achievements } from '../db/schema';
import type { Env } from '../../types/worker';
import { normalizeSocialLinks } from './profile';
import { ok, list, notFound, parsePagination } from '../lib/responses.js';

function getRarityTierName(percentage: number): string {
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 50) return 'uncommon';
  return 'common';
}

export function createPublicUsersRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/users - Public user directory
   *
   * Returns paginated list of users with profileVisibility='public' and a username set.
   * Query params: search, badge, limit (default 20, max 100), offset (default 0)
   */
  app.get('/', async (c) => {
    const search = c.req.query('search')?.trim();
    const badgeFilter = c.req.query('badge')?.trim();
    const { limit, offset } = parsePagination(c, { limit: 20, maxLimit: 100 });

    const db = createDatabase(c.env.DB);

    // Build where conditions
    const conditions = [
      eq(users.profileVisibility, 'public'),
      sql`${users.username} IS NOT NULL`,
    ];

    if (search && search.length > 0) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.username, `%${search}%`),
        )!,
      );
    }

    // Filter by badge slug(s) — supports comma-separated list (AND: user must have ALL)
    if (badgeFilter && badgeFilter.length > 0) {
      const slugs = badgeFilter.split(',').map(s => s.trim()).filter(Boolean);
      for (const slug of slugs) {
        conditions.push(
          sql`EXISTS (SELECT 1 FROM user_badges ub_filter JOIN badges b_filter ON ub_filter.badge_id = b_filter.id WHERE ub_filter.user_id = ${users.id} AND b_filter.slug = ${slug})`,
        );
      }
    }

    const where = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(where);
    const total = countResult[0]?.count ?? 0;

    // Get paginated results
    const results = await db.query.users.findMany({
      where,
      orderBy: [users.createdAt],
      limit,
      offset,
    });

    // Fetch badges for all returned users
    const userIds = results.map((u) => u.id);
    const badgesByUser: Record<string, Array<{ name: string; slug: string; icon: string; color: string; description: string | null }>> = {};

    if (userIds.length > 0) {
      // Only show platform badges (no groupId) in the directory listing
      const allUserBadges = await db
        .select({
          userId: userBadges.userId,
          name: badges.name,
          slug: badges.slug,
          icon: badges.icon,
          color: badges.color,
          description: badges.description,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(sql`${userBadges.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}) AND ${badges.groupId} IS NULL`);

      for (const row of allUserBadges) {
        if (!badgesByUser[row.userId]) badgesByUser[row.userId] = [];
        badgesByUser[row.userId].push({
          name: row.name,
          slug: row.slug,
          icon: row.icon,
          color: row.color,
          description: row.description,
        });
      }
    }

    return list(c, results.map((u) => ({
      username: u.username,
      name: u.name,
      bio: u.bio,
      location: u.location,
      avatarUrl: u.avatarUrl,
      themeColor: u.themeColor,
      badges: badgesByUser[u.id] || [],
      memberSince: u.createdAt,
    })), { total, limit, offset });
  });

  /**
   * GET /api/users/:username - Get a user's public profile
   */
  app.get('/:username', async (c) => {
    const username = c.req.param('username').toLowerCase();
    const db = createDatabase(c.env.DB);

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) return notFound(c, 'User not found');

    // Respect profileVisibility: private profiles are not publicly accessible
    if (user.profileVisibility !== 'public') {
      return notFound(c, 'User not found');
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

    type BadgeEntryWithId = { badgeId: string; name: string; slug: string; icon: string; color: string; description: string | null; points: number; awardedAt: string | null; groupId: string | null };
    let userBadgeListWithIds: BadgeEntryWithId[] = [];
    if (ub.length > 0) {
      const badgeResults = await Promise.all(
        ub.map((b) => db.query.badges.findFirst({ where: eq(badges.id, b.badgeId) }))
      );
      userBadgeListWithIds = ub
        .map((ubEntry) => {
          const badge = badgeResults.find((b) => b?.id === ubEntry.badgeId);
          if (!badge) return null;
          return { badgeId: badge.id, name: badge.name, slug: badge.slug, icon: badge.icon, color: badge.color, description: badge.description, points: badge.points, awardedAt: ubEntry.awardedAt, groupId: badge.groupId };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
    }

    // Compute rarity for each badge
    type BadgeWithRarity = { name: string; slug: string; icon: string; color: string; description: string | null; points: number; awardedAt: string | null; groupId: string | null; rarity: { tier: string; percentage: number } };
    let allBadgesWithRarity: BadgeWithRarity[] = [];
    if (userBadgeListWithIds.length > 0) {
      // Get total public users count for rarity computation
      const totalUsersResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.profileVisibility, 'public'), sql`${users.username} IS NOT NULL`));
      const totalUsers = totalUsersResult[0]?.count ?? 0;

      // Count holders per badge in a single batch query
      const badgeIds = userBadgeListWithIds.map(b => b.badgeId);
      const holderCounts = await db
        .select({ badgeId: userBadges.badgeId, count: sql<number>`COUNT(*)` })
        .from(userBadges)
        .where(sql`${userBadges.badgeId} IN (${sql.join(badgeIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(userBadges.badgeId);

      const holderCountMap = new Map(holderCounts.map(h => [h.badgeId, h.count]));

      allBadgesWithRarity = userBadgeListWithIds.map(b => {
        const awardedCount = holderCountMap.get(b.badgeId) ?? 0;
        const rarityPercentage = totalUsers > 0 ? (awardedCount / totalUsers) * 100 : 100;
        const { badgeId, ...rest } = b;
        return {
          ...rest,
          rarity: {
            tier: getRarityTierName(rarityPercentage),
            percentage: Math.round(rarityPercentage * 10) / 10,
          },
        };
      });
    }

    // Separate platform badges from group badges
    const platformBadges = allBadgesWithRarity.filter(b => !b.groupId).map(({ groupId, ...rest }) => rest);
    const groupBadgeEntries = allBadgesWithRarity.filter(b => b.groupId);

    // Group badges by group with XP subtotals
    const groupBadgeMap = new Map<string, BadgeWithRarity[]>();
    for (const b of groupBadgeEntries) {
      const existing = groupBadgeMap.get(b.groupId!) || [];
      existing.push(b);
      groupBadgeMap.set(b.groupId!, existing);
    }

    const groupIds = [...groupBadgeMap.keys()];
    let groupBadges: Array<{ group: { id: string; name: string; urlname: string; photoUrl: string | null }; badges: Array<Omit<BadgeWithRarity, 'groupId'>>; xpSubtotal: number }> = [];
    if (groupIds.length > 0) {
      const groupResults = await Promise.all(
        groupIds.map((gid) => db.query.groups.findFirst({ where: eq(groups.id, gid) }))
      );
      groupBadges = groupIds.map((gid, idx) => {
        const g = groupResults[idx];
        const badgesInGroup = groupBadgeMap.get(gid) || [];
        return {
          group: g ? { id: g.id, name: g.name, urlname: g.urlname, photoUrl: g.photoUrl } : { id: gid, name: 'Unknown Group', urlname: '', photoUrl: null },
          badges: badgesInGroup.map(({ groupId, ...rest }) => rest),
          xpSubtotal: badgesInGroup.reduce((sum, b) => sum + b.points, 0),
        };
      });
    }

    // Compute XP score: sum of points for platform badges only
    const xpScore = platformBadges.reduce((sum, b) => sum + b.points, 0);

    // Fetch portfolio items
    const portfolioItems = await db.query.userPortfolioItems.findMany({
      where: eq(userPortfolioItems.userId, user.id),
      orderBy: [userPortfolioItems.sortOrder],
    });

    // Fetch completed achievements (public - only if user has opted in)
    let completedAchievements: Array<{ key: string; name: string; description: string; icon: string | null; color: string | null }> = [];
    if (user.showAchievements) {
      const [allAchievements, progress] = await Promise.all([
        db.query.achievements.findMany({ orderBy: [achievements.sortOrder] }),
        db.query.achievementProgress.findMany({
          where: eq(achievementProgress.userId, user.id),
        }),
      ]);
      completedAchievements = allAchievements
        .filter((def) => {
          if (def.hidden) return false; // Hidden achievements excluded from public profiles
          const p = progress.find((pr) => pr.achievementKey === def.key);
          return p?.completedAt;
        })
        .map((def) => ({
          key: def.key,
          name: def.name,
          description: def.description,
          icon: def.icon,
          color: def.color,
        }));
    }

    // Return ONLY public fields - never email, id, or role
    return ok(c, {
      username: user.username,
      name: user.name,
      bio: user.bio,
      location: user.location,
      avatarUrl: user.avatarUrl,
      heroImageUrl: user.heroImageUrl,
      themeColor: user.themeColor,
      socialLinks: normalizeSocialLinks(user.socialLinks),
      githubUsername: githubIdentity?.providerUsername || null,
      favoriteGroups,
      badges: platformBadges,
      groupBadges,
      achievements: completedAchievements,
      portfolioItems: portfolioItems.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        url: p.url,
        imageUrl: p.imageUrl,
      })),
      xpScore,
      memberSince: user.createdAt,
    });
  });

  return app;
}

export const publicUsersRoutes = createPublicUsersRoutes();
