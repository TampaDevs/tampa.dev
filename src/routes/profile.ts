/**
 * User Profile API Routes
 *
 * Allows authenticated users to view and update their profile.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, userIdentities, userFavorites, badges, userBadges, userPortfolioItems, apiTokens, achievementProgress, achievements, userEntitlements, groups, oauthClientRegistry } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { deleteCookie } from 'hono/cookie';
import { getSessionUser } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, forbidden, notFound, badRequest, conflict } from '../lib/responses.js';
import { RESERVED_USERNAMES } from '../lib/username.js';

// ============== Rarity Helper ==============

function getRarityTierName(percentage: number): string {
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 50) return 'uncommon';
  return 'common';
}

// ============== Validation Schemas ==============

// RESERVED_USERNAMES imported from '../lib/username.js' (single source of truth)

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    'Username must start and end with a letter or number, and can contain hyphens'
  )
  .transform((val) => val.toLowerCase());

const userSocialLinksSchema = z.array(z.string().url()).max(5).optional().nullable();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  themeColor: z.enum(['coral', 'ocean', 'sunset', 'forest', 'violet', 'rose', 'slate', 'sky']).optional().nullable(),
  username: usernameSchema.optional(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  socialLinks: userSocialLinksSchema,
  showAchievements: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'private']).optional(),
});

// ============== Helper Functions ==============

/**
 * Normalize social links from DB (handles legacy object format → array)
 */
export function normalizeSocialLinks(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    return null;
  } catch { return null; }
}

function serializeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    bio: user.bio,
    location: user.location,
    socialLinks: normalizeSocialLinks(user.socialLinks),
    avatarUrl: user.avatarUrl,
    heroImageUrl: user.heroImageUrl,
    themeColor: user.themeColor,
    role: user.role,
    showAchievements: user.showAchievements,
    profileVisibility: user.profileVisibility,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ============== Routes ==============

