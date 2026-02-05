/**
 * Group Management Routes
 *
 * Endpoints for group owners/managers to manage their groups,
 * members, and settings. Also handles entitlement-gated group creation.
 *
 * All endpoints are session-authenticated. Role checks use the shared
 * auth module. Platform admins bypass all group role checks.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  groups,
  groupMembers,
  groupPlatformConnections,
  groupCreationRequests,
  featureFlags,
  userFeatureFlags,
  users,
  GroupMemberRole,
  EventPlatform,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireScope, requireGroupRole, hasMinRole, isPlatformAdmin, ROLE_HIERARCHY } from '../lib/auth.js';
import { consumeEntitlement } from '../lib/entitlements.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, forbidden, notFound, badRequest, conflict } from '../lib/responses.js';
import { eventManagementRoutes } from './event-management.js';
import { checkinManagementRoutes } from './checkin.js';
import { groupBadgeRoutes } from './group-badges.js';

// ============== Validation Schemas ==============

const socialLinksSchema = z.object({
  slack: z.string().url().optional(),
  discord: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  github: z.string().url().optional(),
  meetup: z.string().url().optional(),
}).optional();

const updateGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens').optional(),
  website: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  socialLinks: socialLinksSchema.nullable(),
  photoUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g. #1a365d)').optional().nullable(),
});

const createGroupSchema = z.object({
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  socialLinks: socialLinksSchema,
  photoUrl: z.string().url().optional(),
});

const inviteMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['member', 'volunteer']).optional().default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'manager', 'volunteer', 'member']),
});

// ============== Helper ==============

function parseGroupJsonFields(group: typeof groups.$inferSelect) {
  return {
    ...group,
    tags: group.tags ? JSON.parse(group.tags) : null,
    socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
  };
}

// ============== Routes ==============

export function createGroupManagementRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // ============== Group Creation ==============

  /**
   * POST /groups/create - Create a native group
   * Requires `dev.tampa.group.create` entitlement (consumed on use).
   * Platform admins can create groups without an entitlement.
   */
  app.post('/create', zValidator('json', createGroupSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    // Platform admins don't need the entitlement
    if (!isPlatformAdmin(user)) {
      const consumed = await consumeEntitlement(db, user.id, 'dev.tampa.group.create');
      if (!consumed) {
        return forbidden(c, 'You do not have the required entitlement to create a group');
      }
    }

    // Check urlname uniqueness
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
      platformId: id, // Native groups use their own UUID as platformId
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

    // Create owner membership
    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId: id,
      userId: user.id,
      role: GroupMemberRole.OWNER,
    });

    const createdGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    // Emit domain event
    emitEvent(c, {
      type: 'dev.tampa.group.created',
      payload: { groupId: id, groupName: data.name, createdBy: user.id },
      metadata: { userId: user.id, source: 'group-management' },
    });

    return created(c, createdGroup ? parseGroupJsonFields(createdGroup) : null);
  });

  // ============== List Managed Groups ==============

  /**
   * GET /groups/manage - List groups the user is owner/manager/volunteer of
   */
  app.get('/manage', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    // Platform admins see all groups
    if (isPlatformAdmin(user)) {
      const allGroups = await db.query.groups.findMany({
        orderBy: [desc(groups.updatedAt)],
      });
      return ok(c, allGroups.map((g) => ({
        ...parseGroupJsonFields(g),
        userRole: 'admin' as const,
      })));
    }

    // Regular users see groups where they have a management role
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, user.id),
    });

    const managementMemberships = memberships.filter(
      (m) => hasMinRole(m.role, GroupMemberRole.VOLUNTEER),
    );

    if (managementMemberships.length === 0) {
      return ok(c, []);
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

    return ok(c, managedGroups.filter((g): g is NonNullable<typeof g> => g !== null));
  });

  // ============== Group Detail ==============

  /**
   * GET /groups/manage/:groupId - Group details + user's role + permissions
   */
  app.get('/manage/:groupId', async (c) => {
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

    // Get member count
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    // Get platform connections
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

  // ============== Update Group ==============

  /**
   * PUT /groups/manage/:groupId - Update group settings
   * Requires manager+ role.
   */
  app.put('/manage/:groupId', zValidator('json', updateGroupSchema), async (c) => {
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

    // Check urlname uniqueness if changing
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
      // Update link for native groups
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    return ok(c, updated ? parseGroupJsonFields(updated) : null);
  });

  // ============== My Role ==============

  /**
   * GET /groups/manage/:groupId/my-role - Returns user's role + computed permissions
   */
  app.get('/manage/:groupId/my-role', async (c) => {
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
   * GET /groups/manage/:groupId/members - List group members
   * Requires volunteer+ role.
   */
  app.get('/manage/:groupId/members', async (c) => {
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

    // Fetch user details for each member
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

    return ok(c, memberDetails);
  });

  /**
   * POST /groups/manage/:groupId/members - Invite/add a member
   * Requires manager+ role. Managers can only add as member or volunteer.
   */
  app.post('/manage/:groupId/members', zValidator('json', inviteMemberSchema), async (c) => {
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

    // Check if user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, data.userId),
    });
    if (!targetUser) return notFound(c, 'User not found');

    // Check if already a member
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    const createdMember = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, id),
    });

    return created(c, createdMember);
  });

  /**
   * PATCH /groups/manage/:groupId/members/:memberId - Update a member's role
   * Owner can set any role. Manager can only set volunteer or member.
   */
  app.patch('/manage/:groupId/members/:memberId', zValidator('json', updateMemberRoleSchema), async (c) => {
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

    // Find the target member
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
      // Managers can't change roles of owners or other managers
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    const updated = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, memberId),
    });

    return ok(c, updated);
  });

  /**
   * DELETE /groups/manage/:groupId/members/:memberId - Remove a member
   * Requires manager+ role. Cannot remove last owner.
   */
  app.delete('/manage/:groupId/members/:memberId', async (c) => {
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    return success(c, { message: 'Member removed' });
  });

  // ============== Leave Group ==============

  /**
   * POST /groups/manage/:groupId/leave - Leave a group
   * Any member can leave. Last owner cannot leave.
   */
  app.post('/manage/:groupId/leave', async (c) => {
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

    // Last owner protection
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    return success(c, { message: 'Left group' });
  });

  // ============== Group Creation Requests ==============

  /**
   * POST /groups/request-creation - Submit a group creation request
   * Behind the `self-serve-group-creation` feature flag.
   * Emits dev.tampa.group.creation_requested.
   */
  app.post('/request-creation', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:groups', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    // Check feature flag: self-serve-group-creation
    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.slug, 'self-serve-group-creation'),
    });

    let flagEnabled = false;
    if (flag) {
      // Check user override first
      const userOverride = await db.query.userFeatureFlags.findFirst({
        where: and(
          eq(userFeatureFlags.userId, user.id),
          eq(userFeatureFlags.flagId, flag.id),
        ),
      });
      flagEnabled = userOverride ? userOverride.enabled : flag.enabledByDefault;
    }

    // Platform admins bypass the feature flag
    if (!flagEnabled && !isPlatformAdmin(user)) {
      return forbidden(c, 'Group creation requests are not currently available');
    }

    // Parse request body
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

    // Check for existing pending request from this user
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
      metadata: { userId: user.id, source: 'group-management' },
    });

    return created(c, {
      requestId,
      status: 'pending',
      message: 'Group creation request submitted. An admin will review it.',
    });
  });

  // Mount event management as sub-routes
  app.route('/manage/:groupId/events', eventManagementRoutes);

  // Mount checkin management as sub-routes
  app.route('/manage/:groupId', checkinManagementRoutes);

  // Mount group badge management as sub-routes
  app.route('/manage/:groupId', groupBadgeRoutes);

  return app;
}

export const groupManagementRoutes = createGroupManagementRoutes();
