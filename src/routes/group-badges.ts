/**
 * Group Badge Management Routes
 *
 * Endpoints for managing group-scoped badges, awarding/revoking them,
 * and creating claim links. Requires the `dev.tampa.group.badge_issuer`
 * group feature flag to create badges.
 *
 * Mounted at /manage/:groupId in group-management so handlers can
 * access c.req.param('groupId').
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  groups,
  badges,
  userBadges,
  users,
  badgeClaimLinks,
  featureFlags,
  groupFeatureFlags,
  groupMembers,
  GroupMemberRole,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireGroupRole, requireScope } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, forbidden, notFound, badRequest, conflict } from '../lib/responses.js';
import { withIconUrl } from '../../lib/emoji.js';

// ============== Validation Schemas ==============

const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#E5574F'),
  points: z.number().int().min(0),
  sortOrder: z.number().int().min(0).optional().default(0),
});

const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1).max(20).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  points: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============== Helpers ==============

/**
 * Check if a group has the badge_issuer feature flag enabled.
 */
async function hasGroupBadgeIssuerFlag(
  db: ReturnType<typeof createDatabase>,
  groupId: string,
): Promise<boolean> {
  const flag = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.slug, 'dev.tampa.group.badge_issuer'),
  });
  if (!flag) return false;

  const groupOverride = await db.query.groupFeatureFlags.findFirst({
    where: and(
      eq(groupFeatureFlags.groupId, groupId),
      eq(groupFeatureFlags.flagId, flag.id),
    ),
  });

  return groupOverride ? groupOverride.enabled : flag.enabledByDefault;
}

function generateClaimCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============== Routes ==============