export function createProfileRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/profile - Get current user's profile
   */
  app.get('/', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    // Fetch user's badges
    const db = createDatabase(c.env.DB);
    const ub = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, user.id),
    });

    type BadgeWithRarity = { id: string; name: string; slug: string; description: string | null; icon: string; color: string; points: number; awardedAt: string | null; groupId: string | null; rarity: { tier: string; percentage: number } };
    let allBadges: BadgeWithRarity[] = [];
    if (ub.length > 0) {
      const badgeResults = await Promise.all(
        ub.map((b) => db.query.badges.findFirst({ where: eq(badges.id, b.badgeId) }))
      );

      // Get total public users count for rarity computation
      const totalUsersResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(and(eq(users.profileVisibility, 'public'), sql`${users.username} IS NOT NULL`));
      const totalUsers = totalUsersResult[0]?.count ?? 0;

      // Count holders per badge in a single batch query
      const badgeIds = ub.map(b => b.badgeId);
      const holderCounts = await db
        .select({ badgeId: userBadges.badgeId, count: sql<number>`COUNT(*)` })
        .from(userBadges)
        .where(sql`${userBadges.badgeId} IN (${sql.join(badgeIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(userBadges.badgeId);

      const holderCountMap = new Map(holderCounts.map(h => [h.badgeId, h.count]));

      allBadges = ub
        .map((ubEntry) => {
          const badge = badgeResults.find((b) => b?.id === ubEntry.badgeId);
          if (!badge) return null;
          const awardedCount = holderCountMap.get(badge.id) ?? 0;
          const rarityPercentage = totalUsers > 0 ? (awardedCount / totalUsers) * 100 : 100;
          return {
            id: badge.id,
            name: badge.name,
            slug: badge.slug,
            description: badge.description,
            icon: badge.icon,
            color: badge.color,
            points: badge.points,
            awardedAt: ubEntry.awardedAt,
            groupId: badge.groupId,
            rarity: {
              tier: getRarityTierName(rarityPercentage),
              percentage: Math.round(rarityPercentage * 10) / 10,
            },
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
    }

    // Separate platform badges (no groupId) from group badges
    const platformBadges = allBadges.filter(b => !b.groupId).map(({ groupId, ...rest }) => rest);
    const groupBadgeEntries = allBadges.filter(b => b.groupId);

    // Group badges by group with XP subtotals
    const groupBadgeMap = new Map<string, BadgeWithRarity[]>();
    for (const b of groupBadgeEntries) {
      const existing = groupBadgeMap.get(b.groupId!) || [];
      existing.push(b);
      groupBadgeMap.set(b.groupId!, existing);
    }

    // Fetch group info for all groups
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

    return ok(c, { ...serializeUser(user), badges: platformBadges, groupBadges });
  });

  /**
   * GET /api/profile/check-username/:username - Check username availability
   */
  app.get('/check-username/:username', async (c) => {
    const raw = c.req.param('username');
    const username = raw.toLowerCase();

    // Basic validation
    if (username.length < 3 || username.length > 30 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(username)) {
      return ok(c, { available: false, reason: 'Invalid username format' });
    }

    if (RESERVED_USERNAMES.includes(username)) {
      return ok(c, { available: false, reason: 'This username is reserved' });
    }

    const db = createDatabase(c.env.DB);
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    // If the requester is logged in, allow their own current username
    const currentAuth = await getSessionUser(c);
    const currentUser = currentAuth?.user ?? null;
    if (existing && currentUser && existing.id === currentUser.id) {
      return ok(c, { available: true });
    }

    return ok(c, { available: !existing });
  });

  /**
   * PATCH /api/profile - Update current user's profile
   */
  app.patch('/', zValidator('json', updateProfileSchema), async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const updates = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Build update object
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.avatarUrl !== undefined) {
      updateData.avatarUrl = updates.avatarUrl;
    }

    if (updates.heroImageUrl !== undefined) {
      updateData.heroImageUrl = updates.heroImageUrl;
    }

    if (updates.themeColor !== undefined) {
      updateData.themeColor = updates.themeColor;
    }

    if (updates.bio !== undefined) {
      updateData.bio = updates.bio;
    }

    if (updates.location !== undefined) {
      updateData.location = updates.location;
    }

    if (updates.socialLinks !== undefined) {
      if (updates.socialLinks && updates.socialLinks.length > 0) {
        updateData.socialLinks = JSON.stringify(updates.socialLinks);
      } else {
        updateData.socialLinks = null;
      }
    }

    if (updates.showAchievements !== undefined) {
      updateData.showAchievements = updates.showAchievements;
    }

    if (updates.profileVisibility !== undefined) {
      updateData.profileVisibility = updates.profileVisibility;
    }

    // Username uniqueness check
    if (updates.username !== undefined) {
      if (RESERVED_USERNAMES.includes(updates.username)) {
        return conflict(c, 'This username is reserved');
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.username, updates.username),
      });
      if (existing && existing.id !== user.id) {
        return conflict(c, 'Username is already taken');
      }
      updateData.username = updates.username;
    }

    // Update user
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    // Fetch updated user
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!updatedUser) return notFound(c, 'User not found');

    // Emit profile_updated event for achievement tracking and onboarding
    emitEvent(c, {
      type: 'dev.tampa.user.profile_updated',
      payload: { userId: user.id, fields: Object.keys(updates) },
      metadata: { userId: user.id, source: 'profile' },
    });

    return ok(c, serializeUser(updatedUser));
  });

  /**
   * PATCH /api/profile/primary-email - Change primary email to one from a linked identity
   */
  app.patch('/primary-email', zValidator('json', z.object({
    provider: z.string().min(1),
  })), async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const { provider } = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Look up the identity for the specified provider
    const identity = await db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, user.id),
        eq(userIdentities.provider, provider),
      ),
    });

    if (!identity) return notFound(c, 'No linked identity for this provider');

    if (!identity.providerEmail) {
      return badRequest(c, 'No email available from this provider');
    }

    // Update the user's primary email
    await db.update(users)
      .set({
        email: identity.providerEmail,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!updatedUser) return notFound(c, 'User not found');

    return ok(c, serializeUser(updatedUser));
  });

  /**
   * DELETE /api/profile - Delete current user's account and all data
   */
  app.delete('/', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);

    // 1. Delete all sessions (logs user out everywhere)
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    // 2. Delete all user identities
    await db.delete(userIdentities).where(eq(userIdentities.userId, user.id));

    // 3. Delete user favorites
    await db.delete(userFavorites).where(eq(userFavorites.userId, user.id));

    // 4. Delete OAuth client registry entries owned by this user
    await db.delete(oauthClientRegistry).where(eq(oauthClientRegistry.ownerId, user.id));

    // 5. Clean up OAuth grants/tokens from KV (best-effort)
    if (c.env.OAUTH_KV) {
      try {
        const grantList = await c.env.OAUTH_KV.list({ prefix: `grant:${user.id}:` });
        for (const key of grantList.keys) {
          await c.env.OAUTH_KV.delete(key.name);
        }
      } catch (error) {
        console.error('Failed to clean up OAuth KV data:', error);
      }
    }

    // 6. Delete the user record
    await db.delete(users).where(eq(users.id, user.id));

    // 7. Clear session cookie
    deleteCookie(c, getSessionCookieName(c.env), { path: '/', domain: '.tampa.dev' });

    return success(c, { message: 'Account deleted' });
  });

  // ============== Portfolio ==============

  const portfolioItemSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional().nullable(),
    url: z.string().url().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    sortOrder: z.number().int().min(0).optional().default(0),
  });

  /**
   * GET /api/profile/portfolio - List user's portfolio items
   */
  app.get('/portfolio', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);
    const items = await db.query.userPortfolioItems.findMany({
      where: eq(userPortfolioItems.userId, user.id),
      orderBy: [userPortfolioItems.sortOrder],
    });

    return ok(c, items);
  });

  /**
   * POST /api/profile/portfolio - Create a portfolio item
   */
  app.post('/portfolio', zValidator('json', portfolioItemSchema), async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(userPortfolioItems).values({
      id,
      userId: user.id,
      title: data.title,
      description: data.description,
      url: data.url,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
      createdAt: now,
      updatedAt: now,
    });

    const createdItem = await db.query.userPortfolioItems.findFirst({
      where: eq(userPortfolioItems.id, id),
    });

    // Emit event for achievement tracking
    emitEvent(c, {
      type: 'dev.tampa.user.portfolio_item_created',
      payload: { userId: user.id, portfolioItemId: id },
      metadata: { userId: user.id, source: 'profile' },
    });

    return created(c, createdItem);
  });

  /**
   * PATCH /api/profile/portfolio/:id - Update a portfolio item
   */
  app.patch('/portfolio/:id', zValidator('json', portfolioItemSchema.partial()), async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const itemId = c.req.param('id');
    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.userPortfolioItems.findFirst({
      where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, user.id)),
    });

    if (!existing) return notFound(c, 'Portfolio item not found');

    await db.update(userPortfolioItems)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(userPortfolioItems.id, itemId));

    const updated = await db.query.userPortfolioItems.findFirst({
      where: eq(userPortfolioItems.id, itemId),
    });

    return ok(c, updated);
  });

  /**
   * DELETE /api/profile/portfolio/:id - Delete a portfolio item
   */
  app.delete('/portfolio/:id', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const itemId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.userPortfolioItems.findFirst({
      where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, user.id)),
    });

    if (!existing) return notFound(c, 'Portfolio item not found');

    await db.delete(userPortfolioItems).where(eq(userPortfolioItems.id, itemId));

    return success(c, { message: 'Portfolio item deleted' });
  });

  // ============== API Tokens (Personal Access Tokens) ==============

  const createTokenSchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).min(1),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  });

  /**
   * GET /api/profile/tokens - List user's API tokens
   */
  app.get('/tokens', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);
    const tokens = await db.query.apiTokens.findMany({
      where: eq(apiTokens.userId, user.id),
      orderBy: [apiTokens.createdAt],
    });

    return ok(c, tokens.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      scopes: JSON.parse(t.scopes),
      lastUsedAt: t.lastUsedAt,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    })));
  });

  /**
   * POST /api/profile/tokens - Create a new Personal Access Token
   * Returns the full token ONCE in the response.
   */
  app.post('/tokens', zValidator('json', createTokenSchema), async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Admin scope requires admin/superadmin role
    if (data.scopes.includes('admin') && user.role !== 'admin' && user.role !== 'superadmin') {
      return forbidden(c, 'Admin scope requires admin or superadmin role');
    }

    // Generate token: td_pat_ + 40 hex chars
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    const tokenHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const fullToken = `td_pat_${tokenHex}`;
    const tokenPrefix = `td_pat_${tokenHex.slice(0, 8)}`;

    // Hash the token with SHA-256 for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fullToken));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await db.insert(apiTokens).values({
      id,
      userId: user.id,
      name: data.name,
      tokenHash,
      tokenPrefix,
      scopes: JSON.stringify(data.scopes),
      expiresAt,
      createdAt: now,
    });

    // Emit event for achievement tracking
    emitEvent(c, {
      type: 'dev.tampa.developer.api_token_created',
      payload: { userId: user.id, tokenId: id, tokenName: data.name },
      metadata: { userId: user.id, source: 'profile' },
    });

    return created(c, {
      id,
      name: data.name,
      token: fullToken, // Only shown once!
      tokenPrefix,
      scopes: data.scopes,
      expiresAt,
      createdAt: now,
    });
  });

  /**
   * DELETE /api/profile/tokens/:id - Revoke an API token
   */
  app.delete('/tokens/:id', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const tokenId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.apiTokens.findFirst({
      where: and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, user.id)),
    });

    if (!existing) return notFound(c, 'Token not found');

    await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));

    return success(c, { message: 'Token revoked' });
  });

  // ============== Achievements ==============

  /**
   * GET /api/profile/achievements - Get user's achievement progress
   */
  app.get('/achievements', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);

    const [allAchievements, progress] = await Promise.all([
      db.query.achievements.findMany({
        orderBy: [achievements.sortOrder],
      }),
      db.query.achievementProgress.findMany({
        where: eq(achievementProgress.userId, user.id),
      }),
    ]);

    // Merge definitions with progress
    const result = allAchievements.map((def) => {
      const p = progress.find((p) => p.achievementKey === def.key);
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        color: def.color,
        targetValue: def.targetValue,
        currentValue: p?.currentValue ?? 0,
        completedAt: p?.completedAt ?? null,
        badgeSlug: def.badgeSlug ?? null,
        hidden: def.hidden === 1,
      };
    });

    return ok(c, result);
  });

  // ============== Entitlements ==============

  /**
   * GET /api/profile/entitlements - Get user's active entitlements
   */
  app.get('/entitlements', async (c) => {
    const auth = await getSessionUser(c);
    if (!auth) return unauthorized(c);
    const user = auth.user;

    const db = createDatabase(c.env.DB);
    const now = new Date().toISOString();

    // Get active entitlements: expiresAt is null or > now
    const allEntitlements = await db.query.userEntitlements.findMany({
      where: eq(userEntitlements.userId, user.id),
    });

    const activeEntitlements = allEntitlements.filter(
      (ent) => !ent.expiresAt || ent.expiresAt > now
    );

    return ok(c, activeEntitlements.map((ent) => ({
      id: ent.id,
      entitlement: ent.entitlement,
      grantedAt: ent.grantedAt,
      expiresAt: ent.expiresAt,
      source: ent.source,
    })));
  });

  return app;
}

export const profileRoutes = createProfileRoutes();
