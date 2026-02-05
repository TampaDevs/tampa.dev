/**
 * MCP Tools: Badge Management
 *
 * Tools for creating, updating, deleting, awarding, and revoking group badges,
 * plus creating and listing claim links.
 * All tools require the `manage:badges` scope and appropriate group roles.
 */

import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { withIconUrl } from '../../../lib/emoji.js';
import {
  badges,
  userBadges,
  badgeClaimLinks,
  users,
  groups,
  GroupMemberRole,
} from '../../db/schema.js';
import { requireGroupRole } from '../../lib/auth.js';

// ── Helper ──

function generateClaimCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── manage_list_badges ──

defineTool({
  name: 'manage_list_badges',
  description: 'List all badges for a group. Requires volunteer+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    const badgeList = await db
      .select()
      .from(badges)
      .where(eq(badges.groupId, groupId));

    return { content: [{ type: 'text', text: JSON.stringify(badgeList.map(withIconUrl)) }] };
  },
});

// ── manage_create_badge ──

defineTool({
  name: 'manage_create_badge',
  description: 'Create a new badge for a group. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    name: z.string().min(1).max(100).describe('Badge display name'),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').describe('URL-safe slug for the badge'),
    description: z.string().max(500).optional().describe('Badge description'),
    icon: z.string().min(1).max(20).describe('Emoji or icon identifier'),
    xpValue: z.number().int().min(0).default(0).describe('XP points awarded for this badge'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, name, slug, description, icon, xpValue } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify group exists
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) {
      return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
    }

    // Check badge limit
    const existingBadges = await db
      .select({ count: sql<number>`count(*)` })
      .from(badges)
      .where(eq(badges.groupId, groupId));
    if ((existingBadges[0]?.count ?? 0) >= group.maxBadges) {
      return { content: [{ type: 'text', text: `Error: Badge limit reached (max ${group.maxBadges} badges per group)` }], isError: true };
    }

    // Check XP limit
    if (xpValue > group.maxBadgePoints) {
      return { content: [{ type: 'text', text: `Error: XP value exceeds group limit (max ${group.maxBadgePoints} points per badge)` }], isError: true };
    }

    // Check slug uniqueness
    const existingSlug = await db.query.badges.findFirst({
      where: eq(badges.slug, slug),
    });
    if (existingSlug) {
      return { content: [{ type: 'text', text: 'Error: A badge with this slug already exists' }], isError: true };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(badges).values({
      id,
      name,
      slug,
      description: description ?? null,
      icon,
      color: '#E5574F',
      points: xpValue,
      sortOrder: 0,
      groupId,
      createdAt: now,
    });

    const created = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.created',
        payload: { badgeId: id, groupId, name, slug },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify(created ? withIconUrl(created) : created) }] };
  },
});

// ── manage_update_badge ──

defineTool({
  name: 'manage_update_badge',
  description: 'Update an existing badge. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
    name: z.string().min(1).max(100).optional().describe('Badge display name'),
    description: z.string().max(500).optional().describe('Badge description'),
    icon: z.string().min(1).max(20).optional().describe('Emoji or icon identifier'),
    xpValue: z.number().int().min(0).optional().describe('XP points awarded for this badge'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId, ...updates } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    // Check XP limit if changing points
    if (updates.xpValue !== undefined) {
      const group = await db.query.groups.findFirst({
        where: eq(groups.id, groupId),
      });
      if (group && updates.xpValue > group.maxBadgePoints) {
        return { content: [{ type: 'text', text: `Error: XP value exceeds group limit (max ${group.maxBadgePoints} points per badge)` }], isError: true };
      }
    }

    const setValues: Record<string, unknown> = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.icon !== undefined) setValues.icon = updates.icon;
    if (updates.xpValue !== undefined) setValues.points = updates.xpValue;

    if (Object.keys(setValues).length === 0) {
      return { content: [{ type: 'text', text: 'Error: No fields to update' }], isError: true };
    }

    await db.update(badges).set(setValues).where(eq(badges.id, badgeId));

    const updated = await db.query.badges.findFirst({
      where: eq(badges.id, badgeId),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.updated',
        payload: { badgeId, groupId, changes: Object.keys(updates) },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify(updated ? withIconUrl(updated) : updated) }] };
  },
});

