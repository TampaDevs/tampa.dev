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
import { users, sessions, userIdentities, userFavorites, badges, userBadges, userPortfolioItems, apiTokens, achievementProgress, achievements, userEntitlements } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { deleteCookie } from 'hono/cookie';
import { emitEvent } from '../lib/event-bus.js';

// ============== Rarity Helper ==============

function getRarityTierName(percentage: number): string {
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 50) return 'uncommon';
  return 'common';
}

// ============== Validation Schemas ==============

const RESERVED_USERNAMES = [
  'admin', 'api', 'auth', 'login', 'logout', 'profile', 'settings',
  'help', 'support', 'about', 'tampa', 'tampadevs', 'developer',
  'oauth', 'groups', 'events', 'calendar', 'map', 'favorites',
  'p', 'u', 'user', 'users', 'new', 'edit', 'delete', 'search',
];

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
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Fetch user's badges
    const db = createDatabase(c.env.DB);
    const ub = await db.query.userBadges.findMany({
      where: eq(userBadges.userId, user.id),
    });

    let userBadgeList: Array<{ id: string; name: string; slug: string; description: string | null; icon: string; color: string; points: number; awardedAt: string | null; rarity: { tier: string; percentage: number } }> = [];
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

      userBadgeList = ub
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
            rarity: {
              tier: getRarityTierName(rarityPercentage),
              percentage: Math.round(rarityPercentage * 10) / 10,
            },
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
    }

    return c.json({ ...serializeUser(user), badges: userBadgeList });
  });

  /**
   * GET /api/profile/check-username/:username - Check username availability
   */
  app.get('/check-username/:username', async (c) => {
    const raw = c.req.param('username');
    const username = raw.toLowerCase();

    // Basic validation
    if (username.length < 3 || username.length > 30 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(username)) {
      return c.json({ available: false, reason: 'Invalid username format' });
    }

    if (RESERVED_USERNAMES.includes(username)) {
      return c.json({ available: false, reason: 'This username is reserved' });
    }

    const db = createDatabase(c.env.DB);
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    // If the requester is logged in, allow their own current username
    const currentUser = await getCurrentUser(c);
    if (existing && currentUser && existing.id === currentUser.id) {
      return c.json({ available: true });
    }

    return c.json({ available: !existing });
  });

  /**
   * PATCH /api/profile - Update current user's profile
   */
  app.patch('/', zValidator('json', updateProfileSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

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
        return c.json({ error: 'This username is reserved' }, 409);
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.username, updates.username),
      });
      if (existing && existing.id !== user.id) {
        return c.json({ error: 'Username is already taken' }, 409);
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

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Emit profile_updated event for achievement tracking and onboarding
    emitEvent(c, {
      type: 'dev.tampa.user.profile_updated',
      payload: { userId: user.id, fields: Object.keys(updates) },
      metadata: { userId: user.id, source: 'profile' },
    });

    return c.json(serializeUser(updatedUser));
  });

  /**
   * PATCH /api/profile/primary-email - Change primary email to one from a linked identity
   */
  app.patch('/primary-email', zValidator('json', z.object({
    provider: z.string().min(1),
  })), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { provider } = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Look up the identity for the specified provider
    const identity = await db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, user.id),
        eq(userIdentities.provider, provider),
      ),
    });

    if (!identity) {
      return c.json({ error: 'No linked identity for this provider' }, 404);
    }

    if (!identity.providerEmail) {
      return c.json({ error: 'No email available from this provider' }, 400);
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

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(serializeUser(updatedUser));
  });

  /**
   * DELETE /api/profile - Delete current user's account and all data
   */
  app.delete('/', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);

    // 1. Delete all sessions (logs user out everywhere)
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    // 2. Delete all user identities
    await db.delete(userIdentities).where(eq(userIdentities.userId, user.id));

    // 3. Delete user favorites
    await db.delete(userFavorites).where(eq(userFavorites.userId, user.id));

    // 4. Clean up OAuth grants/tokens from KV (best-effort)
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

    // 5. Delete the user record
    await db.delete(users).where(eq(users.id, user.id));

    // 6. Clear session cookie
    deleteCookie(c, getSessionCookieName(c.env), { path: '/', domain: '.tampa.dev' });

    return c.json({ success: true, message: 'Account deleted' });
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
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);
    const items = await db.query.userPortfolioItems.findMany({
      where: eq(userPortfolioItems.userId, user.id),
      orderBy: [userPortfolioItems.sortOrder],
    });

    return c.json({ items });
  });

  /**
   * POST /api/profile/portfolio - Create a portfolio item
   */
  app.post('/portfolio', zValidator('json', portfolioItemSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

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

    const created = await db.query.userPortfolioItems.findFirst({
      where: eq(userPortfolioItems.id, id),
    });

    // Emit event for achievement tracking
    emitEvent(c, {
      type: 'dev.tampa.user.portfolio_item_created',
      payload: { userId: user.id, portfolioItemId: id },
      metadata: { userId: user.id, source: 'profile' },
    });

    return c.json(created, 201);
  });

  /**
   * PATCH /api/profile/portfolio/:id - Update a portfolio item
   */
  app.patch('/portfolio/:id', zValidator('json', portfolioItemSchema.partial()), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const itemId = c.req.param('id');
    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.userPortfolioItems.findFirst({
      where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, user.id)),
    });

    if (!existing) {
      return c.json({ error: 'Portfolio item not found' }, 404);
    }

    await db.update(userPortfolioItems)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(userPortfolioItems.id, itemId));

    const updated = await db.query.userPortfolioItems.findFirst({
      where: eq(userPortfolioItems.id, itemId),
    });

    return c.json(updated);
  });

  /**
   * DELETE /api/profile/portfolio/:id - Delete a portfolio item
   */
  app.delete('/portfolio/:id', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const itemId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.userPortfolioItems.findFirst({
      where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, user.id)),
    });

    if (!existing) {
      return c.json({ error: 'Portfolio item not found' }, 404);
    }

    await db.delete(userPortfolioItems).where(eq(userPortfolioItems.id, itemId));

    return c.json({ success: true, message: 'Portfolio item deleted' });
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
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);
    const tokens = await db.query.apiTokens.findMany({
      where: eq(apiTokens.userId, user.id),
      orderBy: [apiTokens.createdAt],
    });

    return c.json({
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        tokenPrefix: t.tokenPrefix,
        scopes: JSON.parse(t.scopes),
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      })),
    });
  });

  /**
   * POST /api/profile/tokens - Create a new Personal Access Token
   * Returns the full token ONCE in the response.
   */
  app.post('/tokens', zValidator('json', createTokenSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Admin scope requires admin/superadmin role
    if (data.scopes.includes('admin') && user.role !== 'admin' && user.role !== 'superadmin') {
      return c.json({ error: 'Admin scope requires admin or superadmin role' }, 403);
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

    return c.json({
      id,
      name: data.name,
      token: fullToken, // Only shown once!
      tokenPrefix,
      scopes: data.scopes,
      expiresAt,
      createdAt: now,
    }, 201);
  });

  /**
   * DELETE /api/profile/tokens/:id - Revoke an API token
   */
  app.delete('/tokens/:id', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tokenId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const existing = await db.query.apiTokens.findFirst({
      where: and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, user.id)),
    });

    if (!existing) {
      return c.json({ error: 'Token not found' }, 404);
    }

    await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));

    return c.json({ success: true, message: 'Token revoked' });
  });

  // ============== Achievements ==============

  /**
   * GET /api/profile/achievements - Get user's achievement progress
   */
  app.get('/achievements', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

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
      };
    });

    return c.json({ achievements: result });
  });

  // ============== Entitlements ==============

  /**
   * GET /api/profile/entitlements - Get user's active entitlements
   */
  app.get('/entitlements', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);
    const now = new Date().toISOString();

    // Get active entitlements: expiresAt is null or > now
    const allEntitlements = await db.query.userEntitlements.findMany({
      where: eq(userEntitlements.userId, user.id),
    });

    const activeEntitlements = allEntitlements.filter(
      (ent) => !ent.expiresAt || ent.expiresAt > now
    );

    return c.json({
      entitlements: activeEntitlements.map((ent) => ({
        id: ent.id,
        entitlement: ent.entitlement,
        grantedAt: ent.grantedAt,
        expiresAt: ent.expiresAt,
        source: ent.source,
      })),
    });
  });

  return app;
}

export const profileRoutes = createProfileRoutes();
