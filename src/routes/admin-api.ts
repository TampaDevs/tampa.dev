/**
 * Admin API Routes
 *
 * Endpoints for managing groups, triggering syncs, and viewing logs.
 * Protected by requireAdmin middleware — all endpoints require admin role.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { groups, events, syncLogs, users, userIdentities, sessions, userFavorites, badges, userBadges, featureFlags, userFeatureFlags, groupFeatureFlags, groupMembers, achievements, achievementProgress, webhooks, webhookDeliveries, userEntitlements, badgeClaimLinks, groupPlatformConnections, groupClaimRequests, groupClaimInvites, groupCreationRequests, EventPlatform, UserRole, GroupMemberRole } from '../db/schema';
import { SyncService } from '../services/sync';
import { providerRegistry } from '../providers';
import type { Env } from '../../types/worker';
import { emitEvent } from '../lib/event-bus.js';
import { requireAdmin, type AuthUser } from '../middleware/auth.js';
import { ok, created, list, success, notFound, conflict, badRequest, internalError } from '../lib/responses.js';
import { invalidateResponseCache } from '../cache.js';
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

const createGroupSchema = z.object({
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200),
  platform: z.enum(['meetup', 'eventbrite', 'luma', 'tampa.dev']),
  platformId: z.string().min(1).max(200),
  description: z.string().optional(),
  link: z.string().url().optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
  // Site display configuration
  displayOnSite: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional(),
  socialLinks: socialLinksSchema,
});

const updateGroupSchema = z.object({
  urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(200).optional(),
  platformId: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  website: z.string().url().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  // Site display configuration
  displayOnSite: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional().nullable(),
  socialLinks: socialLinksSchema.nullable(),
  // Badge governance
  maxBadges: z.number().int().min(0).max(1000).optional(),
  maxBadgePoints: z.number().int().min(0).max(10000).optional(),
});

const listGroupsSchema = z.object({
  platform: z.enum(['meetup', 'eventbrite', 'luma', 'tampa.dev']).optional(),
  active: z.enum(['true', 'false']).optional(),
  displayOnSite: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * Parse JSON fields in a group object for API response
 */
function parseGroupJsonFields(group: typeof groups.$inferSelect) {
  return {
    ...group,
    tags: group.tags ? JSON.parse(group.tags) : null,
    socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
  };
}

