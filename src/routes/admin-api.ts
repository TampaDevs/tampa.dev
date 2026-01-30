/**
 * Admin API Routes
 *
 * Endpoints for managing groups, triggering syncs, and viewing logs.
 * These will eventually be protected by authentication.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, like, or } from 'drizzle-orm';
import { createDatabase } from '../db';
import { groups, events, syncLogs, users, userIdentities, sessions, userFavorites, badges, userBadges, featureFlags, userFeatureFlags, groupFeatureFlags, groupMembers, EventPlatform, UserRole } from '../db/schema';
import { SyncService } from '../services/sync';
import { providerRegistry } from '../providers';
import type { Env } from '../../types/worker';

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
  platform: z.enum(['meetup', 'eventbrite', 'luma']),
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
});

const listGroupsSchema = z.object({
  platform: z.enum(['meetup', 'eventbrite', 'luma']).optional(),
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

    return c.json({
      groups: results.map(parseGroupJsonFields),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
    });
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
      return c.json({ error: 'Group not found' }, 404);
    }

    // Get event count for this group
    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, id),
    });

    return c.json({
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
      return c.json({ error: 'A group with this urlname already exists' }, 409);
    }

    // Check if platformId already exists for this platform
    const existingPlatformId = await db.query.groups.findFirst({
      where: and(
        eq(groups.platform, data.platform),
        eq(groups.platformId, data.platformId)
      ),
    });

    if (existingPlatformId) {
      return c.json({
        error: `A group with this platform ID already exists: ${existingPlatformId.urlname}`
      }, 409);
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

    const created = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    return c.json(created ? parseGroupJsonFields(created) : null, 201);
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
      return c.json({ error: 'Group not found' }, 404);
    }

    // Check urlname uniqueness if changing
    if (data.urlname && data.urlname !== existing.urlname) {
      const urlnameExists = await db.query.groups.findFirst({
        where: eq(groups.urlname, data.urlname),
      });
      if (urlnameExists) {
        return c.json({ error: 'A group with this urlname already exists' }, 409);
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

    const updated = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    return c.json(updated ? parseGroupJsonFields(updated) : null);
  });

  /**
   * Delete a group (soft delete by setting isActive = false)
   * DELETE /api/admin/groups/:id
   */
  app.delete('/groups/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!existing) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Soft delete - just mark as inactive
    await db
      .update(groups)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(groups.id, id));

    return c.json({ success: true, message: 'Group deactivated' });
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
    const platforms = ['meetup', 'eventbrite', 'luma'];
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

    return c.json({
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

      // Initialize providers (non-fatal — individual group syncs handle missing providers)
      try {
        await providerRegistry.initializeAll(c.env);
      } catch (initError) {
        console.error('Provider initialization error (continuing):', initError);
      }

      const syncService = new SyncService(db, providerRegistry, c.env);
      const result = await syncService.syncAllGroups();

      return c.json(result);
    } catch (error) {
      console.error('Sync all failed:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }, 500);
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
        return c.json({ error: 'Group not found' }, 404);
      }

      // Initialize providers (non-fatal — sync handles missing providers)
      try {
        await providerRegistry.initializeAll(c.env);
      } catch (initError) {
        console.error('Provider initialization error (continuing):', initError);
      }

      const syncService = new SyncService(db, providerRegistry, c.env);
      const result = await syncService.syncGroup(id);

      return c.json(result);
    } catch (error) {
      console.error('Sync group failed:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }, 500);
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

    return c.json({ logs });
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
      return c.json({ error: 'Group not found' }, 404);
    }

    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, id),
      orderBy: [desc(events.startTime)],
      limit: 50,
    });

    return c.json({
      group: parseGroupJsonFields(group),
      events: groupEvents,
    });
  });

  // ============== Group Members ==============

  const addGroupMemberSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['owner', 'admin', 'member']).optional().default('member'),
  });

  const updateGroupMemberSchema = z.object({
    role: z.enum(['owner', 'admin', 'member']),
  });

  /**
   * List group members
   * GET /api/admin/groups/:groupId/members
   */
  app.get('/groups/:groupId/members', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return c.json({ error: 'Group not found' }, 404);

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

    return c.json({ members: membersWithUsers });
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
    if (!group) return c.json({ error: 'Group not found' }, 404);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: 'User not found' }, 404);

    // Check if already a member
    const existing = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    });
    if (existing) return c.json({ error: 'User is already a member of this group' }, 409);

    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId,
      userId,
      role,
    });

    return c.json({ success: true, message: 'Member added' }, 201);
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
    if (!member) return c.json({ error: 'Member not found' }, 404);

    // If demoting the last owner, prevent it
    if (member.role === 'owner' && role !== 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) {
        return c.json({ error: 'Cannot remove the last owner' }, 400);
      }
    }

    await db.update(groupMembers).set({ role }).where(eq(groupMembers.id, memberId));

    return c.json({ success: true });
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
    if (!member) return c.json({ error: 'Member not found' }, 404);

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) {
        return c.json({ error: 'Cannot remove the last owner' }, 400);
      }
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));

    return c.json({ success: true, message: 'Member removed' });
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
    const { role, search, limit, offset } = c.req.valid('query');

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
      limit,
      offset,
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

    return c.json({
      users: usersWithIdentities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      },
    });
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
      return c.json({ error: 'User not found' }, 404);
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

    return c.json({
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
      return c.json({ error: 'User not found' }, 404);
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

    return c.json(updated);
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
      return c.json({ error: 'User not found' }, 404);
    }

    // Delete sessions first (cascade should handle this, but be explicit)
    await db.delete(sessions).where(eq(sessions.userId, id));

    // Delete identities
    await db.delete(userIdentities).where(eq(userIdentities.userId, id));

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    return c.json({ success: true, message: 'User deleted' });
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
      return c.json({ error: 'Cannot merge a user with themselves' }, 400);
    }

    // Verify both users exist
    const keepUser = await db.query.users.findFirst({
      where: eq(users.id, keepUserId),
    });
    const mergeUser = await db.query.users.findFirst({
      where: eq(users.id, mergeUserId),
    });

    if (!keepUser) {
      return c.json({ error: 'Keep user not found' }, 404);
    }
    if (!mergeUser) {
      return c.json({ error: 'Merge user not found' }, 404);
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
        // Duplicate — delete instead
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

    return c.json({
      success: true,
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
      return c.json({ error: 'OAuth KV not configured' }, 500);
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

    return c.json({
      clients: validClients,
      total: validClients.length,
    });
  });

  /**
   * Get a single OAuth client
   * GET /api/admin/oauth/clients/:id
   */
  app.get('/oauth/clients/:id', async (c) => {
    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('id');

    if (!kv) {
      return c.json({ error: 'OAuth KV not configured' }, 500);
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
      return c.json({ error: 'Client not found' }, 404);
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

    return c.json({
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
      return c.json({ error: 'OAuth KV not configured' }, 500);
    }

    // Check client exists
    const clientData = await kv.get(`client:${clientId}`, 'json');
    if (!clientData) {
      return c.json({ error: 'Client not found' }, 404);
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

    return c.json({
      success: true,
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
      return c.json({ error: 'OAuth KV not configured' }, 500);
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

    return c.json({
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
    sortOrder: z.number().int().min(0).optional().default(0),
  });

  const updateBadgeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().min(1).max(50).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    sortOrder: z.number().int().min(0).optional(),
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
        return { ...badge, userCount: badgeUsers.length };
      })
    );

    return c.json({ badges: badgesWithCounts });
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
      return c.json({ error: 'A badge with this slug already exists' }, 409);
    }

    const id = crypto.randomUUID();
    await db.insert(badges).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      sortOrder: data.sortOrder,
    });

    const created = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    return c.json(created, 201);
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
      return c.json({ error: 'Badge not found' }, 404);
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.badges.findFirst({
        where: eq(badges.slug, data.slug),
      });
      if (slugExists) {
        return c.json({ error: 'A badge with this slug already exists' }, 409);
      }
    }

    await db.update(badges).set(data).where(eq(badges.id, id));

    const updated = await db.query.badges.findFirst({
      where: eq(badges.id, id),
    });

    return c.json(updated);
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
      return c.json({ error: 'Badge not found' }, 404);
    }

    // Delete user_badges first (cascade should handle, but be explicit)
    await db.delete(userBadges).where(eq(userBadges.badgeId, id));
    await db.delete(badges).where(eq(badges.id, id));

    return c.json({ success: true, message: 'Badge deleted' });
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
    if (!user) return c.json({ error: 'User not found' }, 404);

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return c.json({ error: 'Badge not found' }, 404);

    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (existing) {
      return c.json({ error: 'Badge already awarded to this user' }, 409);
    }

    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId,
      badgeId,
    });

    return c.json({ success: true, message: 'Badge awarded' }, 201);
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
      return c.json({ error: 'User does not have this badge' }, 404);
    }

    await db.delete(userBadges).where(eq(userBadges.id, existing.id));

    return c.json({ success: true, message: 'Badge revoked' });
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

    return c.json({ flags: flagsWithCounts });
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
      return c.json({ error: 'A flag with this slug already exists' }, 409);
    }

    const id = crypto.randomUUID();
    await db.insert(featureFlags).values({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      enabledByDefault: data.enabledByDefault,
    });

    const created = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });

    return c.json(created, 201);
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
      return c.json({ error: 'Flag not found' }, 404);
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.featureFlags.findFirst({
        where: eq(featureFlags.slug, data.slug),
      });
      if (slugExists) {
        return c.json({ error: 'A flag with this slug already exists' }, 409);
      }
    }

    await db.update(featureFlags).set(data).where(eq(featureFlags.id, id));

    const updated = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.id, id),
    });

    return c.json(updated);
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
      return c.json({ error: 'Flag not found' }, 404);
    }

    // Delete overrides first
    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.flagId, id));
    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.flagId, id));
    await db.delete(featureFlags).where(eq(featureFlags.id, id));

    return c.json({ success: true, message: 'Flag deleted' });
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
      return c.json({ error: 'Flag not found' }, 404);
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

    return c.json({
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
    if (!flag) return c.json({ error: 'Flag not found' }, 404);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: 'User not found' }, 404);

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

    return c.json({ success: true });
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
      return c.json({ error: 'Override not found' }, 404);
    }

    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.id, existing.id));
    return c.json({ success: true });
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
    if (!flag) return c.json({ error: 'Flag not found' }, 404);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return c.json({ error: 'Group not found' }, 404);

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

    return c.json({ success: true });
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
      return c.json({ error: 'Override not found' }, 404);
    }

    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.id, existing.id));
    return c.json({ success: true });
  });

  return app;
}

export const adminApiRoutes = createAdminApiRoutes();
