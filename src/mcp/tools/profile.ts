/**
 * MCP Profile Tools
 *
 * Tools for managing user profiles, achievements, linked accounts,
 * entitlements, and social follows via the MCP interface.
 */

import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  users,
  userPortfolioItems,
  apiTokens,
  achievementProgress,
  achievements,
  userIdentities,
  userEntitlements,
  userFollows,
} from '../../db/schema.js';
import { updateProfile, ProfileError } from '../../services/profile.js';

// ── profile_get ──

defineTool({
  name: 'profile_get',
  description: 'Get the authenticated user\'s profile information including counts for portfolio items, achievements, and tokens.',
  scope: 'read:user',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const user = ctx.auth.user;

    const [portfolioCount, achievementCount, tokenCount] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` })
        .from(userPortfolioItems)
        .where(eq(userPortfolioItems.userId, user.id)),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(achievementProgress)
        .where(and(
          eq(achievementProgress.userId, user.id),
          sql`${achievementProgress.completedAt} IS NOT NULL`,
        )),
      db.select({ count: sql<number>`COUNT(*)` })
        .from(apiTokens)
        .where(eq(apiTokens.userId, user.id)),
    ]);

    const profile = {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      heroImageUrl: user.heroImageUrl,
      themeColor: user.themeColor,
      location: user.location,
      socialLinks: user.socialLinks ? JSON.parse(user.socialLinks) : null,
      profileVisibility: user.profileVisibility,
      role: user.role,
      createdAt: user.createdAt,
      counts: {
        portfolioItems: portfolioCount[0]?.count ?? 0,
        achievements: achievementCount[0]?.count ?? 0,
        tokens: tokenCount[0]?.count ?? 0,
      },
    };

    return { content: [{ type: 'text' as const, text: JSON.stringify(profile) }] };
  },
});

// ── profile_update ──

defineTool({
  name: 'profile_update',
  description: 'Update the authenticated user\'s profile. Accepts partial updates for name, bio, username, avatar, theme color, location, social links, and profile visibility.',
  scope: 'user',
  inputSchema: z.object({
    name: z.string().min(1).max(200).optional(),
    bio: z.string().max(500).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    themeColor: z.string().max(7).optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    socialLinks: z.object({
      github: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      website: z.string().optional(),
      discord: z.string().optional(),
    }).optional(),
    profileVisibility: z.enum(['public', 'private']).optional(),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.username !== undefined) updates.username = args.username;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.themeColor !== undefined) updates.themeColor = args.themeColor;
    if (args.location !== undefined) updates.location = args.location;
    if (args.profileVisibility !== undefined) updates.profileVisibility = args.profileVisibility;

    if (args.socialLinks !== undefined) {
      const links = Object.entries(args.socialLinks).filter(([, v]) => v);
      updates.socialLinks = links.length > 0 ? links.map(([, v]) => v) : null;
    }

    try {
      const result = await updateProfile(db, ctx.auth.user.id, updates);

      if (result.events) {
        for (const event of result.events) {
          ctx.executionCtx.waitUntil(
            ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
          );
        }
      }

      const user = result.user;
      const profile = {
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        heroImageUrl: user.heroImageUrl,
        themeColor: user.themeColor,
        location: user.location,
        socialLinks: user.socialLinks ? JSON.parse(user.socialLinks) : null,
        profileVisibility: user.profileVisibility,
        role: user.role,
        updatedAt: user.updatedAt,
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(profile) }] };
    } catch (error) {
      if (error instanceof ProfileError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  },
});

// ── profile_email ──

defineTool({
  name: 'profile_email',
  description: 'Get the authenticated user\'s email address.',
  scope: 'user:email',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ email: ctx.auth.user.email }) }],
    };
  },
});

// ── profile_achievements ──

defineTool({
  name: 'profile_achievements',
  description: 'List the authenticated user\'s achievements, including completed and in-progress achievements with details.',
  scope: 'read:user',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const [allAchievements, progress] = await Promise.all([
      db.query.achievements.findMany({
        orderBy: [achievements.sortOrder],
      }),
      db.query.achievementProgress.findMany({
        where: eq(achievementProgress.userId, ctx.auth.user.id),
      }),
    ]);

    const result = allAchievements
      .filter((def) => def.enabled !== 0)
      .map((def) => {
        const p = progress.find((prog) => prog.achievementKey === def.key);
        return {
          key: def.key,
          name: def.name,
          description: def.description,
          icon: def.icon,
          xpReward: def.points,
          targetValue: def.targetValue,
          currentValue: p?.currentValue ?? 0,
          completedAt: p?.completedAt ?? null,
          hidden: def.hidden === 1,
        };
      });

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  },
});

// ── profile_linked_accounts ──

defineTool({
  name: 'profile_linked_accounts',
  description: 'List the authenticated user\'s linked identity providers (e.g., GitHub, Discord). Never returns tokens or secrets.',
  scope: 'read:user',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, ctx.auth.user.id),
    });

    // Return only safe fields -- never expose accessToken or refreshToken
    const result = identities.map((identity) => ({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      providerUsername: identity.providerUsername,
      email: identity.providerEmail,
      avatarUrl: identity.accessToken ? undefined : undefined, // Schema doesn't have avatarUrl on identities
      createdAt: identity.createdAt,
    }));

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  },
});

// ── profile_entitlements ──

defineTool({
  name: 'profile_entitlements',
  description: 'List the authenticated user\'s active entitlements (permissions, features, and capabilities).',
  scope: 'user',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const entitlements = await db.query.userEntitlements.findMany({
      where: eq(userEntitlements.userId, ctx.auth.user.id),
    });

    const result = entitlements.map((e) => ({
      entitlement: e.entitlement,
      source: e.source,
      grantedAt: e.grantedAt,
      expiresAt: e.expiresAt,
    }));

    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
  },
});

// ── users_followers ──

defineTool({
  name: 'users_followers',
  description: 'List followers of a user by username.',
  scope: 'read:user',
  inputSchema: z.object({
    username: z.string().min(1).max(30),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, args.username.toLowerCase()),
    });
    if (!targetUser) {
      return { content: [{ type: 'text' as const, text: 'Error: User not found' }], isError: true };
    }

    const followerRows = await db
      .select({
        followerId: userFollows.followerId,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .where(eq(userFollows.followedId, targetUser.id));

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
      }),
    );

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(followers.filter(Boolean)) }],
    };
  },
});

// ── users_following ──

defineTool({
  name: 'users_following',
  description: 'List users that a given user is following, by username.',
  scope: 'read:user',
  inputSchema: z.object({
    username: z.string().min(1).max(30),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, args.username.toLowerCase()),
    });
    if (!targetUser) {
      return { content: [{ type: 'text' as const, text: 'Error: User not found' }], isError: true };
    }

    const followingRows = await db
      .select({
        followedId: userFollows.followedId,
        createdAt: userFollows.createdAt,
      })
      .from(userFollows)
      .where(eq(userFollows.followerId, targetUser.id));

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
      }),
    );

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(following.filter(Boolean)) }],
    };
  },
});

// ── users_follow ──

defineTool({
  name: 'users_follow',
  description: 'Follow a user by username.',
  scope: 'user',
  inputSchema: z.object({
    username: z.string().min(1).max(30),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const currentUser = ctx.auth.user;

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, args.username.toLowerCase()),
    });
    if (!targetUser) {
      return { content: [{ type: 'text' as const, text: 'Error: User not found' }], isError: true };
    }

    if (targetUser.id === currentUser.id) {
      return { content: [{ type: 'text' as const, text: 'Error: Cannot follow yourself' }], isError: true };
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    if (existing) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ message: 'Already following' }) }] };
    }

    await db.insert(userFollows).values({
      followerId: currentUser.id,
      followedId: targetUser.id,
    });

    // Emit domain event
    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.user.followed',
        payload: { followerId: currentUser.id, followedId: targetUser.id },
        metadata: { userId: currentUser.id, source: 'follows' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
});

// ── users_unfollow ──

defineTool({
  name: 'users_unfollow',
  description: 'Unfollow a user by username.',
  scope: 'user',
  inputSchema: z.object({
    username: z.string().min(1).max(30),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const currentUser = ctx.auth.user;

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, args.username.toLowerCase()),
    });
    if (!targetUser) {
      return { content: [{ type: 'text' as const, text: 'Error: User not found' }], isError: true };
    }

    await db.delete(userFollows).where(
      and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
});

// ── users_check_following ──

defineTool({
  name: 'users_check_following',
  description: 'Check if the authenticated user follows another user by username.',
  scope: 'read:user',
  inputSchema: z.object({
    username: z.string().min(1).max(30),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const currentUser = ctx.auth.user;

    const targetUser = await db.query.users.findFirst({
      where: eq(users.username, args.username.toLowerCase()),
    });
    if (!targetUser) {
      return { content: [{ type: 'text' as const, text: 'Error: User not found' }], isError: true };
    }

    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, currentUser.id),
        eq(userFollows.followedId, targetUser.id),
      ),
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ following: !!existing }) }],
    };
  },
});