const syncLogsSchema = z.object({
  groupId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

// ============== Admin API Router ==============

export function createAdminApiRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // Require admin role for all admin API endpoints
  app.use('*', requireAdmin);

  // Global error handler: sanitize internal errors so they are not leaked to clients
  app.onError((err, c) => {
    console.error('Admin API error:', err instanceof Error ? err.message : 'unknown error');
    return c.json({ error: 'Internal server error' }, 500);
  });

  // ============== Groups ==============

  /**
   * List all groups
   * GET /api/admin/groups
   */
  app.get('/groups', zValidator('query', listGroupsSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { platform, active, displayOnSite, featured, search, limit, offset } = c.req.valid('query');

    // Build query conditions
    const conditions = [];
    if (platform) {
      conditions.push(eq(groups.platform, platform));
    }
    if (active !== undefined) {
      conditions.push(eq(groups.isActive, active === 'true'));
    }
    if (displayOnSite !== undefined) {
      conditions.push(eq(groups.displayOnSite, displayOnSite === 'true'));
    }
    if (featured !== undefined) {
      conditions.push(eq(groups.isFeatured, featured === 'true'));
    }
    if (search) {
      conditions.push(like(groups.name, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.groups.findMany({
      where,
      orderBy: [desc(groups.updatedAt)],
      limit,
      offset,
    });

    // Get total count
    const allGroups = await db.query.groups.findMany({ where });
    const total = allGroups.length;

    return list(c, results.map(parseGroupJsonFields), { total, limit, offset });
  });

  /**
   * Get a single group
   * GET /api/admin/groups/:id
   */
  app.get('/groups/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!group) {
      return notFound(c, 'Group not found');
    }

    // Get event count for this group
    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, id),
    });

    return ok(c, {
      ...parseGroupJsonFields(group),
      eventCount: groupEvents.length,
    });
  });

  /**
   * Create a new group
   * POST /api/admin/groups
   */
  app.post('/groups', zValidator('json', createGroupSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    // Check if urlname already exists
    const existing = await db.query.groups.findFirst({
      where: eq(groups.urlname, data.urlname),
    });

    if (existing) {
      return conflict(c, 'A group with this urlname already exists');
    }

    // Check if platformId already exists for this platform
    const existingPlatformId = await db.query.groups.findFirst({
      where: and(
        eq(groups.platform, data.platform),
        eq(groups.platformId, data.platformId)
      ),
    });

    if (existingPlatformId) {
      return conflict(c, `A group with this platform ID already exists: ${existingPlatformId.urlname}`);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await db.insert(groups).values({
      id,
      urlname: data.urlname,
      name: data.name,
      platform: data.platform,
      platformId: data.platformId,
      description: data.description,
      link: data.link || `https://${data.platform}.com/${data.platformId}`,
      website: data.website,
      isActive: data.isActive ?? true,
      displayOnSite: data.displayOnSite ?? false,
      isFeatured: data.isFeatured ?? false,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      socialLinks: data.socialLinks ? JSON.stringify(data.socialLinks) : null,
      createdAt: now,
      updatedAt: now,
    });

    // For non-tampa.dev groups, also create a platform connection
    if (data.platform !== 'tampa.dev') {
      await db.insert(groupPlatformConnections).values({
        id: crypto.randomUUID(),
        groupId: id,
        platform: data.platform,
        platformId: data.platformId,
        platformUrlname: data.urlname,
        platformLink: data.link || `https://${data.platform}.com/${data.platformId}`,
        isActive: data.isActive ?? true,
      });
    }

    const createdGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    return created(c, createdGroup ? parseGroupJsonFields(createdGroup) : null);
  });

  /**
   * Update a group
   * PUT /api/admin/groups/:id
   */
  app.put('/groups/:id', zValidator('json', updateGroupSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!existing) {
      return notFound(c, 'Group not found');
    }

    // Check urlname uniqueness if changing
    if (data.urlname && data.urlname !== existing.urlname) {
      const urlnameExists = await db.query.groups.findFirst({
        where: eq(groups.urlname, data.urlname),
      });
      if (urlnameExists) {
        return conflict(c, 'A group with this urlname already exists');
      }
    }

    // Prepare update data with JSON serialization for complex fields
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Serialize tags and socialLinks to JSON if provided
    if (data.tags !== undefined) {
      updateData.tags = data.tags ? JSON.stringify(data.tags) : null;
    }
    if (data.socialLinks !== undefined) {
      updateData.socialLinks = data.socialLinks ? JSON.stringify(data.socialLinks) : null;
    }

    await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, id));

    // Invalidate response cache if display-affecting fields changed
    if (data.isFeatured !== undefined || data.displayOnSite !== undefined || data.isActive !== undefined) {
      await invalidateResponseCache(c.env.DB);
    }

    const updated = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    return ok(c, updated ? parseGroupJsonFields(updated) : null);
  });

  /**
   * Delete a group
   * DELETE /api/admin/groups/:id
   *
   * By default performs a soft delete (isActive = false).
   * Pass ?hard=true to permanently delete the group and all related data.
   */
  app.delete('/groups/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const hard = c.req.query('hard') === 'true';

    const existing = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!existing) {
      return notFound(c, 'Group not found');
    }

    if (hard) {
      // Hard delete — remove all dependent records, then the group itself.
      // Tables with ON DELETE CASCADE (groupMembers, userFavorites,
      // groupPlatformConnections, groupFeatureFlags, groupClaimRequests,
      // groupClaimInvites) are handled automatically.
      // Tables without CASCADE need manual cleanup.

      // 1. Delete events and their dependents (RSVPs, checkins, checkin codes cascade from events)
      const groupEvents = await db.query.events.findMany({
        where: eq(events.groupId, id),
        columns: { id: true },
      });
      if (groupEvents.length > 0) {
        for (const evt of groupEvents) {
          await db.delete(events).where(eq(events.id, evt.id));
        }
      }

      // 2. Delete badges and their dependents
      //    userBadges has ON DELETE CASCADE from badges, but badgeClaimLinks does not,
      //    so claim links must be deleted explicitly before badges.
      const groupBadges = await db.query.badges.findMany({
        where: eq(badges.groupId, id),
        columns: { id: true },
      });
      if (groupBadges.length > 0) {
        for (const badge of groupBadges) {
          await db.delete(badgeClaimLinks).where(eq(badgeClaimLinks.badgeId, badge.id));
          await db.delete(badges).where(eq(badges.id, badge.id));
        }
      }

      // 3. Nullify sync log references (historical data, keep logs but unlink group)
      await db
        .update(syncLogs)
        .set({ groupId: null })
        .where(eq(syncLogs.groupId, id));

      // 4. Nullify group creation request references
      await db
        .update(groupCreationRequests)
        .set({ groupId: null })
        .where(eq(groupCreationRequests.groupId, id));

      // 5. Delete the group (cascades: groupMembers, userFavorites,
      //    groupPlatformConnections, groupFeatureFlags, groupClaimRequests, groupClaimInvites)
      await db.delete(groups).where(eq(groups.id, id));

      await invalidateResponseCache(c.env.DB);

      return success(c, { message: 'Group permanently deleted' });
    }

    // Soft delete - just mark as inactive
    await db
      .update(groups)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(groups.id, id));

    await invalidateResponseCache(c.env.DB);

    return success(c, { message: 'Group deactivated' });
  });

  // ============== Sync ==============

  /**
   * Get sync status overview
   * GET /api/admin/sync/status
   */
  app.get('/sync/status', async (c) => {
    const db = createDatabase(c.env.DB);

    // Get group counts
    const allGroups = await db.query.groups.findMany();
    const activeGroups = allGroups.filter(g => g.isActive);

    // Get recent sync logs
    const recentLogs = await db.query.syncLogs.findMany({
      orderBy: [desc(syncLogs.startedAt)],
      limit: 10,
    });

    // Get last successful sync per platform
    const platforms = ['meetup', 'eventbrite', 'luma', 'tampa.dev'];
    const platformStatus: Record<string, { lastSync?: string; status?: string }> = {};

    for (const platform of platforms) {
      const lastLog = await db.query.syncLogs.findFirst({
        where: eq(syncLogs.platform, platform),
        orderBy: [desc(syncLogs.startedAt)],
      });
      platformStatus[platform] = {
        lastSync: lastLog?.completedAt || lastLog?.startedAt,
        status: lastLog?.status,
      };
    }

    // Get configured providers
    const configuredProviders = providerRegistry.getConfiguredAdapters(c.env);

    return ok(c, {
      groups: {
        total: allGroups.length,
        active: activeGroups.length,
        byPlatform: {
          meetup: allGroups.filter(g => g.platform === 'meetup').length,
          eventbrite: allGroups.filter(g => g.platform === 'eventbrite').length,
          luma: allGroups.filter(g => g.platform === 'luma').length,
        },
      },
      providers: {
        configured: configuredProviders.map(p => p.platform),
        status: platformStatus,
      },
      recentSyncs: recentLogs,
    });
  });

  /**
   * Trigger sync for all groups
   * POST /api/admin/sync/all
   */
  app.post('/sync/all', async (c) => {
    try {
      const db = createDatabase(c.env.DB);

      // Initialize providers (non-fatal - individual group syncs handle missing providers)
      try {
        await providerRegistry.initializeAll(c.env);
      } catch (initError) {
        console.error('Provider initialization error (continuing):', initError);
      }

      const syncService = new SyncService(db, providerRegistry, c.env);
      const result = await syncService.syncAllGroups();

      return ok(c, result);
    } catch (error) {
      console.error('Sync all failed:', error);
      return internalError(c);
    }
  });

  /**
   * Trigger sync for a single group
   * POST /api/admin/sync/group/:id
   */
  app.post('/sync/group/:id', async (c) => {
    try {
      const db = createDatabase(c.env.DB);
      const id = c.req.param('id');

      // Check group exists
      const group = await db.query.groups.findFirst({
        where: eq(groups.id, id),
      });

      if (!group) {
        return notFound(c, 'Group not found');
      }

      // Initialize providers (non-fatal - sync handles missing providers)
      try {
        await providerRegistry.initializeAll(c.env);
      } catch (initError) {
        console.error('Provider initialization error (continuing):', initError);
      }

      const syncService = new SyncService(db, providerRegistry, c.env);
      const result = await syncService.syncGroup(id);

      return ok(c, result);
    } catch (error) {
      console.error('Sync group failed:', error);
      return internalError(c);
    }
  });

  /**
   * Get sync logs
   * GET /api/admin/sync/logs
   */
  app.get('/sync/logs', zValidator('query', syncLogsSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { groupId, limit } = c.req.valid('query');

    const syncService = new SyncService(db, providerRegistry, c.env);
    const logs = await syncService.getSyncLogs({ groupId, limit });

    return ok(c, logs);
  });

  // ============== Events (read-only for admin) ==============

  /**
   * List events for a group
   * GET /api/admin/groups/:id/events
   */
  app.get('/groups/:id/events', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!group) {
      return notFound(c, 'Group not found');
    }

    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, id),
      orderBy: [desc(events.startTime)],
      limit: 50,
    });

    return ok(c, {
      group: parseGroupJsonFields(group),
      events: groupEvents,
    });
  });

  // ============== Group Platform Connections ==============

  const addConnectionSchema = z.object({
    platform: z.enum(['meetup', 'eventbrite', 'luma']),
    platformId: z.string().min(1).max(200),
    platformUrlname: z.string().optional(),
    platformLink: z.string().url().optional(),
    isActive: z.boolean().optional().default(true),
  });

  /**
   * List platform connections for a group
   * GET /api/admin/groups/:groupId/connections
   */
  app.get('/groups/:groupId/connections', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const connections = await db.query.groupPlatformConnections.findMany({
      where: eq(groupPlatformConnections.groupId, groupId),
    });

    return ok(c, connections);
  });

  /**
   * Add a platform connection to a group
   * POST /api/admin/groups/:groupId/connections
   */
  app.post('/groups/:groupId/connections', zValidator('json', addConnectionSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    // Check if this platform+platformId connection already exists
    const existing = await db.query.groupPlatformConnections.findFirst({
      where: and(
        eq(groupPlatformConnections.platform, data.platform),
        eq(groupPlatformConnections.platformId, data.platformId),
      ),
    });
    if (existing) {
      return conflict(c, `A connection for ${data.platform}/${data.platformId} already exists`);
    }

    const id = crypto.randomUUID();
    await db.insert(groupPlatformConnections).values({
      id,
      groupId,
      platform: data.platform,
      platformId: data.platformId,
      platformUrlname: data.platformUrlname || null,
      platformLink: data.platformLink || `https://${data.platform}.com/${data.platformId}`,
      isActive: data.isActive ?? true,
    });

    const createdConnection = await db.query.groupPlatformConnections.findFirst({
      where: eq(groupPlatformConnections.id, id),
    });

    return created(c, createdConnection);
  });

  /**
   * Delete a platform connection
   * DELETE /api/admin/connections/:connectionId
   */
  app.delete('/connections/:connectionId', async (c) => {
    const db = createDatabase(c.env.DB);
    const connectionId = c.req.param('connectionId');

    const existing = await db.query.groupPlatformConnections.findFirst({
      where: eq(groupPlatformConnections.id, connectionId),
    });
    if (!existing) {
      return notFound(c, 'Connection not found');
    }

    await db.delete(groupPlatformConnections).where(eq(groupPlatformConnections.id, connectionId));

    return success(c, { message: 'Connection deleted' });
  });

  // ============== Group Members ==============

  const addGroupMemberSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['owner', 'manager', 'volunteer', 'member']).optional().default('member'),
  });

  const updateGroupMemberSchema = z.object({
    role: z.enum(['owner', 'manager', 'volunteer', 'member']),
  });

  /**
   * List group members
   * GET /api/admin/groups/:groupId/members
   */
  app.get('/groups/:groupId/members', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
    });

    // Enrich with user info
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, member.userId) });
        return {
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            avatarUrl: user.avatarUrl,
          } : null,
        };
      })
    );

    return ok(c, membersWithUsers);
  });

  /**
   * Add a member to a group
   * POST /api/admin/groups/:groupId/members
   */
  app.post('/groups/:groupId/members', zValidator('json', addGroupMemberSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const { userId, role } = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    // Check if already a member
    const existing = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    });
    if (existing) return conflict(c, 'User is already a member of this group');

    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId,
      userId,
      role,
    });

    return created(c, { success: true, message: 'Member added' });
  });

  /**
   * Update a group member's role
   * PATCH /api/admin/groups/:groupId/members/:memberId
   */
  app.patch('/groups/:groupId/members/:memberId', zValidator('json', updateGroupMemberSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');
    const { role } = c.req.valid('json');

    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!member) return notFound(c, 'Member not found');

    // If demoting the last owner, prevent it
    if (member.role === 'owner' && role !== 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) {
        return badRequest(c, 'Cannot remove the last owner');
      }
    }

    await db.update(groupMembers).set({ role }).where(eq(groupMembers.id, memberId));

    return success(c);
  });

  /**
   * Remove a member from a group
   * DELETE /api/admin/groups/:groupId/members/:memberId
   */
  app.delete('/groups/:groupId/members/:memberId', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');

    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!member) return notFound(c, 'Member not found');

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) {
        return badRequest(c, 'Cannot remove the last owner');
      }
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));

    return success(c, { message: 'Member removed' });
  });

  // ============== Users ==============

  const listUsersSchema = z.object({
    role: z.enum(['user', 'admin', 'superadmin']).optional(),
    search: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  });

  const updateUserRoleSchema = z.object({
    role: z.enum(['user', 'admin', 'superadmin']),
  });

  /**
   * List all users
   * GET /api/admin/users
   */
  app.get('/users', zValidator('query', listUsersSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { role, search, limit: queryLimit, offset: queryOffset } = c.req.valid('query');

    // Build query conditions
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`),
          like(users.username, `%${search}%`),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.users.findMany({
      where,
      orderBy: [desc(users.createdAt)],
      limit: queryLimit,
      offset: queryOffset,
    });

    // Get total count
    const allUsers = await db.query.users.findMany({ where });
    const total = allUsers.length;

    // Get identities for each user
    const usersWithIdentities = await Promise.all(
      results.map(async (user) => {
        const identities = await db.query.userIdentities.findMany({
          where: eq(userIdentities.userId, user.id),
        });
        return {
          ...user,
          identities: identities.map((i) => ({
            provider: i.provider,
            username: i.providerUsername,
          })),
        };
      })
    );

    return list(c, usersWithIdentities, { total, limit: queryLimit, offset: queryOffset });
  });

  /**
   * Get a single user
   * GET /api/admin/users/:id
   */
  app.get('/users/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound(c, 'User not found');
    }

    // Fetch identities, badges, and feature flag overrides in parallel
    const [identities, userBadgeRows, flagOverrides] = await Promise.all([
      db.query.userIdentities.findMany({ where: eq(userIdentities.userId, id) }),
      db.query.userBadges.findMany({ where: eq(userBadges.userId, id) }),
      db.query.userFeatureFlags.findMany({ where: eq(userFeatureFlags.userId, id) }),
    ]);

    // Enrich badges with badge info
    const badgesWithInfo = await Promise.all(
      userBadgeRows.map(async (ub) => {
        const badge = await db.query.badges.findFirst({ where: eq(badges.id, ub.badgeId) });
        return badge ? { ...badge, awardedAt: ub.awardedAt, userBadgeId: ub.id } : null;
      })
    );

    // Enrich flag overrides with flag info
    const flagsWithInfo = await Promise.all(
      flagOverrides.map(async (fo) => {
        const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, fo.flagId) });
        return flag ? { id: fo.id, flagId: fo.flagId, enabled: fo.enabled, flagName: flag.name, flagSlug: flag.slug } : null;
      })
    );

    return ok(c, {
      ...user,
      identities: identities.map((i) => ({
        provider: i.provider,
        username: i.providerUsername,
        email: i.providerEmail,
      })),
      badges: badgesWithInfo.filter(Boolean),
      featureFlagOverrides: flagsWithInfo.filter(Boolean),
    });
  });

  /**
   * Update a user's role
   * PUT /api/admin/users/:id/role
   */
  app.put('/users/:id/role', zValidator('json', updateUserRoleSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const { role } = c.req.valid('json');

    const existing = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existing) {
      return notFound(c, 'User not found');
    }

    await db
      .update(users)
      .set({
        role,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id));

    const updated = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return ok(c, updated);
  });

  /**
   * Delete a user
   * DELETE /api/admin/users/:id
   */
  app.delete('/users/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existing) {
      return notFound(c, 'User not found');
    }

    // Delete sessions first (cascade should handle this, but be explicit)
    await db.delete(sessions).where(eq(sessions.userId, id));

    // Delete identities
    await db.delete(userIdentities).where(eq(userIdentities.userId, id));

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    return success(c, { message: 'User deleted' });
  });

  /**
   * Merge two user accounts
   * POST /api/admin/users/merge
   *
   * Transfers identities from mergeUserId to keepUserId,
   * transfers favorites, deletes sessions, and deletes the merge user.
   */
  app.post('/users/merge', zValidator('json', z.object({
    keepUserId: z.string().min(1),
    mergeUserId: z.string().min(1),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { keepUserId, mergeUserId } = c.req.valid('json');

    if (keepUserId === mergeUserId) {
      return badRequest(c, 'Cannot merge a user with themselves');
    }

    // Verify both users exist
    const keepUser = await db.query.users.findFirst({
      where: eq(users.id, keepUserId),
    });
    const mergeUser = await db.query.users.findFirst({
      where: eq(users.id, mergeUserId),
    });

    if (!keepUser) {
      return notFound(c, 'Keep user not found');
    }
    if (!mergeUser) {
      return notFound(c, 'Merge user not found');
    }

    // Get identities for both users
    const keepIdentities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, keepUserId),
    });
    const mergeIdentities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, mergeUserId),
    });

    const keepProviders = new Set(keepIdentities.map((i) => i.provider));

    // Transfer identities (skip provider conflicts)
    let transferredIdentities = 0;
    let skippedIdentities = 0;
    for (const identity of mergeIdentities) {
      if (keepProviders.has(identity.provider)) {
        skippedIdentities++;
        continue;
      }
      await db.update(userIdentities)
        .set({ userId: keepUserId })
        .where(eq(userIdentities.id, identity.id));
      transferredIdentities++;
    }

    // Transfer favorites (skip duplicates via ignore)
    const mergeFavorites = await db.query.userFavorites.findMany({
      where: eq(userFavorites.userId, mergeUserId),
    });

    let transferredFavorites = 0;
    for (const fav of mergeFavorites) {
      try {
        await db.update(userFavorites)
          .set({ userId: keepUserId })
          .where(eq(userFavorites.id, fav.id));
        transferredFavorites++;
      } catch {
        // Duplicate - delete instead
        await db.delete(userFavorites).where(eq(userFavorites.id, fav.id));
      }
    }

    // Delete merge user's sessions
    await db.delete(sessions).where(eq(sessions.userId, mergeUserId));

    // Delete any remaining identities for merge user (conflicts)
    await db.delete(userIdentities).where(eq(userIdentities.userId, mergeUserId));

    // Delete remaining favorites for merge user
    await db.delete(userFavorites).where(eq(userFavorites.userId, mergeUserId));

    // Delete the merge user
    await db.delete(users).where(eq(users.id, mergeUserId));

    return success(c, {
      message: 'Users merged successfully',
      transferredIdentities,
      skippedIdentities,
      transferredFavorites,
    });
  });

  // ============== OAuth Clients ==============

  /**
   * List all OAuth clients
   * GET /api/admin/oauth/clients
   */
  app.get('/oauth/clients', async (c) => {
    const kv = c.env.OAUTH_KV;

    if (!kv) {
      return internalError(c);
    }

    // List all client keys from KV
    const clientList = await kv.list({ prefix: 'client:' });

    const clients = await Promise.all(
      clientList.keys.map(async (key) => {
        const clientData = await kv.get(key.name, 'json') as {
          clientId: string;
          clientName?: string;
          clientUri?: string;
          logoUri?: string;
          redirectUris?: string[];
          registrationDate?: string;
        } | null;

        if (!clientData) return null;

        return {
          clientId: clientData.clientId,
          clientName: clientData.clientName || 'Unknown',
          clientUri: clientData.clientUri,
          logoUri: clientData.logoUri,
          redirectUris: clientData.redirectUris || [],
          registrationDate: clientData.registrationDate || key.metadata?.created,
        };
      })
    );

    // Filter out nulls
    const validClients = clients.filter((c): c is NonNullable<typeof c> => c !== null);

    return ok(c, validClients);
  });

  /**
   * Get a single OAuth client
   * GET /api/admin/oauth/clients/:id
   */
  app.get('/oauth/clients/:id', async (c) => {
    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('id');

    if (!kv) {
      return internalError(c);
    }

    const clientData = await kv.get(`client:${clientId}`, 'json') as {
      clientId: string;
      clientName?: string;
      clientUri?: string;
      logoUri?: string;
      redirectUris?: string[];
      registrationDate?: string;
      policyUri?: string;
      tosUri?: string;
      scope?: string;
    } | null;

    if (!clientData) {
      return notFound(c, 'Client not found');
    }

    // Get grant count for this client
    const grantList = await kv.list({ prefix: 'grant:' });
    let grantCount = 0;

    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) {
        grantCount++;
      }
    }

    return ok(c, {
      ...clientData,
      grantCount,
    });
  });

  /**
   * Delete an OAuth client and all its grants
   * DELETE /api/admin/oauth/clients/:id
   */
  app.delete('/oauth/clients/:id', async (c) => {
    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('id');

    if (!kv) {
      return internalError(c);
    }

    // Check client exists
    const clientData = await kv.get(`client:${clientId}`, 'json');
    if (!clientData) {
      return notFound(c, 'Client not found');
    }

    // Delete all grants for this client
    const grantList = await kv.list({ prefix: 'grant:' });
    let deletedGrants = 0;

    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) {
        await kv.delete(key.name);
        deletedGrants++;
      }
    }

    // Delete all tokens for this client
    const tokenList = await kv.list({ prefix: 'token:' });
    let deletedTokens = 0;

    for (const key of tokenList.keys) {
      const tokenData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (tokenData?.clientId === clientId) {
        await kv.delete(key.name);
        deletedTokens++;
      }
    }

    // Delete the client
    await kv.delete(`client:${clientId}`);

    return success(c, {
      message: 'Client deleted',
      deletedGrants,
      deletedTokens,
    });
  });

  /**
   * Get OAuth usage statistics
   * GET /api/admin/oauth/stats
   */
  app.get('/oauth/stats', async (c) => {
    const kv = c.env.OAUTH_KV;

    if (!kv) {
      return internalError(c);
    }

    // Count clients
    const clientList = await kv.list({ prefix: 'client:' });
    const clientCount = clientList.keys.length;

    // Count grants
    const grantList = await kv.list({ prefix: 'grant:' });
    const grantCount = grantList.keys.length;

    // Count active tokens
    const tokenList = await kv.list({ prefix: 'token:' });
    const tokenCount = tokenList.keys.length;

    // Count authorization codes (pending)
    const codeList = await kv.list({ prefix: 'code:' });
    const pendingCodeCount = codeList.keys.length;

    return ok(c, {
      clients: clientCount,
      grants: grantCount,
      activeTokens: tokenCount,
      pendingCodes: pendingCodeCount,
    });
  });

  // ============== Badges ==============

  const createBadgeSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
    description: z.string().max(500).optional(),
    icon: z.string().min(1).max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#E5574F'),
    points: z.number().int().min(0).optional().default(0),
    sortOrder: z.number().int().min(0).optional().default(0),
    hideFromDirectory: z.boolean().optional().default(false),
  });

  const updateBadgeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    points: z.number().int().min(0).optional(),
    sortOrder: z.number().int().min(0).optional(),
    hideFromDirectory: z.boolean().optional(),
  });

  /**
   * List all badges
   * GET /api/admin/badges
   */
  app.get('/badges', async (c) => {
    const db = createDatabase(c.env.DB);

    const allBadges = await db.query.badges.findMany({
      orderBy: [badges.sortOrder],
    });

    // Get user count per badge
    const badgesWithCounts = await Promise.all(
      allBadges.map(async (badge) => {
        const badgeUsers = await db.query.userBadges.findMany({
          where: eq(userBadges.badgeId, badge.id),
        });
        return withIconUrl({ ...badge, userCount: badgeUsers.length });
      })
    );

    return ok(c, badgesWithCounts);
  });

  /**
   * Create a badge
   * POST /api/admin/badges
   */
  app.post('/badges', zValidator('json', createBadgeSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    // Check slug uniqueness
    const existing = await db.query.badges.findFirst({
      where: eq(badges.slug, data.slug),
    });
    if (existing) {
      return conflict(c, 'A badge with this slug already exists');
    }

    const id = crypto.randomUUID();
    await db.insert(badges).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      points: data.points,
      sortOrder: data.sortOrder,
      hideFromDirectory: data.hideFromDirectory ? 1 : 0,
    });

    const createdBadge = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    return created(c, createdBadge ? withIconUrl(createdBadge) : createdBadge);
  });

  /**
   * Update a badge
   * PATCH /api/admin/badges/:id
   */
  app.patch('/badges/:id', zValidator('json', updateBadgeSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });
    if (!existing) {
      return notFound(c, 'Badge not found');
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.badges.findFirst({
        where: eq(badges.slug, data.slug),
      });
      if (slugExists) {
        return conflict(c, 'A badge with this slug already exists');
      }
    }

    const updateData = {
      ...data,
      ...(data.hideFromDirectory !== undefined ? { hideFromDirectory: data.hideFromDirectory ? 1 : 0 } : {}),
    };

    await db.update(badges).set(updateData).where(eq(badges.id, id));

    const updated = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    return ok(c, updated ? withIconUrl(updated) : updated);
  });

  /**
   * Delete a badge
   * DELETE /api/admin/badges/:id
   */
  app.delete('/badges/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });
    if (!existing) {
      return notFound(c, 'Badge not found');
    }

    // Delete user_badges first (cascade should handle, but be explicit)
    await db.delete(userBadges).where(eq(userBadges.badgeId, id));
    await db.delete(badges).where(eq(badges.id, id));

    return success(c, { message: 'Badge deleted' });
  });

  /**
   * Award a badge to a user
   * POST /api/admin/users/:userId/badges/:badgeId
   */
  app.post('/users/:userId/badges/:badgeId', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const badgeId = c.req.param('badgeId');

    // Verify user and badge exist
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return notFound(c, 'Badge not found');

    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (existing) {
      return conflict(c, 'Badge already awarded to this user');
    }

    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId,
      badgeId,
    });

    // Emit badge.issued event
    emitEvent(c, {
      type: 'dev.tampa.badge.issued',
      payload: { userId, badgeId: badge.id, badgeSlug: badge.slug, badgeName: badge.name, icon: badge.icon, color: badge.color, points: badge.points },
      metadata: { userId, source: 'admin' },
    });

    // Compute total platform score (exclude group-scoped badges) and emit score_changed event
    const scoreResult = await db
      .select({ totalScore: sql<number>`COALESCE(SUM(${badges.points}), 0)` })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(sql`${userBadges.userId} = ${userId} AND ${badges.groupId} IS NULL`);
    const totalScore = scoreResult[0]?.totalScore ?? 0;

    emitEvent(c, {
      type: 'dev.tampa.user.score_changed',
      payload: { userId, totalScore, previousScore: 0 },
      metadata: { userId, source: 'admin' },
    });

    return created(c, { success: true, message: 'Badge awarded' });
  });

  /**
   * Revoke a badge from a user
   * DELETE /api/admin/users/:userId/badges/:badgeId
   */
  app.delete('/users/:userId/badges/:badgeId', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const badgeId = c.req.param('badgeId');

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (!existing) {
      return notFound(c, 'User does not have this badge');
    }

    await db.delete(userBadges).where(eq(userBadges.id, existing.id));

    return success(c, { message: 'Badge revoked' });
  });

  // ============== Feature Flags ==============

  const createFlagSchema = z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
    description: z.string().max(500).optional(),
    enabledByDefault: z.boolean().optional().default(false),
  });

  const updateFlagSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(500).optional().nullable(),
    enabledByDefault: z.boolean().optional(),
  });

  /**
   * List all feature flags
   * GET /api/admin/flags
   */
  app.get('/flags', async (c) => {
    const db = createDatabase(c.env.DB);

    const allFlags = await db.query.featureFlags.findMany({
      orderBy: [featureFlags.createdAt],
    });

    // Get override counts per flag
    const flagsWithCounts = await Promise.all(
      allFlags.map(async (flag) => {
        const userOverrides = await db.query.userFeatureFlags.findMany({
          where: eq(userFeatureFlags.flagId, flag.id),
        });
        const groupOverrides = await db.query.groupFeatureFlags.findMany({
          where: eq(groupFeatureFlags.flagId, flag.id),
        });
        return {
          ...flag,
          userOverrideCount: userOverrides.length,
          groupOverrideCount: groupOverrides.length,
        };
      })
    );

    return ok(c, flagsWithCounts);
  });

  /**
   * Create a feature flag
   * POST /api/admin/flags
   */
  app.post('/flags', zValidator('json', createFlagSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.slug, data.slug),
    });
    if (existing) {
      return conflict(c, 'A flag with this slug already exists');
    }

    const id = crypto.randomUUID();
    await db.insert(featureFlags).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      enabledByDefault: data.enabledByDefault,
    });

    const createdFlag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });

    return created(c, createdFlag);
  });

  /**
   * Update a feature flag
   * PATCH /api/admin/flags/:id
   */
  app.patch('/flags/:id', zValidator('json', updateFlagSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });
    if (!existing) {
      return notFound(c, 'Flag not found');
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.featureFlags.findFirst({
        where: eq(featureFlags.slug, data.slug),
      });
      if (slugExists) {
        return conflict(c, 'A flag with this slug already exists');
      }
    }

    await db.update(featureFlags).set(data).where(eq(featureFlags.id, id));

    const updated = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });

    return ok(c, updated);
  });

  /**
   * Delete a feature flag
   * DELETE /api/admin/flags/:id
   */
  app.delete('/flags/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });
    if (!existing) {
      return notFound(c, 'Flag not found');
    }

    // Delete overrides first
    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.flagId, id));
    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.flagId, id));
    await db.delete(featureFlags).where(eq(featureFlags.id, id));

    return success(c, { message: 'Flag deleted' });
  });

  /**
   * Get flag details with overrides
   * GET /api/admin/flags/:id
   */
  app.get('/flags/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const flag = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });
    if (!flag) {
      return notFound(c, 'Flag not found');
    }

    // Get user overrides with user info
    const userOverrides = await db.query.userFeatureFlags.findMany({
      where: eq(userFeatureFlags.flagId, id),
    });
    const userOverridesWithInfo = await Promise.all(
      userOverrides.map(async (override) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, override.userId),
        });
        return {
          ...override,
          userName: user?.name || user?.email || 'Unknown',
          userEmail: user?.email,
        };
      })
    );

    // Get group overrides with group info
    const groupOverrides = await db.query.groupFeatureFlags.findMany({
      where: eq(groupFeatureFlags.flagId, id),
    });
    const groupOverridesWithInfo = await Promise.all(
      groupOverrides.map(async (override) => {
        const group = await db.query.groups.findFirst({
          where: eq(groups.id, override.groupId),
        });
        return {
          ...override,
          groupName: group?.name || 'Unknown',
          groupUrlname: group?.urlname,
        };
      })
    );

    return ok(c, {
      ...flag,
      userOverrides: userOverridesWithInfo,
      groupOverrides: groupOverridesWithInfo,
    });
  });

  /**
   * Toggle user feature flag override
   * POST /api/admin/flags/:flagId/users/:userId
   */
  app.post('/flags/:flagId/users/:userId', zValidator('json', z.object({
    enabled: z.boolean(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const userId = c.req.param('userId');
    const { enabled } = c.req.valid('json');

    // Verify flag and user exist
    const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, flagId) });
    if (!flag) return notFound(c, 'Flag not found');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    // Check if override already exists
    const existing = await db.query.userFeatureFlags.findFirst({
      where: and(eq(userFeatureFlags.userId, userId), eq(userFeatureFlags.flagId, flagId)),
    });

    if (existing) {
      await db.update(userFeatureFlags).set({ enabled }).where(eq(userFeatureFlags.id, existing.id));
    } else {
      await db.insert(userFeatureFlags).values({
        id: crypto.randomUUID(),
        userId,
        flagId,
        enabled,
      });
    }

    return success(c);
  });

  /**
   * Remove user feature flag override
   * DELETE /api/admin/flags/:flagId/users/:userId
   */
  app.delete('/flags/:flagId/users/:userId', async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const userId = c.req.param('userId');

    const existing = await db.query.userFeatureFlags.findFirst({
      where: and(eq(userFeatureFlags.userId, userId), eq(userFeatureFlags.flagId, flagId)),
    });
    if (!existing) {
      return notFound(c, 'Override not found');
    }

    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.id, existing.id));
    return success(c);
  });

  /**
   * Toggle group feature flag override
   * POST /api/admin/flags/:flagId/groups/:groupId
   */
  app.post('/flags/:flagId/groups/:groupId', zValidator('json', z.object({
    enabled: z.boolean(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const groupId = c.req.param('groupId');
    const { enabled } = c.req.valid('json');

    const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, flagId) });
    if (!flag) return notFound(c, 'Flag not found');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const existing = await db.query.groupFeatureFlags.findFirst({
      where: and(eq(groupFeatureFlags.groupId, groupId), eq(groupFeatureFlags.flagId, flagId)),
    });

    if (existing) {
      await db.update(groupFeatureFlags).set({ enabled }).where(eq(groupFeatureFlags.id, existing.id));
    } else {
      await db.insert(groupFeatureFlags).values({
        id: crypto.randomUUID(),
        groupId,
        flagId,
        enabled,
      });
    }

    return success(c);
  });

  /**
   * Remove group feature flag override
   * DELETE /api/admin/flags/:flagId/groups/:groupId
   */
  app.delete('/flags/:flagId/groups/:groupId', async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const groupId = c.req.param('groupId');

    const existing = await db.query.groupFeatureFlags.findFirst({
      where: and(eq(groupFeatureFlags.groupId, groupId), eq(groupFeatureFlags.flagId, flagId)),
    });
    if (!existing) {
      return notFound(c, 'Override not found');
    }

    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.id, existing.id));
    return success(c);
  });

  // ============== Achievements ==============

  const createAchievementSchema = z.object({
    key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Must be lowercase alphanumeric with underscores'),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    icon: z.string().max(10).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    targetValue: z.number().int().min(1).default(1),
    points: z.number().int().min(0).optional().default(0),
    badgeSlug: z.string().optional(),
    entitlement: z.string().optional(),
    eventType: z.string().optional(),
    sortOrder: z.number().int().min(0).optional().default(0),
    conditions: z.string().optional(),
    progressMode: z.enum(['counter', 'gauge']).optional().default('counter'),
    gaugeField: z.string().optional(),
    hidden: z.boolean().optional().default(false),
    enabled: z.boolean().optional().default(true),
  });

  const updateAchievementSchema = z.object({
    key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/).optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    icon: z.string().max(10).optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    targetValue: z.number().int().min(1).optional(),
    points: z.number().int().min(0).optional(),
    badgeSlug: z.string().optional().nullable(),
    entitlement: z.string().optional().nullable(),
    eventType: z.string().optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    conditions: z.string().optional().nullable(),
    progressMode: z.enum(['counter', 'gauge']).optional().nullable(),
    gaugeField: z.string().optional().nullable(),
    hidden: z.boolean().optional(),
    enabled: z.boolean().optional(),
  });

  /**
   * List all achievements
   * GET /api/admin/achievements
   */
  app.get('/achievements', async (c) => {
    const db = createDatabase(c.env.DB);

    const allAchievements = await db.query.achievements.findMany({
      orderBy: [achievements.sortOrder],
    });

    // Get progress counts per achievement
    const achievementsWithCounts = await Promise.all(
      allAchievements.map(async (achievement) => {
        const progress = await db.query.achievementProgress.findMany({
          where: eq(achievementProgress.achievementKey, achievement.key),
        });
        const completedCount = progress.filter((p) => p.completedAt).length;
        return { ...achievement, userCount: progress.length, completedCount };
      })
    );

    return ok(c, achievementsWithCounts);
  });

  /**
   * Create an achievement
   * POST /api/admin/achievements
   */
  app.post('/achievements', zValidator('json', createAchievementSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.achievements.findFirst({
      where: eq(achievements.key, data.key),
    });
    if (existing) {
      return conflict(c, 'An achievement with this key already exists');
    }

    const id = crypto.randomUUID();
    await db.insert(achievements).values({
      id,
      key: data.key,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      targetValue: data.targetValue,
      points: data.points,
      badgeSlug: data.badgeSlug,
      entitlement: data.entitlement,
      eventType: data.eventType,
      sortOrder: data.sortOrder,
      conditions: data.conditions || null,
      progressMode: data.progressMode || 'counter',
      gaugeField: data.gaugeField || null,
      hidden: data.hidden ? 1 : 0,
      enabled: data.enabled !== false ? 1 : 0,
    });

    const createdAchievement = await db.query.achievements.findFirst({
      where: eq(achievements.id, id),
    });

    return created(c, createdAchievement);
  });

  /**
   * Update an achievement
   * PATCH /api/admin/achievements/:id
   */
  app.patch('/achievements/:id', zValidator('json', updateAchievementSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.achievements.findFirst({
      where: eq(achievements.id, id),
    });
    if (!existing) {
      return notFound(c, 'Achievement not found');
    }

    // Check key uniqueness if changing
    if (data.key && data.key !== existing.key) {
      const duplicate = await db.query.achievements.findFirst({
        where: eq(achievements.key, data.key),
      });
      if (duplicate) {
        return conflict(c, 'An achievement with this key already exists');
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.key !== undefined) updateData.key = data.key;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.badgeSlug !== undefined) updateData.badgeSlug = data.badgeSlug;
    if (data.entitlement !== undefined) updateData.entitlement = data.entitlement;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.conditions !== undefined) updateData.conditions = data.conditions;
    if (data.progressMode !== undefined) updateData.progressMode = data.progressMode;
    if (data.gaugeField !== undefined) updateData.gaugeField = data.gaugeField;
    if (data.hidden !== undefined) updateData.hidden = data.hidden ? 1 : 0;
    if (data.enabled !== undefined) updateData.enabled = data.enabled ? 1 : 0;

    await db.update(achievements).set(updateData).where(eq(achievements.id, id));

    const updated = await db.query.achievements.findFirst({
      where: eq(achievements.id, id),
    });

    return ok(c, updated);
  });

  /**
   * Delete an achievement
   * DELETE /api/admin/achievements/:id
   */
  app.delete('/achievements/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.achievements.findFirst({
      where: eq(achievements.id, id),
    });
    if (!existing) {
      return notFound(c, 'Achievement not found');
    }

    // Delete progress rows for this achievement
    await db.delete(achievementProgress).where(eq(achievementProgress.achievementKey, existing.key));

    // Delete the achievement
    await db.delete(achievements).where(eq(achievements.id, id));

    return success(c);
  });

  /**
   * Manually set achievement progress for a user
   * POST /api/admin/achievements/:achievementKey/users/:userId/progress
   */
  app.post('/achievements/:achievementKey/users/:userId/progress', zValidator('json', z.object({ currentValue: z.number().int().min(0) })), async (c) => {
    const db = createDatabase(c.env.DB);
    const achievementKey = c.req.param('achievementKey');
    const userId = c.req.param('userId');
    const { currentValue } = c.req.valid('json');

    const achievement = await db.query.achievements.findFirst({
      where: eq(achievements.key, achievementKey),
    });
    if (!achievement) {
      return notFound(c, 'Achievement not found');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      return notFound(c, 'User not found');
    }

    const now = new Date().toISOString();
    const completedAt = currentValue >= achievement.targetValue ? now : null;

    const existing = await db.query.achievementProgress.findFirst({
      where: and(
        eq(achievementProgress.userId, userId),
        eq(achievementProgress.achievementKey, achievementKey),
      ),
    });

    if (existing) {
      await db.update(achievementProgress).set({
        currentValue,
        completedAt,
        updatedAt: now,
      }).where(eq(achievementProgress.id, existing.id));
    } else {
      await db.insert(achievementProgress).values({
        id: crypto.randomUUID(),
        userId,
        achievementKey,
        currentValue,
        targetValue: achievement.targetValue,
        completedAt,
        updatedAt: now,
      });
    }

    return success(c, { currentValue, completedAt });
  });

  /**
   * Reset achievement progress for a user
   * DELETE /api/admin/achievements/:achievementKey/users/:userId/progress
   */
  app.delete('/achievements/:achievementKey/users/:userId/progress', async (c) => {
    const db = createDatabase(c.env.DB);
    const achievementKey = c.req.param('achievementKey');
    const userId = c.req.param('userId');

    await db.delete(achievementProgress).where(
      and(
        eq(achievementProgress.userId, userId),
        eq(achievementProgress.achievementKey, achievementKey),
      ),
    );

    return success(c);
  });

  // ============== Webhooks (Admin) ==============

  /**
   * List all webhooks across all users
   * GET /api/admin/webhooks
   */
  app.get('/webhooks', async (c) => {
    const db = createDatabase(c.env.DB);

    const allWebhooks = await db.query.webhooks.findMany({
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    });

    // Enrich with owner info
    const userIds = [...new Set(allWebhooks.map((w) => w.userId))];
    const ownerUsers = userIds.length > 0
      ? await db.query.users.findMany({
        where: or(...userIds.map((id) => eq(users.id, id))),
      })
      : [];
    const userMap = new Map(ownerUsers.map((u) => [u.id, u]));

    const enriched = allWebhooks.map((w) => {
      const owner = userMap.get(w.userId);
      return {
        ...w,
        eventTypes: JSON.parse(w.eventTypes || '["*"]'),
        ownerName: owner?.name || owner?.email || 'Unknown',
        ownerEmail: owner?.email || '',
        ownerUsername: owner?.username || null,
      };
    });

    return ok(c, enriched);
  });

  /**
   * Update any webhook (admin)
   * PATCH /api/admin/webhooks/:id
   */
  app.patch('/webhooks/:id', zValidator('json', z.object({
    url: z.string().url().optional(),
    eventTypes: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
    });
    if (!existing) {
      return notFound(c, 'Webhook not found');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.url !== undefined) updateData.url = data.url;
    if (data.eventTypes !== undefined) updateData.eventTypes = JSON.stringify(data.eventTypes);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db.update(webhooks).set(updateData).where(eq(webhooks.id, id));

    return success(c);
  });

  /**
   * Delete any webhook (admin)
   * DELETE /api/admin/webhooks/:id
   */
  app.delete('/webhooks/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
    });
    if (!existing) {
      return notFound(c, 'Webhook not found');
    }

    await db.delete(webhooks).where(eq(webhooks.id, id));
    return success(c);
  });

  // ============== Entitlements ==============

  /**
   * List all entitlements
   * GET /api/admin/entitlements
   */
  app.get('/entitlements', async (c) => {
    const db = createDatabase(c.env.DB);

    const allEntitlements = await db.query.userEntitlements.findMany({
      orderBy: [desc(userEntitlements.grantedAt)],
    });

    // Enrich with user info
    const enriched = await Promise.all(
      allEntitlements.map(async (ent) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, ent.userId) });
        return {
          ...ent,
          userName: user?.name || user?.email || 'Unknown',
          userEmail: user?.email || '',
          userUsername: user?.username || null,
        };
      })
    );

    return ok(c, enriched);
  });

  /**
   * Create an entitlement assignment
   * POST /api/admin/entitlements
   */
  app.post('/entitlements', zValidator('json', z.object({
    userId: z.string().min(1),
    entitlement: z.string().min(1).max(100),
    expiresAt: z.string().optional(),
    source: z.string().optional().default('admin'),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    // Verify user exists
    const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!user) return notFound(c, 'User not found');

    // Check for existing entitlement
    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, data.userId), eq(userEntitlements.entitlement, data.entitlement)),
    });
    if (existing) {
      return conflict(c, 'User already has this entitlement');
    }

    const id = crypto.randomUUID();
    await db.insert(userEntitlements).values({
      id,
      userId: data.userId,
      entitlement: data.entitlement,
      expiresAt: data.expiresAt || null,
      source: data.source,
    });

    const createdEntitlement = await db.query.userEntitlements.findFirst({
      where: eq(userEntitlements.id, id),
    });

    return created(c, createdEntitlement);
  });

  /**
   * Delete an entitlement by ID
   * DELETE /api/admin/entitlements/:id
   */
  app.delete('/entitlements/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.userEntitlements.findFirst({
      where: eq(userEntitlements.id, id),
    });
    if (!existing) {
      return notFound(c, 'Entitlement not found');
    }

    await db.delete(userEntitlements).where(eq(userEntitlements.id, id));
    return success(c, { message: 'Entitlement removed' });
  });

  /**
   * Assign entitlement to user (alternative endpoint)
   * POST /api/admin/entitlements/assign
   */
  app.post('/entitlements/assign', zValidator('json', z.object({
    userId: z.string().min(1),
    entitlement: z.string().min(1).max(100),
    expiresAt: z.string().optional(),
    source: z.string().optional().default('admin'),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!user) return notFound(c, 'User not found');

    // Upsert: if already exists, update expiry/source
    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, data.userId), eq(userEntitlements.entitlement, data.entitlement)),
    });

    if (existing) {
      await db.update(userEntitlements).set({
        expiresAt: data.expiresAt || null,
        source: data.source,
      }).where(eq(userEntitlements.id, existing.id));
      return success(c, { message: 'Entitlement updated' });
    }

    const id = crypto.randomUUID();
    await db.insert(userEntitlements).values({
      id,
      userId: data.userId,
      entitlement: data.entitlement,
      expiresAt: data.expiresAt || null,
      source: data.source,
    });

    return created(c, { success: true, message: 'Entitlement assigned' });
  });

  /**
   * Remove entitlement from user by userId and entitlement name
   * DELETE /api/admin/entitlements/:userId/:entitlement
   */
  app.delete('/entitlements/:userId/:entitlement', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const entitlement = c.req.param('entitlement');

    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, userId), eq(userEntitlements.entitlement, entitlement)),
    });
    if (!existing) {
      return notFound(c, 'Entitlement not found for this user');
    }

    await db.delete(userEntitlements).where(eq(userEntitlements.id, existing.id));
    return success(c, { message: 'Entitlement removed from user' });
  });

  // ============== Badge Claim Links (Admin) ==============

  /**
   * List claim links for a badge
   * GET /api/admin/badges/:id/claim-links
   */
  app.get('/badges/:id/claim-links', async (c) => {
    const db = createDatabase(c.env.DB);
    const badgeId = c.req.param('id');

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return notFound(c, 'Badge not found');

    const links = await db.query.badgeClaimLinks.findMany({
      where: eq(badgeClaimLinks.badgeId, badgeId),
    });

    return ok(c, links);
  });

  /**
   * Create a claim link for a badge
   * POST /api/admin/badges/:id/claim-links
   */
  app.post('/badges/:id/claim-links', zValidator('json', z.object({
    maxUses: z.number().int().min(1).optional(),
    expiresAt: z.string().optional(),
    achievementId: z.string().optional(),
    emitEventType: z.string().optional(),
    emitEventPayload: z.string().optional(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const badgeId = c.req.param('id');
    const data = c.req.valid('json');

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return notFound(c, 'Badge not found');

    const createdBy = (c.get('user') as AuthUser).id;

    // Generate random code
    const codeBytes = new Uint8Array(16);
    crypto.getRandomValues(codeBytes);
    const code = Array.from(codeBytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);

    const id = crypto.randomUUID();
    await db.insert(badgeClaimLinks).values({
      id,
      badgeId,
      code,
      maxUses: data.maxUses || null,
      expiresAt: data.expiresAt || null,
      createdBy,
      achievementId: data.achievementId || null,
      emitEventType: data.emitEventType || null,
      emitEventPayload: data.emitEventPayload || null,
    });

    const createdLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.id, id),
    });

    return created(c, createdLink);
  });

  /**
   * Delete/revoke a claim link
   * DELETE /api/admin/claim-links/:id
   */
  app.delete('/claim-links/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.id, id),
    });
    if (!existing) {
      return notFound(c, 'Claim link not found');
    }

    await db.delete(badgeClaimLinks).where(eq(badgeClaimLinks.id, id));
    return success(c, { message: 'Claim link deleted' });
  });

  // ============== Group Claim Requests ==============

  /**
   * List group claim requests
   * GET /api/admin/claim-requests
   */
  app.get('/claim-requests', zValidator('query', z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { status, limit: queryLimit, offset: queryOffset } = c.req.valid('query');

    const conditions = [];
    if (status) {
      conditions.push(eq(groupClaimRequests.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db.query.groupClaimRequests.findMany({
      where,
      orderBy: [desc(groupClaimRequests.createdAt)],
      limit: queryLimit,
      offset: queryOffset,
    });

    // Enrich with user and group info
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const [reqUser, group] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, req.userId) }),
          db.query.groups.findFirst({ where: eq(groups.id, req.groupId) }),
        ]);
        return {
          ...req,
          userName: reqUser?.name || reqUser?.email || 'Unknown',
          userEmail: reqUser?.email || '',
          userUsername: reqUser?.username || null,
          groupName: group?.name || 'Unknown',
          groupUrlname: group?.urlname || null,
          groupPlatform: group?.platform || null,
        };
      }),
    );

    const allRequests = await db.query.groupClaimRequests.findMany({ where });

    return list(c, enriched, { total: allRequests.length, limit: queryLimit, offset: queryOffset });
  });

  /**
   * Approve a group claim request
   * POST /api/admin/claim-requests/:id/approve
   * Adds the requesting user as owner of the group.
   */
  app.post('/claim-requests/:id/approve', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const reviewerId = (c.get('user') as AuthUser).id;

    const request = await db.query.groupClaimRequests.findFirst({
      where: eq(groupClaimRequests.id, id),
    });
    if (!request) return notFound(c, 'Claim request not found');

    if (request.status !== 'pending') {
      return badRequest(c, `Request is already ${request.status}`);
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, request.groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const now = new Date().toISOString();

    // Update request status
    await db.update(groupClaimRequests).set({
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: now,
    }).where(eq(groupClaimRequests.id, id));

    // Add user as owner (if not already a member, or upgrade role)
    const existingMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, request.groupId),
        eq(groupMembers.userId, request.userId),
      ),
    });

    if (!existingMember) {
      await db.insert(groupMembers).values({
        id: crypto.randomUUID(),
        groupId: request.groupId,
        userId: request.userId,
        role: GroupMemberRole.OWNER,
      });
    } else if (existingMember.role !== GroupMemberRole.OWNER) {
      await db.update(groupMembers).set({
        role: GroupMemberRole.OWNER,
      }).where(eq(groupMembers.id, existingMember.id));
    }

    emitEvent(c, {
      type: 'dev.tampa.group.claimed',
      payload: {
        groupId: request.groupId,
        userId: request.userId,
        method: 'request',
        autoApproved: false,
        reviewedBy: reviewerId,
      },
      metadata: { userId: request.userId, source: 'admin' },
    });

    return success(c, { message: 'Claim request approved' });
  });

  /**
   * Reject a group claim request
   * POST /api/admin/claim-requests/:id/reject
   */
  app.post('/claim-requests/:id/reject', zValidator('json', z.object({
    notes: z.string().max(1000).optional(),
  }).optional()), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const reviewerId = (c.get('user') as AuthUser).id;

    const request = await db.query.groupClaimRequests.findFirst({
      where: eq(groupClaimRequests.id, id),
    });
    if (!request) return notFound(c, 'Claim request not found');

    if (request.status !== 'pending') {
      return badRequest(c, `Request is already ${request.status}`);
    }

    let notes: string | null = null;
    try {
      const body = await c.req.json();
      if (body?.notes) notes = body.notes;
    } catch {
      // No body
    }

    await db.update(groupClaimRequests).set({
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      notes: notes || request.notes,
    }).where(eq(groupClaimRequests.id, id));

    return success(c, { message: 'Claim request rejected' });
  });

  // ============== Group Claim Invites ==============

  /**
   * List claim invites for a group
   * GET /api/admin/groups/:groupId/claim-invites
   */
  app.get('/groups/:groupId/claim-invites', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const invites = await db.query.groupClaimInvites.findMany({
      where: eq(groupClaimInvites.groupId, groupId),
    });

    return ok(c, invites);
  });

  /**
   * Generate a claim invite for a group
   * POST /api/admin/groups/:groupId/claim-invites
   */
  app.post('/groups/:groupId/claim-invites', zValidator('json', z.object({
    autoApprove: z.boolean().optional().default(false),
    expiresAt: z.string().optional(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const createdBy = (c.get('user') as AuthUser).id;

    // Generate random token
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);

    const id = crypto.randomUUID();
    await db.insert(groupClaimInvites).values({
      id,
      groupId,
      token,
      autoApprove: data.autoApprove,
      expiresAt: data.expiresAt || null,
      createdBy,
    });

    const createdInvite = await db.query.groupClaimInvites.findFirst({
      where: eq(groupClaimInvites.id, id),
    });

    return created(c, createdInvite);
  });

  // ============== Group Creation Requests ==============

  /**
   * List group creation requests
   * GET /api/admin/group-creation-requests
   */
  app.get('/group-creation-requests', zValidator('query', z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { status, limit: queryLimit, offset: queryOffset } = c.req.valid('query');

    const conditions = [];
    if (status) {
      conditions.push(eq(groupCreationRequests.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db.query.groupCreationRequests.findMany({
      where,
      orderBy: [desc(groupCreationRequests.createdAt)],
      limit: queryLimit,
      offset: queryOffset,
    });

    // Enrich with user info
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const reqUser = await db.query.users.findFirst({ where: eq(users.id, req.userId) });
        return {
          ...req,
          userName: reqUser?.name || reqUser?.email || 'Unknown',
          userEmail: reqUser?.email || '',
          userUsername: reqUser?.username || null,
        };
      }),
    );

    const allRequests = await db.query.groupCreationRequests.findMany({ where });

    return list(c, enriched, { total: allRequests.length, limit: queryLimit, offset: queryOffset });
  });

  /**
   * Approve a group creation request
   * POST /api/admin/group-creation-requests/:id/approve
   * Creates the group and sets the requester as owner.
   */
  app.post('/group-creation-requests/:id/approve', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const reviewerId = (c.get('user') as AuthUser).id;

    const request = await db.query.groupCreationRequests.findFirst({
      where: eq(groupCreationRequests.id, id),
    });
    if (!request) return notFound(c, 'Creation request not found');

    if (request.status !== 'pending') {
      return badRequest(c, `Request is already ${request.status}`);
    }

    const now = new Date().toISOString();

    // Generate urlname from group name
    const urlname = request.groupName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100);

    // Check uniqueness
    const existingGroup = await db.query.groups.findFirst({
      where: eq(groups.urlname, urlname),
    });
    // If urlname is taken, append a random suffix
    const finalUrlname = existingGroup ? `${urlname}-${Date.now().toString(36)}` : urlname;

    // Create the group
    const groupId = crypto.randomUUID();
    await db.insert(groups).values({
      id: groupId,
      platform: EventPlatform.TAMPA_DEV,
      platformId: groupId,
      urlname: finalUrlname,
      name: request.groupName,
      description: request.description,
      link: `https://events.tampa.dev/groups/${finalUrlname}`,
      displayOnSite: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Set requester as owner
    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId,
      userId: request.userId,
      role: GroupMemberRole.OWNER,
    });

    // Update request status and link to created group
    await db.update(groupCreationRequests).set({
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: now,
      groupId,
    }).where(eq(groupCreationRequests.id, id));

    emitEvent(c, {
      type: 'dev.tampa.group.created',
      payload: {
        groupId,
        groupName: request.groupName,
        createdBy: request.userId,
        approvedBy: reviewerId,
        source: 'creation-request',
      },
      metadata: { userId: request.userId, source: 'admin' },
    });

    return success(c, {
      message: 'Creation request approved',
      groupId,
      urlname: finalUrlname,
    });
  });

  /**
   * Reject a group creation request
   * POST /api/admin/group-creation-requests/:id/reject
   */
  app.post('/group-creation-requests/:id/reject', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const reviewerId = (c.get('user') as AuthUser).id;

    const request = await db.query.groupCreationRequests.findFirst({
      where: eq(groupCreationRequests.id, id),
    });
    if (!request) return notFound(c, 'Creation request not found');

    if (request.status !== 'pending') {
      return badRequest(c, `Request is already ${request.status}`);
    }

    let notes: string | null = null;
    try {
      const body = await c.req.json();
      if (body?.notes) notes = body.notes;
    } catch {
      // No body
    }

    await db.update(groupCreationRequests).set({
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
    }).where(eq(groupCreationRequests.id, id));

    return success(c, { message: 'Creation request rejected' });
  });

  return app;
}

export const adminApiRoutes = createAdminApiRoutes();