// ── manage_delete_badge ──

defineTool({
  name: 'manage_delete_badge',
  description: 'Delete a badge from a group. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    await db.delete(badges).where(eq(badges.id, badgeId));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.deleted',
        payload: { badgeId, groupId, name: badge.name },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, badgeId }) }] };
  },
});

// ── manage_award_badge ──

defineTool({
  name: 'manage_award_badge',
  description: 'Award a badge to a user. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
    userId: z.string().min(1).describe('The user ID to award the badge to'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId, userId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify badge belongs to group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    // Verify user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!targetUser) {
      return { content: [{ type: 'text', text: 'Error: User not found' }], isError: true };
    }

    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (existing) {
      return { content: [{ type: 'text', text: 'Error: User already has this badge' }], isError: true };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(userBadges).values({
      id,
      userId,
      badgeId,
      awardedAt: now,
      awardedBy: ctx.auth.user.id,
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.awarded',
        payload: { badgeId, userId, groupId, badgeName: badge.name },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ id, userId, badgeId, awardedAt: now, awardedBy: ctx.auth.user.id }) }] };
  },
});

// ── manage_revoke_badge ──

defineTool({
  name: 'manage_revoke_badge',
  description: 'Revoke a badge from a user. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
    userId: z.string().min(1).describe('The user ID to revoke the badge from'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId, userId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify badge belongs to group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    // Check if the user has the badge
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (!existing) {
      return { content: [{ type: 'text', text: 'Error: User does not have this badge' }], isError: true };
    }

    await db.delete(userBadges).where(eq(userBadges.id, existing.id));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.revoked',
        payload: { badgeId, userId, groupId, badgeName: badge.name },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, badgeId, userId }) }] };
  },
});

// ── manage_create_claim_link ──

defineTool({
  name: 'manage_create_claim_link',
  description: 'Create a claim link for a badge that users can use to self-claim. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
    maxUses: z.number().int().positive().optional().describe('Maximum number of times the link can be used'),
    expiresInDays: z.number().int().positive().optional().describe('Number of days until the link expires'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId, maxUses, expiresInDays } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify badge belongs to group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    const id = crypto.randomUUID();
    const code = generateClaimCode();
    const now = new Date().toISOString();

    let expiresAt: string | null = null;
    if (expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiresInDays);
      expiresAt = expiry.toISOString();
    }

    await db.insert(badgeClaimLinks).values({
      id,
      badgeId,
      code,
      maxUses: maxUses ?? null,
      currentUses: 0,
      expiresAt,
      createdBy: ctx.auth.user.id,
      createdAt: now,
    });

    const claimUrl = `https://events.tampa.dev/claim/${code}`;

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.badge.claim_link_created',
        payload: { badgeId, groupId, claimLinkId: id },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ id, badgeId, code, claimUrl, maxUses: maxUses ?? null, currentUses: 0, expiresAt, createdAt: now }),
      }],
    };
  },
});

// ── manage_list_claim_links ──

defineTool({
  name: 'manage_list_claim_links',
  description: 'List all claim links for a badge. Requires manager+ role.',
  scope: 'manage:badges',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    badgeId: z.string().min(1).describe('The badge ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, badgeId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify badge belongs to group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) {
      return { content: [{ type: 'text', text: 'Error: Badge not found in this group' }], isError: true };
    }

    const links = await db
      .select()
      .from(badgeClaimLinks)
      .where(eq(badgeClaimLinks.badgeId, badgeId));

    const result = links.map((link) => ({
      ...link,
      claimUrl: `https://events.tampa.dev/claim/${link.code}`,
    }));

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});
