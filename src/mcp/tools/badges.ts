/**
 * MCP Badge Tools
 *
 * Tools for querying badges, viewing claim info, claiming badges,
 * and viewing a user's badge collection.
 */

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { badges, userBadges, users, groups } from '../../db/schema.js';
import { getClaimInfo, claimBadge, ClaimError } from '../../services/claims.js';
import type { ToolResult } from '../types.js';

// ── badges_list ──

defineTool({
  name: 'badges_list',
  description: 'List badges with optional pagination. Returns id, name, slug, description, icon, xpValue, groupId, and createdAt for each badge.',
  scope: null,
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    const results = await db
      .select({
        id: badges.id,
        name: badges.name,
        slug: badges.slug,
        description: badges.description,
        icon: badges.icon,
        xpValue: badges.points,
        groupId: badges.groupId,
        createdAt: badges.createdAt,
      })
      .from(badges)
      .orderBy(badges.sortOrder, badges.createdAt)
      .limit(args.limit)
      .offset(args.offset);

    const countResult = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(badges);
    const total = countResult[0]?.total ?? 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ badges: results, total, limit: args.limit, offset: args.offset }),
      }],
    };
  },
});

// ── badges_get ──

defineTool({
  name: 'badges_get',
  description: 'Get a single badge by its slug. Includes the group name if the badge belongs to a group.',
  scope: null,
  inputSchema: z.object({
    slug: z.string().min(1).max(100),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    const badge = await db.query.badges.findFirst({
      where: eq(badges.slug, args.slug),
    });

    if (!badge) {
      return {
        content: [{ type: 'text', text: 'Error: Badge not found' }],
        isError: true,
      };
    }

    let groupName: string | null = null;
    if (badge.groupId) {
      const group = await db.query.groups.findFirst({
        where: eq(groups.id, badge.groupId),
      });
      groupName = group?.name ?? null;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: badge.id,
          name: badge.name,
          slug: badge.slug,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          xpValue: badge.points,
          groupId: badge.groupId,
          groupName,
          createdAt: badge.createdAt,
        }),
      }],
    };
  },
});

// ── badges_claim_info ──

defineTool({
  name: 'badges_claim_info',
  description: 'Get information about a badge claim link by its code. Returns badge details and whether it is still claimable.',
  scope: null,
  inputSchema: z.object({
    code: z.string().min(1).max(200),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    try {
      const info = await getClaimInfo(db, args.code);
      return {
        content: [{ type: 'text', text: JSON.stringify(info) }],
      };
    } catch (error) {
      if (error instanceof ClaimError) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: 'Error: Internal server error' }],
        isError: true,
      };
    }
  },
});

// ── badges_claim ──

defineTool({
  name: 'badges_claim',
  description: 'Claim a badge using a claim link code. Requires authentication. Awards the badge to the current user and emits domain events.',
  scope: 'read:user',
  inputSchema: z.object({
    code: z.string().min(1).max(200),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await claimBadge(db, ctx.auth.user.id, args.code);

      // Emit domain events via the queue
      if (result.events) {
        for (const event of result.events) {
          ctx.executionCtx.waitUntil(
            ctx.env.EVENTS_QUEUE.send({
              ...event,
              timestamp: new Date().toISOString(),
            }),
          );
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            badge: result.badge,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof ClaimError) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: 'Error: Internal server error' }],
        isError: true,
      };
    }
  },
});

// ── users_group_badges ──

defineTool({
  name: 'users_group_badges',
  description: 'Get badges earned by a user, identified by username. Optionally filter by group slug.',
  scope: null,
  inputSchema: z.object({
    username: z.string().min(1).max(30),
    group_slug: z.string().min(1).max(100).optional(),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    // Look up user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, args.username),
    });

    if (!user) {
      return {
        content: [{ type: 'text', text: 'Error: User not found' }],
        isError: true,
      };
    }

    // Only allow viewing badges for public profiles
    if (user.profileVisibility !== 'public') {
      return {
        content: [{ type: 'text', text: 'Error: User profile is private' }],
        isError: true,
      };
    }

    // Optionally look up group by slug
    let groupId: string | undefined;
    if (args.group_slug) {
      const group = await db.query.groups.findFirst({
        where: eq(groups.urlname, args.group_slug),
      });
      if (!group) {
        return {
          content: [{ type: 'text', text: 'Error: Group not found' }],
          isError: true,
        };
      }
      groupId = group.id;
    }

    // Build the query with optional group filter
    let query;
    if (groupId) {
      query = db
        .select({
          badgeId: badges.id,
          name: badges.name,
          slug: badges.slug,
          description: badges.description,
          icon: badges.icon,
          color: badges.color,
          xpValue: badges.points,
          groupId: badges.groupId,
          awardedAt: userBadges.awardedAt,
          awardedBy: userBadges.awardedBy,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(sql`${userBadges.userId} = ${user.id} AND ${badges.groupId} = ${groupId}`)
        .orderBy(badges.sortOrder, userBadges.awardedAt);
    } else {
      query = db
        .select({
          badgeId: badges.id,
          name: badges.name,
          slug: badges.slug,
          description: badges.description,
          icon: badges.icon,
          color: badges.color,
          xpValue: badges.points,
          groupId: badges.groupId,
          awardedAt: userBadges.awardedAt,
          awardedBy: userBadges.awardedBy,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, user.id))
        .orderBy(badges.sortOrder, userBadges.awardedAt);
    }

    const results = await query;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          username: user.username,
          badges: results,
          total: results.length,
        }),
      }],
    };
  },
});
