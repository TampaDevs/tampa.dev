/**
 * /v1/manage/ -- Management API
 *
 * Exposes group/event/badge/checkin management to third-party tokens.
 * Mirrors the session-based management routes with standardized response
 * envelopes and tri-auth support.
 *
 * Scope requirements:
 *   - manage:groups   → group CRUD, member management
 *   - manage:events   → event CRUD
 *   - manage:badges   → badge CRUD, award/revoke, claim links
 *   - manage:checkins → checkin code management, attendee lists
 *
 * Group role requirements vary by endpoint (documented inline).
 * Platform admins bypass all group role checks.
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  groups,
  groupMembers,
  groupPlatformConnections,
  groupCreationRequests,
  events,
  venues,
  eventCheckinCodes,
  eventCheckins,
  eventRsvps,
  badges,
  userBadges,
  badgeClaimLinks,
  users,
  featureFlags,
  groupFeatureFlags,
  userFeatureFlags,
  GroupMemberRole,
  EventPlatform,
  EventStatus,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireScope, requireGroupRole, hasMinRole, isPlatformAdmin } from '../lib/auth.js';
import type { AuthResult } from '../lib/auth.js';
import { consumeEntitlement } from '../lib/entitlements.js';
import { emitEvent } from '../lib/event-bus.js';
import {
  ok,
  created,
  list,
  success,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  gone,
  badRequest,
  internalError,
  parsePagination,
} from '../lib/responses.js';
import { withIconUrl } from '../../lib/emoji.js';

// ============== Validation Schemas ==============

const socialLinksSchema = z.object({
  slack: z.string().url().optional(),
  discord: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  github: z.string().url().optional(),
  meetup: z.string().url().optional(),
}).optional();

// Shared schema fragments
const themeColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g. #1a365d)');

const createGroupSchema = z.object({
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  socialLinks: socialLinksSchema,
  photoUrl: z.string().url().optional(),
  themeColor: themeColorSchema.optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens').optional(),
  website: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  socialLinks: socialLinksSchema.nullable(),
  photoUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  themeColor: themeColorSchema.optional().nullable(),
});

const inviteMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['member', 'volunteer']).optional().default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'volunteer', 'member']),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  startTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date'),
  endTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional(),
  timezone: z.string().default('America/New_York'),
  eventType: z.enum(['physical', 'online', 'hybrid']).default('physical'),
  maxAttendees: z.number().int().positive().optional(),
  venue: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  photoUrl: z.string().url().optional(),
  status: z.enum(['active', 'draft']).default('active'),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  startTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional(),
  endTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional().nullable(),
  timezone: z.string().optional(),
  eventType: z.enum(['physical', 'online', 'hybrid']).optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  venue: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  status: z.enum(['active', 'draft']).optional(),
});

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

const createClaimLinkSchema = z.object({
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
}).optional().default({});

const createCheckinCodeSchema = z.object({
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
}).optional().default({});

// ============== Helpers ==============

function parseGroupJsonFields(group: typeof groups.$inferSelect) {
  return {
    ...group,
    tags: group.tags ? JSON.parse(group.tags) : null,
    socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
  };
}

function generateCheckinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateClaimCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function computeDuration(startTime: string, endTime: string | null | undefined): string | null {
  if (!endTime) return null;
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (mins > 0) duration += `${mins}M`;
  if (duration === 'PT') duration += '0M';
  return duration;
}

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

// ============== Routes ==============

export function createV1ManageRoutes() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  // =====================================================================
  //  GROUP MANAGEMENT (scope: manage:groups)
  // =====================================================================

  /**
   * GET /v1/manage/groups - List groups the user can manage
   * Platform admins see all groups. Regular users see groups where
   * they have volunteer+ role.
   */
  app.get('/groups', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    if (isPlatformAdmin(user)) {
      const allGroups = await db.query.groups.findMany({
        orderBy: [desc(groups.updatedAt)],
      });
      return ok(c, {
        groups: allGroups.map((g) => ({
          ...parseGroupJsonFields(g),
          userRole: 'admin' as const,
        })),
      });
    }

    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, user.id),
    });

    const managementMemberships = memberships.filter(
      (m) => hasMinRole(m.role, GroupMemberRole.VOLUNTEER),
    );

    if (managementMemberships.length === 0) {
      return ok(c, { groups: [] });
    }

    const managedGroups = await Promise.all(
      managementMemberships.map(async (m) => {
        const group = await db.query.groups.findFirst({
          where: eq(groups.id, m.groupId),
        });
        if (!group) return null;
        return {
          ...parseGroupJsonFields(group),
          userRole: m.role,
        };
      }),
    );

    return ok(c, {
      groups: managedGroups.filter((g): g is NonNullable<typeof g> => g !== null),
    });
  });

  /**
   * POST /v1/manage/groups - Create a native group
   * Requires `dev.tampa.group.create` entitlement (consumed on use).
   * Platform admins can create groups without an entitlement.
   */
  app.post('/groups', zValidator('json', createGroupSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    if (!isPlatformAdmin(user)) {
      const consumed = await consumeEntitlement(db, user.id, 'dev.tampa.group.create');
      if (!consumed) {
        return forbidden(c, 'You do not have the required entitlement to create a group');
      }
    }

    const existing = await db.query.groups.findFirst({
      where: eq(groups.urlname, data.urlname),
    });
    if (existing) {
      return conflict(c, 'A group with this URL name already exists');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(groups).values({
      id,
      platform: EventPlatform.TAMPA_DEV,
      platformId: id,
      urlname: data.urlname,
      name: data.name,
      description: data.description || null,
      link: `https://events.tampa.dev/groups/${data.urlname}`,
      website: data.website || null,
      photoUrl: data.photoUrl || null,
      displayOnSite: true,
      isActive: true,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : null,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId: id,
      userId: user.id,
      role: GroupMemberRole.OWNER,
    });

    const createdGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    emitEvent(c, {
      type: 'dev.tampa.group.created',
      payload: { groupId: id, groupName: data.name, createdBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return created(c, createdGroup ? parseGroupJsonFields(createdGroup) : null);
  });

  /**
   * GET /v1/manage/groups/:groupId - Group detail + permissions
   * Requires volunteer+ role.
   */
  app.get('/groups/:groupId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { member, hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    const connections = await db.query.groupPlatformConnections.findMany({
      where: eq(groupPlatformConnections.groupId, groupId),
    });

    const userRole = isPlatformAdmin(user) ? 'admin' : (member?.role ?? 'none');

    return ok(c, {
      ...parseGroupJsonFields(group),
      userRole,
      memberCount: members.length,
      connections,
      permissions: {
        canEditSettings: isPlatformAdmin(user) || hasMinRole(userRole, GroupMemberRole.MANAGER),
        canManageMembers: isPlatformAdmin(user) || hasMinRole(userRole, GroupMemberRole.MANAGER),
        canManageEvents: isPlatformAdmin(user) || hasMinRole(userRole, GroupMemberRole.MANAGER),
        canCheckIn: isPlatformAdmin(user) || hasMinRole(userRole, GroupMemberRole.VOLUNTEER),
      },
    });
  });

  /**
   * PUT /v1/manage/groups/:groupId - Update group settings
   * Requires manager+ role.
   */
  app.put('/groups/:groupId', zValidator('json', updateGroupSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    if (data.urlname && data.urlname !== group.urlname) {
      const existing = await db.query.groups.findFirst({
        where: eq(groups.urlname, data.urlname),
      });
      if (existing) {
        return conflict(c, 'A group with this URL name already exists');
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.urlname !== undefined) {
      updateData.urlname = data.urlname;
      if (group.platform === EventPlatform.TAMPA_DEV) {
        updateData.link = `https://events.tampa.dev/groups/${data.urlname}`;
      }
    }
    if (data.website !== undefined) updateData.website = data.website;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null;
    if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks ? JSON.stringify(data.socialLinks) : null;

    await db.update(groups).set(updateData).where(eq(groups.id, groupId));

    const updated = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    emitEvent(c, {
      type: 'dev.tampa.group.updated',
      payload: { groupId, fields: Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined) },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return ok(c, updated ? parseGroupJsonFields(updated) : null);
  });

  /**
   * GET /v1/manage/groups/:groupId/my-role - User's role + computed permissions
   */
  app.get('/groups/:groupId/my-role', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id),
      ),
    });

    const userRole = isPlatformAdmin(user) ? 'admin' : (member?.role ?? null);
    const effectiveRole = isPlatformAdmin(user) ? GroupMemberRole.OWNER : (member?.role ?? null);

    return ok(c, {
      role: userRole,
      memberId: member?.id ?? null,
      permissions: {
        canEditSettings: effectiveRole !== null && hasMinRole(effectiveRole, GroupMemberRole.MANAGER),
        canManageMembers: effectiveRole !== null && hasMinRole(effectiveRole, GroupMemberRole.MANAGER),
        canManageEvents: effectiveRole !== null && hasMinRole(effectiveRole, GroupMemberRole.MANAGER),
        canCheckIn: effectiveRole !== null && hasMinRole(effectiveRole, GroupMemberRole.VOLUNTEER),
        canViewDashboard: effectiveRole !== null && hasMinRole(effectiveRole, GroupMemberRole.VOLUNTEER),
      },
    });
  });

  // ============== Member Management ==============

  /**
   * GET /v1/manage/groups/:groupId/members - List group members
   * Requires volunteer+ role.
   */
  app.get('/groups/:groupId/members', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
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

    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const memberUser = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
        });
        return {
          id: m.id,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: memberUser ? {
            id: memberUser.id,
            name: memberUser.name,
            username: memberUser.username,
            avatarUrl: memberUser.avatarUrl,
          } : null,
        };
      }),
    );

    return ok(c, { members: memberDetails });
  });

  /**
   * POST /v1/manage/groups/:groupId/members - Invite/add a member
   * Requires manager+ role. Managers can only add as member or volunteer.
   */
  app.post('/groups/:groupId/members', zValidator('json', inviteMemberSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
    });
    if (!targetUser) return notFound(c, 'User not found');

    const existingMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, data.userId),
      ),
    });
    if (existingMember) {
      return conflict(c, 'User is already a member of this group');
    }

    const id = crypto.randomUUID();
    await db.insert(groupMembers).values({
      id,
      groupId,
      userId: data.userId,
      role: data.role,
    });

    emitEvent(c, {
      type: 'dev.tampa.group.member_added',
      payload: { groupId, userId: data.userId, role: data.role, addedBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    const createdMember = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, id),
    });

    return created(c, createdMember);
  });

  /**
   * PATCH /v1/manage/groups/:groupId/members/:memberId - Update a member's role
   * Owner can set any role. Manager can only set volunteer or member.
   */
  app.patch('/groups/:groupId/members/:memberId', zValidator('json', updateMemberRoleSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');
    const { role: newRole } = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { member: actorMember, hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const targetMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.id, memberId),
        eq(groupMembers.groupId, groupId),
      ),
    });
    if (!targetMember) return notFound(c, 'Member not found');

    // Non-admin managers can only set volunteer or member roles
    if (!isPlatformAdmin(user) && actorMember?.role === GroupMemberRole.MANAGER) {
      if (newRole === GroupMemberRole.OWNER || newRole === GroupMemberRole.MANAGER) {
        return forbidden(c, 'Managers can only assign volunteer or member roles');
      }
      if (hasMinRole(targetMember.role, GroupMemberRole.MANAGER)) {
        return forbidden(c, 'Cannot change role of an owner or manager');
      }
    }

    // Non-admin owners can't demote themselves if they're the last owner
    if (!isPlatformAdmin(user) && targetMember.userId === user.id && targetMember.role === GroupMemberRole.OWNER && newRole !== GroupMemberRole.OWNER) {
      const owners = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.role, GroupMemberRole.OWNER),
        ),
      });
      if (owners.length <= 1) {
        return badRequest(c, 'Cannot demote the last owner of a group');
      }
    }

    await db.update(groupMembers)
      .set({ role: newRole })
      .where(eq(groupMembers.id, memberId));

    emitEvent(c, {
      type: 'dev.tampa.group.member_role_changed',
      payload: {
        groupId,
        userId: targetMember.userId,
        oldRole: targetMember.role,
        newRole,
        changedBy: user.id,
      },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    const updated = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, memberId),
    });

    return ok(c, updated);
  });

  /**
   * DELETE /v1/manage/groups/:groupId/members/:memberId - Remove a member
   * Requires manager+ role. Cannot remove last owner.
   */
  app.delete('/groups/:groupId/members/:memberId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { member: actorMember, hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const targetMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.id, memberId),
        eq(groupMembers.groupId, groupId),
      ),
    });
    if (!targetMember) return notFound(c, 'Member not found');

    // Managers can't remove owners or other managers
    if (!isPlatformAdmin(user) && actorMember?.role === GroupMemberRole.MANAGER) {
      if (hasMinRole(targetMember.role, GroupMemberRole.MANAGER)) {
        return forbidden(c, 'Cannot remove an owner or manager');
      }
    }

    // Last owner protection
    if (targetMember.role === GroupMemberRole.OWNER) {
      const owners = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.role, GroupMemberRole.OWNER),
        ),
      });
      if (owners.length <= 1) {
        return badRequest(c, 'Cannot remove the last owner of a group');
      }
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));

    emitEvent(c, {
      type: 'dev.tampa.group.member_removed',
      payload: { groupId, userId: targetMember.userId, removedBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return success(c);
  });

  /**
   * POST /v1/manage/groups/:groupId/leave - Leave a group
   * Any member can leave. Last owner cannot leave.
   */
  app.post('/groups/:groupId/leave', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.id),
      ),
    });
    if (!member) return badRequest(c, 'You are not a member of this group');

    if (member.role === GroupMemberRole.OWNER) {
      const owners = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.role, GroupMemberRole.OWNER),
        ),
      });
      if (owners.length <= 1) {
        return badRequest(c, 'Cannot leave as the last owner. Transfer ownership first.');
      }
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, member.id));

    emitEvent(c, {
      type: 'dev.tampa.group.member_removed',
      payload: { groupId, userId: user.id, removedBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return success(c);
  });

  /**
   * POST /v1/manage/request-creation - Submit a group creation request
   * Behind the `self-serve-group-creation` feature flag.
   */
  app.post('/request-creation', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.slug, 'self-serve-group-creation'),
    });

    let flagEnabled = false;
    if (flag) {
      const userOverride = await db.query.userFeatureFlags.findFirst({
        where: and(
          eq(userFeatureFlags.userId, user.id),
          eq(userFeatureFlags.flagId, flag.id),
        ),
      });
      flagEnabled = userOverride ? userOverride.enabled : flag.enabledByDefault;
    }

    if (!flagEnabled && !isPlatformAdmin(user)) {
      return forbidden(c, 'Group creation requests are not currently available');
    }

    let groupName: string;
    let description: string | null = null;
    try {
      const body = await c.req.json();
      if (!body.groupName || typeof body.groupName !== 'string') {
        return badRequest(c, 'groupName is required');
      }
      groupName = body.groupName;
      if (body.description && typeof body.description === 'string') {
        description = body.description;
      }
    } catch {
      return badRequest(c, 'Invalid request body');
    }

    const existing = await db.query.groupCreationRequests.findFirst({
      where: and(
        eq(groupCreationRequests.userId, user.id),
        eq(groupCreationRequests.status, 'pending'),
      ),
    });
    if (existing) {
      return conflict(c, 'You already have a pending group creation request');
    }

    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(groupCreationRequests).values({
      id: requestId,
      userId: user.id,
      groupName,
      description,
      status: 'pending',
      createdAt: now,
    });

    emitEvent(c, {
      type: 'dev.tampa.group.creation_requested',
      payload: {
        requestId,
        userId: user.id,
        groupName,
        type: 'creation',
      },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return created(c, {
      requestId,
      status: 'pending',
      message: 'Group creation request submitted. An admin will review it.',
    });
  });

  // =====================================================================
  //  EVENT MANAGEMENT (scope: manage:events)
  // =====================================================================

  /**
   * GET /v1/manage/groups/:groupId/events - List events for a managed group
   * Requires manager+ role. Includes drafts, RSVP/checkin counts.
   */
  app.get('/groups/:groupId/events', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
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

    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, groupId),
      orderBy: [desc(events.startTime)],
    });

    const eventsWithCounts = await Promise.all(
      groupEvents.map(async (event) => {
        const [{ value: rsvpCount }] = await db
          .select({ value: sql<number>`COUNT(*)` })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, 'confirmed')));

        const [{ value: checkinCount }] = await db
          .select({ value: sql<number>`COUNT(*)` })
          .from(eventCheckins)
          .where(eq(eventCheckins.eventId, event.id));

        return {
          ...event,
          rsvpCount,
          checkinCount,
          duration: computeDuration(event.startTime, event.endTime),
        };
      }),
    );

    return ok(c, { events: eventsWithCounts });
  });

  /**
   * GET /v1/manage/groups/:groupId/events/:eventId - Event detail
   * Requires manager+ role. Includes venue, RSVP summary, checkin codes.
   */
  app.get('/groups/:groupId/events/:eventId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Get venue
    let venue = null;
    if (event.venueId) {
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, event.venueId),
      });
    }

    // RSVP summary
    const [{ value: confirmedCount }] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'confirmed')));
    const [{ value: waitlistedCount }] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'waitlisted')));

    // Checkin codes
    const codes = await db.query.eventCheckinCodes.findMany({
      where: eq(eventCheckinCodes.eventId, eventId),
    });

    // Checkin count
    const [{ value: checkinCount }] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(eventCheckins)
      .where(eq(eventCheckins.eventId, eventId));

    return ok(c, {
      ...event,
      duration: computeDuration(event.startTime, event.endTime),
      venue,
      rsvpSummary: {
        confirmed: confirmedCount,
        waitlisted: waitlistedCount,
        capacity: event.maxAttendees,
      },
      checkinCodes: codes,
      checkinCount,
      isNative: event.platform === EventPlatform.TAMPA_DEV,
    });
  });

  /**
   * POST /v1/manage/groups/:groupId/events - Create a native event
   * Requires manager+ role.
   */
  app.post('/groups/:groupId/events', zValidator('json', createEventSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create venue if provided and not online
    let venueId: string | null = null;
    if (data.venue && data.eventType !== 'online') {
      venueId = crypto.randomUUID();
      await db.insert(venues).values({
        id: venueId,
        name: data.venue.name,
        address: data.venue.address ?? null,
        city: data.venue.city ?? null,
        state: data.venue.state ?? null,
        postalCode: data.venue.postalCode ?? null,
        country: data.venue.country ?? null,
        latitude: data.venue.latitude ?? null,
        longitude: data.venue.longitude ?? null,
      });
    }

    // Generate a default checkin code
    const checkinCode = generateCheckinCode();

    await db.insert(events).values({
      id: eventId,
      groupId,
      platform: EventPlatform.TAMPA_DEV,
      platformEventId: eventId,
      title: data.title,
      description: data.description ?? null,
      startTime: data.startTime,
      endTime: data.endTime ?? null,
      timezone: data.timezone,
      duration: computeDuration(data.startTime, data.endTime),
      eventType: data.eventType,
      maxAttendees: data.maxAttendees ?? null,
      venueId,
      photoUrl: data.photoUrl ?? null,
      eventUrl: `https://events.tampa.dev/events/${eventId}`,
      status: data.status as string,
      rsvpCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create default checkin code
    await db.insert(eventCheckinCodes).values({
      id: crypto.randomUUID(),
      eventId,
      code: checkinCode,
      createdBy: user.id,
      createdAt: now,
    });

    const createdEvent = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    emitEvent(c, {
      type: 'dev.tampa.event.created',
      payload: { eventId, groupId, title: data.title, createdBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return created(c, {
      ...createdEvent,
      checkinCode,
    });
  });

  /**
   * PUT /v1/manage/groups/:groupId/events/:eventId - Update a native event
   * Requires manager+ role. Only native events can be edited.
   */
  app.put('/groups/:groupId/events/:eventId', zValidator('json', updateEventSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    if (event.platform !== EventPlatform.TAMPA_DEV) {
      return forbidden(c, 'Only native events can be edited');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.maxAttendees !== undefined) updateData.maxAttendees = data.maxAttendees;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.status !== undefined) updateData.status = data.status;

    // Recompute duration if start/end changed
    const newStartTime = data.startTime ?? event.startTime;
    const newEndTime = data.endTime !== undefined ? data.endTime : event.endTime;
    updateData.duration = computeDuration(newStartTime, newEndTime);

    // Handle venue update
    if (data.venue !== undefined) {
      if (data.venue === null) {
        updateData.venueId = null;
      } else {
        if (event.venueId) {
          await db.update(venues).set({
            name: data.venue.name,
            address: data.venue.address ?? null,
            city: data.venue.city ?? null,
            state: data.venue.state ?? null,
            postalCode: data.venue.postalCode ?? null,
            country: data.venue.country ?? null,
            latitude: data.venue.latitude ?? null,
            longitude: data.venue.longitude ?? null,
          }).where(eq(venues.id, event.venueId));
        } else {
          const venueId = crypto.randomUUID();
          await db.insert(venues).values({
            id: venueId,
            name: data.venue.name,
            address: data.venue.address ?? null,
            city: data.venue.city ?? null,
            state: data.venue.state ?? null,
            postalCode: data.venue.postalCode ?? null,
            country: data.venue.country ?? null,
            latitude: data.venue.latitude ?? null,
            longitude: data.venue.longitude ?? null,
          });
          updateData.venueId = venueId;
        }
      }
    }

    await db.update(events).set(updateData).where(eq(events.id, eventId));

    const updated = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    emitEvent(c, {
      type: 'dev.tampa.event.updated',
      payload: { eventId, groupId, fields: Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined) },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return ok(c, updated);
  });

  /**
   * POST /v1/manage/groups/:groupId/events/:eventId/cancel - Cancel a native event
   * Requires manager+ role. Only native events can be cancelled.
   */
  app.post('/groups/:groupId/events/:eventId/cancel', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    if (event.platform !== EventPlatform.TAMPA_DEV) {
      return forbidden(c, 'Only native events can be cancelled');
    }

    if (event.status === 'cancelled') {
      return conflict(c, 'Event is already cancelled');
    }

    await db.update(events)
      .set({ status: EventStatus.CANCELLED, updatedAt: new Date().toISOString() })
      .where(eq(events.id, eventId));

    emitEvent(c, {
      type: 'dev.tampa.event.cancelled',
      payload: { eventId, groupId, title: event.title, cancelledBy: user.id },
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return success(c);
  });

  // =====================================================================
  //  BADGE MANAGEMENT (scope: manage:badges)
  // =====================================================================

  /**
   * GET /v1/manage/groups/:groupId/badges - List group badges with user counts
   * Requires volunteer+ role.
   */
  app.get('/groups/:groupId/badges', async (c) => {
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
   * POST /v1/manage/groups/:groupId/badges - Create a group badge
   * Requires manager+ role and dev.tampa.group.badge_issuer feature flag.
   */
  app.post('/groups/:groupId/badges', zValidator('json', createBadgeSchema), async (c) => {
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
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return created(c, createdBadge ? withIconUrl(createdBadge) : createdBadge);
  });

  /**
   * PATCH /v1/manage/groups/:groupId/badges/:badgeId - Update a group badge
   * Requires manager+ role. Enforces maxBadgePoints cap.
   */
  app.patch('/groups/:groupId/badges/:badgeId', zValidator('json', updateBadgeSchema), async (c) => {
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

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const data = c.req.valid('json');

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
   * DELETE /v1/manage/groups/:groupId/badges/:badgeId - Delete a group badge
   * Requires owner role. Cascades: deletes user_badges and claim links.
   */
  app.delete('/groups/:groupId/badges/:badgeId', async (c) => {
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
    if (!hasRole) return forbidden(c, 'Owner role required');

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    await db.delete(userBadges).where(eq(userBadges.badgeId, badgeId));
    await db.delete(badgeClaimLinks).where(eq(badgeClaimLinks.badgeId, badgeId));
    await db.delete(badges).where(eq(badges.id, badgeId));

    return success(c);
  });

  /**
   * POST /v1/manage/groups/:groupId/badges/:badgeId/award/:userId - Award badge
   * Requires manager+ role.
   */
  app.post('/groups/:groupId/badges/:badgeId/award/:userId', async (c) => {
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

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    if (!targetUser) return notFound(c, 'User not found');

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
      metadata: { userId: user.id, source: 'v1-manage' },
    });

    return created(c, { awarded: true });
  });

  /**
   * DELETE /v1/manage/groups/:groupId/badges/:badgeId/revoke/:userId - Revoke badge
   * Requires manager+ role.
   */
  app.delete('/groups/:groupId/badges/:badgeId/revoke/:userId', async (c) => {
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

    return success(c);
  });

  /**
   * POST /v1/manage/groups/:groupId/badges/:badgeId/claim-links - Create claim link
   * Requires manager+ role.
   */
  app.post('/groups/:groupId/badges/:badgeId/claim-links', zValidator('json', createClaimLinkSchema), async (c) => {
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
   * GET /v1/manage/groups/:groupId/badges/:badgeId/claim-links - List claim links
   * Requires manager+ role.
   */
  app.get('/groups/:groupId/badges/:badgeId/claim-links', async (c) => {
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

    const badge = await db.query.badges.findFirst({
      where: and(eq(badges.id, badgeId), eq(badges.groupId, groupId)),
    });
    if (!badge) return notFound(c, 'Badge not found in this group');

    const links = await db.query.badgeClaimLinks.findMany({
      where: eq(badgeClaimLinks.badgeId, badgeId),
    });

    return ok(c, { claimLinks: links });
  });

  // =====================================================================
  //  CHECKIN MANAGEMENT (scope: manage:checkins)
  // =====================================================================

  /**
   * POST /v1/manage/groups/:groupId/events/:eventId/checkin-codes - Generate code
   * Requires volunteer+ role.
   */
  app.post('/groups/:groupId/events/:eventId/checkin-codes', zValidator('json', createCheckinCodeSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    const data = c.req.valid('json');
    const code = generateCheckinCode();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(eventCheckinCodes).values({
      id,
      eventId,
      code,
      maxUses: data.maxUses ?? null,
      expiresAt: data.expiresAt ?? null,
      createdBy: user.id,
      createdAt: now,
    });

    const createdCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.id, id),
    });

    return created(c, createdCode);
  });

  /**
   * GET /v1/manage/groups/:groupId/events/:eventId/checkin-codes - List codes
   * Requires volunteer+ role.
   */
  app.get('/groups/:groupId/events/:eventId/checkin-codes', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    const codes = await db.query.eventCheckinCodes.findMany({
      where: eq(eventCheckinCodes.eventId, eventId),
    });

    return ok(c, { codes });
  });

  /**
   * DELETE /v1/manage/groups/:groupId/checkin-codes/:codeId - Delete a checkin code
   * Requires manager+ role.
   */
  app.delete('/groups/:groupId/checkin-codes/:codeId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const codeId = c.req.param('codeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const code = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.id, codeId),
    });
    if (!code) return notFound(c, 'Checkin code not found');

    // Verify the code belongs to an event in this group
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, code.eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Checkin code not found in this group');

    await db.delete(eventCheckinCodes).where(eq(eventCheckinCodes.id, codeId));

    return success(c);
  });

  /**
   * GET /v1/manage/groups/:groupId/events/:eventId/attendees - Attendee list
   * Requires volunteer+ role.
   */
  app.get('/groups/:groupId/events/:eventId/attendees', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Get all RSVPs (non-cancelled)
    const rsvps = await db.query.eventRsvps.findMany({
      where: eq(eventRsvps.eventId, eventId),
    });

    // Get all checkins
    const checkins = await db.query.eventCheckins.findMany({
      where: eq(eventCheckins.eventId, eventId),
    });

    const checkinMap = new Map(checkins.map((ch) => [ch.userId, ch]));

    const attendees = await Promise.all(
      rsvps
        .filter((r) => r.status !== 'cancelled')
        .map(async (r) => {
          const attendeeUser = await db.query.users.findFirst({
            where: eq(users.id, r.userId),
          });
          const checkin = checkinMap.get(r.userId);
          return {
            rsvpId: r.id,
            userId: r.userId,
            rsvpStatus: r.status,
            rsvpAt: r.rsvpAt,
            waitlistPosition: r.waitlistPosition,
            checkedIn: !!checkin,
            checkedInAt: checkin?.checkedInAt ?? null,
            checkinMethod: checkin?.method ?? null,
            user: attendeeUser ? {
              id: attendeeUser.id,
              name: attendeeUser.name,
              username: attendeeUser.username,
              avatarUrl: attendeeUser.avatarUrl,
            } : null,
          };
        }),
    );

    return ok(c, {
      attendees,
      totalConfirmed: rsvps.filter((r) => r.status === 'confirmed').length,
      totalWaitlisted: rsvps.filter((r) => r.status === 'waitlisted').length,
      totalCheckedIn: checkins.length,
    });
  });

  return app;
}

export const v1ManageRoutes = createV1ManageRoutes();