export function createGroupBadgeRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /badges - List group badges with user counts
   * Requires volunteer+ role.
   */
  app.get('/badges', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const groupBadges = await db.query.badges.findMany({
      where: eq(badges.groupId, groupId),
      orderBy: [badges.sortOrder],
    });

    // Get user count per badge
    const badgesWithCounts = await Promise.all(
      groupBadges.map(async (badge) => {
        const badgeUsers = await db.query.userBadges.findMany({
          where: eq(userBadges.badgeId, badge.id),
        });
        return withIconUrl({ ...badge, userCount: badgeUsers.length });
      }),
    );

    return ok(c, {
      badges: badgesWithCounts,
      limits: {
        maxBadges: group.maxBadges,
        maxBadgePoints: group.maxBadgePoints,
        currentBadgeCount: groupBadges.length,
      },
    });
  });

  /**
   * POST /badges - Create a group badge
   * Requires manager+ role and dev.tampa.group.badge_issuer feature flag.
   * Enforces maxBadges limit and maxBadgePoints cap.
   */
  app.post('/badges', zValidator('json', createBadgeSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Check badge_issuer feature flag
    const hasBadgeIssuer = await hasGroupBadgeIssuerFlag(db, groupId);
    if (!hasBadgeIssuer) {
      return forbidden(c, 'Badge creation is not enabled for this group');
    }

    const data = c.req.valid('json');

    // Enforce maxBadges limit
    const existingBadgeCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(badges)
      .where(eq(badges.groupId, groupId));
    const currentCount = existingBadgeCount[0]?.count ?? 0;

    if (currentCount >= group.maxBadges) {
      return conflict(c, `Group has reached the maximum of ${group.maxBadges} badges`);
    }

    // Enforce maxBadgePoints cap
    if (data.points > group.maxBadgePoints) {
      return badRequest(c, `Badge points cannot exceed ${group.maxBadgePoints} for this group`);
    }

    // Check slug uniqueness (globally unique)
    const existingSlug = await db.query.badges.findFirst({
      where: eq(badges.slug, data.slug),
    });
    if (existingSlug) {
      return conflict(c, 'A badge with this slug already exists');
    }

    const id = crypto.randomUUID();
    await db.insert(badges).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      icon: data.icon,
      color: data.color,
      points: data.points,
      sortOrder: data.sortOrder,
      groupId,
    });

    const createdBadge = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    emitEvent(c, {
      type: 'dev.tampa.group.badge_created',
      payload: { groupId, badgeId: id, badgeSlug: data.slug, badgeName: data.name },
      metadata: { userId: user.id, source: 'group-badges' },
    });

    return created(c, createdBadge ? withIconUrl(createdBadge) : createdBadge);
  });

  /**
   * PATCH /badges/:badgeId - Update a group badge
   * Requires manager+ role. Enforces maxBadgePoints cap.
   */
  app.patch('/badges/:badgeId', zValidator('json', updateBadgeSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const data = c.req.valid('json');

    // Enforce maxBadgePoints cap
    if (data.points !== undefined && data.points > group.maxBadgePoints) {
      return badRequest(c, `Badge points cannot exceed ${group.maxBadgePoints} for this group`);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    if (Object.keys(updateData).length > 0) {
      await db.update(badges).set(updateData).where(eq(badges.id, badgeId));
    }

    const updated = await db.query.badges.findFirst({
      where: eq(badges.id, badgeId),
    });

    return ok(c, updated ? withIconUrl(updated) : updated);
  });

  /**
   * DELETE /badges/:badgeId - Delete a group badge
   * Requires owner role.
   */
  app.delete('/badges/:badgeId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.OWNER, user);
    if (!hasRole) return forbidden(c, 'Forbidden - owner role required');

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    // Delete user_badges first, then claim links, then badge
    await db.delete(userBadges).where(eq(userBadges.badgeId, badgeId));
    await db.delete(badgeClaimLinks).where(eq(badgeClaimLinks.badgeId, badgeId));
    await db.delete(badges).where(eq(badges.id, badgeId));

    return success(c, { message: 'Badge deleted' });
  });

  /**
   * POST /badges/:badgeId/award/:userId - Award a group badge to a user
   * Requires manager+ role.
   */
  app.post('/badges/:badgeId/award/:userId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');
    const targetUserId = c.req.param('userId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    // Verify target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!targetUser) return notFound(c, 'User not found');

    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, targetUserId), eq(userBadges.badgeId, badgeId)),
    });
    if (existing) {
      return conflict(c, 'Badge already awarded to this user');
    }

    const now = new Date().toISOString();
    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId: targetUserId,
      badgeId,
      awardedAt: now,
      awardedBy: user.id,
    });

    emitEvent(c, {
      type: 'dev.tampa.badge.issued',
      payload: {
        userId: targetUserId,
        badgeId: badge.id,
        badgeSlug: badge.slug,
        badgeName: badge.name,
        icon: badge.icon,
        color: badge.color,
        points: badge.points,
        groupId,
      },
      metadata: { userId: user.id, source: 'group-badges' },
    });

    return created(c, { message: 'Badge awarded' });
  });

  /**
   * DELETE /badges/:badgeId/revoke/:userId - Revoke a group badge from a user
   * Requires manager+ role.
   */
  app.delete('/badges/:badgeId/revoke/:userId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');
    const targetUserId = c.req.param('userId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, targetUserId), eq(userBadges.badgeId, badgeId)),
    });
    if (!existing) {
      return notFound(c, 'User does not have this badge');
    }

    await db.delete(userBadges).where(eq(userBadges.id, existing.id));

    return success(c, { message: 'Badge revoked' });
  });

  /**
   * POST /badges/:badgeId/claim-links - Create a claim link for a group badge
   * Requires manager+ role.
   */
  app.post('/badges/:badgeId/claim-links', zValidator('json', z.object({
    maxUses: z.number().int().min(1).optional().nullable(),
    expiresAt: z.string().optional().nullable(),
  }).optional().default({})), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const data = c.req.valid('json');
    const code = generateClaimCode();
    const id = crypto.randomUUID();

    await db.insert(badgeClaimLinks).values({
      id,
      badgeId,
      code,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ?? null,
      createdBy: user.id,
    });

    const createdLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.id, id),
    });

    return created(c, createdLink);
  });

  /**
   * GET /badges/:badgeId/claim-links - List claim links for a group badge
   * Requires manager+ role.
   */
  app.get('/badges/:badgeId/claim-links', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:badges', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const badgeId = c.req.param('badgeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    // Verify badge belongs to this group
    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const links = await db.query.badgeClaimLinks.findMany({
      where: eq(badgeClaimLinks.badgeId, badgeId),
    });

    return ok(c, links);
  });

  return app;
}

export const groupBadgeRoutes = createGroupBadgeRoutes();
