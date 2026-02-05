/**
 * /v1/admin -- Platform Admin API
 *
 * Mirrors all admin-api.ts endpoints under /v1/admin/ with:
 * - Tri-auth support (PAT, OAuth, session) via getCurrentUser()
 * - OAuth/PAT tokens require the 'admin' scope
 * - Session users require admin/superadmin role
 * - Standardized response envelopes from src/lib/responses.ts
 *
 * The existing /admin routes (admin-api.ts) remain for the web admin UI.
 * These /v1/admin routes enable agent/automation access via OAuth tokens.
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  groups,
  events,
  syncLogs,
  users,
  userIdentities,
  sessions,
  userFavorites,
  badges,
  userBadges,
  featureFlags,
  userFeatureFlags,
  groupFeatureFlags,
  groupMembers,
  achievements,
  achievementProgress,
  webhooks,
  userEntitlements,
  badgeClaimLinks,
  groupPlatformConnections,
  groupClaimRequests,
  groupClaimInvites,
  groupCreationRequests,
  EventPlatform,
  GroupMemberRole,
} from '../db/schema.js';
import { SyncService } from '../services/sync.js';
import { providerRegistry } from '../providers/index.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireScope, type AuthResult } from '../lib/auth.js';
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
  badRequest,
  internalError,
} from '../lib/responses.js';
import { withIconUrl } from '../../lib/emoji.js';

// ============== Hono App Type ==============

type AdminEnv = {
  Bindings: Env;
  Variables: { adminAuth: AuthResult };
};

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
  displayOnSite: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional().nullable(),
  socialLinks: socialLinksSchema.nullable(),
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

const syncLogsSchema = z.object({
  groupId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

const addConnectionSchema = z.object({
  platform: z.enum(['meetup', 'eventbrite', 'luma']),
  platformId: z.string().min(1).max(200),
  platformUrlname: z.string().optional(),
  platformLink: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
});

const addGroupMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['owner', 'manager', 'volunteer', 'member']).optional().default('member'),
});

const updateGroupMemberSchema = z.object({
  role: z.enum(['owner', 'manager', 'volunteer', 'member']),
});

const listUsersSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']),
});

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
});

// ============== Helpers ==============

function parseGroupJsonFields(group: typeof groups.$inferSelect) {
  return {
    ...group,
    tags: group.tags ? JSON.parse(group.tags) : null,
    socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
  };
}

// ============== Router ==============

export function createV1AdminRoutes() {
  const app = new OpenAPIHono<AdminEnv>();

  // Admin auth middleware: tri-auth + admin scope + role check
  app.use('*', async (c, next) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'admin', c);
    if (scopeErr) return scopeErr;

    // Session users must also be admin/superadmin
    if (auth.scopes === null && auth.user.role !== 'admin' && auth.user.role !== 'superadmin') {
      return forbidden(c, 'Admin access required');
    }

    c.set('adminAuth', auth);
    await next();
  });

  // Global error handler
  app.onError((err, c) => {
    console.error('Admin API error:', err instanceof Error ? err.message : 'unknown error');
    return internalError(c);
  });

  // ============== Groups ==============

  app.get('/groups', zValidator('query', listGroupsSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { platform, active, displayOnSite, featured, search, limit, offset } = c.req.valid('query');

    const conditions = [];
    if (platform) conditions.push(eq(groups.platform, platform));
    if (active !== undefined) conditions.push(eq(groups.isActive, active === 'true'));
    if (displayOnSite !== undefined) conditions.push(eq(groups.displayOnSite, displayOnSite === 'true'));
    if (featured !== undefined) conditions.push(eq(groups.isFeatured, featured === 'true'));
    if (search) conditions.push(like(groups.name, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.groups.findMany({
      where,
      orderBy: [desc(groups.updatedAt)],
      limit,
      offset,
    });

    const allGroups = await db.query.groups.findMany({ where });
    const total = allGroups.length;

    return list(c, results.map(parseGroupJsonFields), { total, limit, offset });
  });

  app.get('/groups/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound(c, 'Group not found');

    const groupEvents = await db.query.events.findMany({ where: eq(events.groupId, id) });

    return ok(c, { ...parseGroupJsonFields(group), eventCount: groupEvents.length });
  });

  app.post('/groups', zValidator('json', createGroupSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.groups.findFirst({ where: eq(groups.urlname, data.urlname) });
    if (existing) return conflict(c, 'A group with this urlname already exists');

    const existingPlatformId = await db.query.groups.findFirst({
      where: and(eq(groups.platform, data.platform), eq(groups.platformId, data.platformId)),
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

    const createdGroup = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    return created(c, createdGroup ? parseGroupJsonFields(createdGroup) : null);
  });

  app.put('/groups/:id', zValidator('json', updateGroupSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!existing) return notFound(c, 'Group not found');

    if (data.urlname && data.urlname !== existing.urlname) {
      const urlnameExists = await db.query.groups.findFirst({ where: eq(groups.urlname, data.urlname) });
      if (urlnameExists) return conflict(c, 'A group with this urlname already exists');
    }

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null;
    if (data.socialLinks !== undefined) updateData.socialLinks = data.socialLinks ? JSON.stringify(data.socialLinks) : null;

    await db.update(groups).set(updateData).where(eq(groups.id, id));

    const updated = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    return ok(c, updated ? parseGroupJsonFields(updated) : null);
  });

  app.delete('/groups/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!existing) return notFound(c, 'Group not found');

    await db.update(groups).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(groups.id, id));

    return success(c, { message: 'Group deactivated' });
  });

  app.get('/groups/:id/events', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    if (!group) return notFound(c, 'Group not found');

    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, id),
      orderBy: [desc(events.startTime)],
      limit: 50,
    });

    return ok(c, { group: parseGroupJsonFields(group), events: groupEvents });
  });

  // ============== Group Platform Connections ==============

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

  app.post('/groups/:groupId/connections', zValidator('json', addConnectionSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const existing = await db.query.groupPlatformConnections.findFirst({
      where: and(
        eq(groupPlatformConnections.platform, data.platform),
        eq(groupPlatformConnections.platformId, data.platformId),
      ),
    });
    if (existing) return conflict(c, `A connection for ${data.platform}/${data.platformId} already exists`);

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

    const conn = await db.query.groupPlatformConnections.findFirst({ where: eq(groupPlatformConnections.id, id) });
    return created(c, conn);
  });

  app.delete('/connections/:connectionId', async (c) => {
    const db = createDatabase(c.env.DB);
    const connectionId = c.req.param('connectionId');

    const existing = await db.query.groupPlatformConnections.findFirst({
      where: eq(groupPlatformConnections.id, connectionId),
    });
    if (!existing) return notFound(c, 'Connection not found');

    await db.delete(groupPlatformConnections).where(eq(groupPlatformConnections.id, connectionId));
    return success(c);
  });

  // ============== Group Members ==============

  app.get('/groups/:groupId/members', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const members = await db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, groupId) });

    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, member.userId) });
        return {
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
          user: user ? { id: user.id, name: user.name, email: user.email, username: user.username, avatarUrl: user.avatarUrl } : null,
        };
      }),
    );

    return ok(c, membersWithUsers);
  });

  app.post('/groups/:groupId/members', zValidator('json', addGroupMemberSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const { userId, role } = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    const existing = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    });
    if (existing) return conflict(c, 'User is already a member of this group');

    await db.insert(groupMembers).values({ id: crypto.randomUUID(), groupId, userId, role });
    return created(c, { success: true, message: 'Member added' });
  });

  app.patch('/groups/:groupId/members/:memberId', zValidator('json', updateGroupMemberSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');
    const { role } = c.req.valid('json');

    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!member) return notFound(c, 'Member not found');

    if (member.role === 'owner' && role !== 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) return badRequest(c, 'Cannot remove the last owner');
    }

    await db.update(groupMembers).set({ role }).where(eq(groupMembers.id, memberId));
    return success(c);
  });

  app.delete('/groups/:groupId/members/:memberId', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const memberId = c.req.param('memberId');

    const member = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!member) return notFound(c, 'Member not found');

    if (member.role === 'owner') {
      const owners = await db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, 'owner')),
      });
      if (owners.length <= 1) return badRequest(c, 'Cannot remove the last owner');
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));
    return success(c);
  });

  // ============== Sync ==============

  app.get('/sync/status', async (c) => {
    const db = createDatabase(c.env.DB);

    const allGroups = await db.query.groups.findMany();
    const activeGroups = allGroups.filter((g) => g.isActive);

    const recentLogs = await db.query.syncLogs.findMany({
      orderBy: [desc(syncLogs.startedAt)],
      limit: 10,
    });

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

    const configuredProviders = providerRegistry.getConfiguredAdapters(c.env);

    return ok(c, {
      groups: {
        total: allGroups.length,
        active: activeGroups.length,
        byPlatform: {
          meetup: allGroups.filter((g) => g.platform === 'meetup').length,
          eventbrite: allGroups.filter((g) => g.platform === 'eventbrite').length,
          luma: allGroups.filter((g) => g.platform === 'luma').length,
        },
      },
      providers: {
        configured: configuredProviders.map((p) => p.platform),
        status: platformStatus,
      },
      recentSyncs: recentLogs,
    });
  });

  app.post('/sync/all', async (c) => {
    try {
      const db = createDatabase(c.env.DB);

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

  app.post('/sync/group/:id', async (c) => {
    try {
      const db = createDatabase(c.env.DB);
      const id = c.req.param('id');

      const group = await db.query.groups.findFirst({ where: eq(groups.id, id) });
      if (!group) return notFound(c, 'Group not found');

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

  app.get('/sync/logs', zValidator('query', syncLogsSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { groupId, limit } = c.req.valid('query');

    const syncService = new SyncService(db, providerRegistry, c.env);
    const logs = await syncService.getSyncLogs({ groupId, limit });

    return ok(c, logs);
  });

  // ============== Users ==============

  app.get('/users', zValidator('query', listUsersSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const { role, search, limit, offset } = c.req.valid('query');

    const conditions = [];
    if (role) conditions.push(eq(users.role, role));
    if (search) {
      conditions.push(
        or(like(users.email, `%${search}%`), like(users.name, `%${search}%`), like(users.username, `%${search}%`))!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.users.findMany({ where, orderBy: [desc(users.createdAt)], limit, offset });
    const allUsers = await db.query.users.findMany({ where });
    const total = allUsers.length;

    const usersWithIdentities = await Promise.all(
      results.map(async (user) => {
        const identities = await db.query.userIdentities.findMany({ where: eq(userIdentities.userId, user.id) });
        return {
          ...user,
          identities: identities.map((i) => ({ provider: i.provider, username: i.providerUsername })),
        };
      }),
    );

    return list(c, usersWithIdentities, { total, limit, offset });
  });

  app.get('/users/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) return notFound(c, 'User not found');

    const [identities, userBadgeRows, flagOverrides] = await Promise.all([
      db.query.userIdentities.findMany({ where: eq(userIdentities.userId, id) }),
      db.query.userBadges.findMany({ where: eq(userBadges.userId, id) }),
      db.query.userFeatureFlags.findMany({ where: eq(userFeatureFlags.userId, id) }),
    ]);

    const badgesWithInfo = await Promise.all(
      userBadgeRows.map(async (ub) => {
        const badge = await db.query.badges.findFirst({ where: eq(badges.id, ub.badgeId) });
        return badge ? withIconUrl({ ...badge, awardedAt: ub.awardedAt, userBadgeId: ub.id }) : null;
      }),
    );

    const flagsWithInfo = await Promise.all(
      flagOverrides.map(async (fo) => {
        const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, fo.flagId) });
        return flag ? { id: fo.id, flagId: fo.flagId, enabled: fo.enabled, flagName: flag.name, flagSlug: flag.slug } : null;
      }),
    );

    return ok(c, {
      ...user,
      identities: identities.map((i) => ({ provider: i.provider, username: i.providerUsername, email: i.providerEmail })),
      badges: badgesWithInfo.filter(Boolean),
      featureFlagOverrides: flagsWithInfo.filter(Boolean),
    });
  });

  app.put('/users/:id/role', zValidator('json', updateUserRoleSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const { role } = c.req.valid('json');

    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) return notFound(c, 'User not found');

    await db.update(users).set({ role, updatedAt: new Date().toISOString() }).where(eq(users.id, id));

    const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
    return ok(c, updated);
  });

  app.delete('/users/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!existing) return notFound(c, 'User not found');

    await db.delete(sessions).where(eq(sessions.userId, id));
    await db.delete(userIdentities).where(eq(userIdentities.userId, id));
    await db.delete(users).where(eq(users.id, id));

    return success(c, { message: 'User deleted' });
  });

  app.post('/users/merge', zValidator('json', z.object({
    keepUserId: z.string().min(1),
    mergeUserId: z.string().min(1),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { keepUserId, mergeUserId } = c.req.valid('json');

    if (keepUserId === mergeUserId) return badRequest(c, 'Cannot merge a user with themselves');

    const keepUser = await db.query.users.findFirst({ where: eq(users.id, keepUserId) });
    const mergeUser = await db.query.users.findFirst({ where: eq(users.id, mergeUserId) });
    if (!keepUser) return notFound(c, 'Keep user not found');
    if (!mergeUser) return notFound(c, 'Merge user not found');

    const keepIdentities = await db.query.userIdentities.findMany({ where: eq(userIdentities.userId, keepUserId) });
    const mergeIdentities = await db.query.userIdentities.findMany({ where: eq(userIdentities.userId, mergeUserId) });
    const keepProviders = new Set(keepIdentities.map((i) => i.provider));

    let transferredIdentities = 0;
    let skippedIdentities = 0;
    for (const identity of mergeIdentities) {
      if (keepProviders.has(identity.provider)) {
        skippedIdentities++;
        continue;
      }
      await db.update(userIdentities).set({ userId: keepUserId }).where(eq(userIdentities.id, identity.id));
      transferredIdentities++;
    }

    const mergeFavorites = await db.query.userFavorites.findMany({ where: eq(userFavorites.userId, mergeUserId) });
    let transferredFavorites = 0;
    for (const fav of mergeFavorites) {
      try {
        await db.update(userFavorites).set({ userId: keepUserId }).where(eq(userFavorites.id, fav.id));
        transferredFavorites++;
      } catch {
        await db.delete(userFavorites).where(eq(userFavorites.id, fav.id));
      }
    }

    await db.delete(sessions).where(eq(sessions.userId, mergeUserId));
    await db.delete(userIdentities).where(eq(userIdentities.userId, mergeUserId));
    await db.delete(userFavorites).where(eq(userFavorites.userId, mergeUserId));
    await db.delete(users).where(eq(users.id, mergeUserId));

    return success(c, { message: 'Users merged successfully', transferredIdentities, skippedIdentities, transferredFavorites });
  });

  // ============== OAuth Clients ==============

  app.get('/oauth/clients', async (c) => {
    const kv = c.env.OAUTH_KV;
    if (!kv) return internalError(c);

    const clientList = await kv.list({ prefix: 'client:' });

    const clients = await Promise.all(
      clientList.keys.map(async (key) => {
        const clientData = await kv.get(key.name, 'json') as {
          clientId: string; clientName?: string; clientUri?: string; logoUri?: string; redirectUris?: string[]; registrationDate?: string;
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
      }),
    );

    const validClients = clients.filter((c): c is NonNullable<typeof c> => c !== null);
    return ok(c, { clients: validClients, total: validClients.length });
  });

  app.get('/oauth/clients/:id', async (c) => {
    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('id');
    if (!kv) return internalError(c);

    const clientData = await kv.get(`client:${clientId}`, 'json') as {
      clientId: string; clientName?: string; clientUri?: string; logoUri?: string;
      redirectUris?: string[]; registrationDate?: string; policyUri?: string; tosUri?: string; scope?: string;
    } | null;
    if (!clientData) return notFound(c, 'Client not found');

    const grantList = await kv.list({ prefix: 'grant:' });
    let grantCount = 0;
    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) grantCount++;
    }

    return ok(c, { ...clientData, grantCount });
  });

  app.delete('/oauth/clients/:id', async (c) => {
    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('id');
    if (!kv) return internalError(c);

    const clientData = await kv.get(`client:${clientId}`, 'json');
    if (!clientData) return notFound(c, 'Client not found');

    const grantList = await kv.list({ prefix: 'grant:' });
    let deletedGrants = 0;
    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) { await kv.delete(key.name); deletedGrants++; }
    }

    const tokenList = await kv.list({ prefix: 'token:' });
    let deletedTokens = 0;
    for (const key of tokenList.keys) {
      const tokenData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (tokenData?.clientId === clientId) { await kv.delete(key.name); deletedTokens++; }
    }

    await kv.delete(`client:${clientId}`);

    return success(c, { message: 'Client deleted', deletedGrants, deletedTokens });
  });

  app.get('/oauth/stats', async (c) => {
    const kv = c.env.OAUTH_KV;
    if (!kv) return internalError(c);

    const [clientList, grantList, tokenList, codeList] = await Promise.all([
      kv.list({ prefix: 'client:' }),
      kv.list({ prefix: 'grant:' }),
      kv.list({ prefix: 'token:' }),
      kv.list({ prefix: 'code:' }),
    ]);

    return ok(c, {
      clients: clientList.keys.length,
      grants: grantList.keys.length,
      activeTokens: tokenList.keys.length,
      pendingCodes: codeList.keys.length,
    });
  });

  // ============== Badges ==============

  app.get('/badges', async (c) => {
    const db = createDatabase(c.env.DB);

    const allBadges = await db.query.badges.findMany({ orderBy: [badges.sortOrder] });

    const badgesWithCounts = await Promise.all(
      allBadges.map(async (badge) => {
        const badgeUsers = await db.query.userBadges.findMany({ where: eq(userBadges.badgeId, badge.id) });
        return withIconUrl({ ...badge, userCount: badgeUsers.length });
      }),
    );

    return ok(c, badgesWithCounts);
  });

  app.post('/badges', zValidator('json', createBadgeSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.badges.findFirst({ where: eq(badges.slug, data.slug) });
    if (existing) return conflict(c, 'A badge with this slug already exists');

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

    const createdBadge = await db.query.badges.findFirst({ where: eq(badges.id, id) });
    return created(c, createdBadge ? withIconUrl(createdBadge) : createdBadge);
  });

  app.patch('/badges/:id', zValidator('json', updateBadgeSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.badges.findFirst({ where: eq(badges.id, id) });
    if (!existing) return notFound(c, 'Badge not found');

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.badges.findFirst({ where: eq(badges.slug, data.slug) });
      if (slugExists) return conflict(c, 'A badge with this slug already exists');
    }

    const updateData = {
      ...data,
      ...(data.hideFromDirectory !== undefined ? { hideFromDirectory: data.hideFromDirectory ? 1 : 0 } : {}),
    };

    await db.update(badges).set(updateData).where(eq(badges.id, id));

    const updated = await db.query.badges.findFirst({ where: eq(badges.id, id) });
    return ok(c, updated ? withIconUrl(updated) : updated);
  });

  app.delete('/badges/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.badges.findFirst({ where: eq(badges.id, id) });
    if (!existing) return notFound(c, 'Badge not found');

    await db.delete(userBadges).where(eq(userBadges.badgeId, id));
    await db.delete(badges).where(eq(badges.id, id));

    return success(c);
  });

  app.post('/users/:userId/badges/:badgeId', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const badgeId = c.req.param('badgeId');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return notFound(c, 'Badge not found');

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (existing) return conflict(c, 'Badge already awarded to this user');

    await db.insert(userBadges).values({ id: crypto.randomUUID(), userId, badgeId });

    emitEvent(c, {
      type: 'dev.tampa.badge.issued',
      payload: { userId, badgeId: badge.id, badgeSlug: badge.slug, badgeName: badge.name, icon: badge.icon, color: badge.color, points: badge.points },
      metadata: { userId, source: 'admin' },
    });

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

  app.delete('/users/:userId/badges/:badgeId', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const badgeId = c.req.param('badgeId');

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });
    if (!existing) return notFound(c, 'User does not have this badge');

    await db.delete(userBadges).where(eq(userBadges.id, existing.id));
    return success(c);
  });

  // ============== Feature Flags ==============

  app.get('/flags', async (c) => {
    const db = createDatabase(c.env.DB);

    const allFlags = await db.query.featureFlags.findMany({ orderBy: [featureFlags.createdAt] });

    const flagsWithCounts = await Promise.all(
      allFlags.map(async (flag) => {
        const [userOverrides, groupOverrides] = await Promise.all([
          db.query.userFeatureFlags.findMany({ where: eq(userFeatureFlags.flagId, flag.id) }),
          db.query.groupFeatureFlags.findMany({ where: eq(groupFeatureFlags.flagId, flag.id) }),
        ]);
        return { ...flag, userOverrideCount: userOverrides.length, groupOverrideCount: groupOverrides.length };
      }),
    );

    return ok(c, flagsWithCounts);
  });

  app.post('/flags', zValidator('json', createFlagSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.slug, data.slug) });
    if (existing) return conflict(c, 'A flag with this slug already exists');

    const id = crypto.randomUUID();
    await db.insert(featureFlags).values({ id, name: data.name, slug: data.slug, description: data.description, enabledByDefault: data.enabledByDefault });

    const createdFlag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    return created(c, createdFlag);
  });

  app.patch('/flags/:id', zValidator('json', updateFlagSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    if (!existing) return notFound(c, 'Flag not found');

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await db.query.featureFlags.findFirst({ where: eq(featureFlags.slug, data.slug) });
      if (slugExists) return conflict(c, 'A flag with this slug already exists');
    }

    await db.update(featureFlags).set(data).where(eq(featureFlags.id, id));

    const updated = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    return ok(c, updated);
  });

  app.delete('/flags/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    if (!existing) return notFound(c, 'Flag not found');

    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.flagId, id));
    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.flagId, id));
    await db.delete(featureFlags).where(eq(featureFlags.id, id));

    return success(c);
  });

  app.get('/flags/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    if (!flag) return notFound(c, 'Flag not found');

    const userOverrides = await db.query.userFeatureFlags.findMany({ where: eq(userFeatureFlags.flagId, id) });
    const userOverridesWithInfo = await Promise.all(
      userOverrides.map(async (override) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, override.userId) });
        return { ...override, userName: user?.name || user?.email || 'Unknown', userEmail: user?.email };
      }),
    );

    const groupOverrides = await db.query.groupFeatureFlags.findMany({ where: eq(groupFeatureFlags.flagId, id) });
    const groupOverridesWithInfo = await Promise.all(
      groupOverrides.map(async (override) => {
        const group = await db.query.groups.findFirst({ where: eq(groups.id, override.groupId) });
        return { ...override, groupName: group?.name || 'Unknown', groupUrlname: group?.urlname };
      }),
    );

    return ok(c, { ...flag, userOverrides: userOverridesWithInfo, groupOverrides: groupOverridesWithInfo });
  });

  app.post('/flags/:flagId/users/:userId', zValidator('json', z.object({ enabled: z.boolean() })), async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const userId = c.req.param('userId');
    const { enabled } = c.req.valid('json');

    const flag = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, flagId) });
    if (!flag) return notFound(c, 'Flag not found');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    const existing = await db.query.userFeatureFlags.findFirst({
      where: and(eq(userFeatureFlags.userId, userId), eq(userFeatureFlags.flagId, flagId)),
    });

    if (existing) {
      await db.update(userFeatureFlags).set({ enabled }).where(eq(userFeatureFlags.id, existing.id));
    } else {
      await db.insert(userFeatureFlags).values({ id: crypto.randomUUID(), userId, flagId, enabled });
    }

    return success(c);
  });

  app.delete('/flags/:flagId/users/:userId', async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const userId = c.req.param('userId');

    const existing = await db.query.userFeatureFlags.findFirst({
      where: and(eq(userFeatureFlags.userId, userId), eq(userFeatureFlags.flagId, flagId)),
    });
    if (!existing) return notFound(c, 'Override not found');

    await db.delete(userFeatureFlags).where(eq(userFeatureFlags.id, existing.id));
    return success(c);
  });

  app.post('/flags/:flagId/groups/:groupId', zValidator('json', z.object({ enabled: z.boolean() })), async (c) => {
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
      await db.insert(groupFeatureFlags).values({ id: crypto.randomUUID(), groupId, flagId, enabled });
    }

    return success(c);
  });

  app.delete('/flags/:flagId/groups/:groupId', async (c) => {
    const db = createDatabase(c.env.DB);
    const flagId = c.req.param('flagId');
    const groupId = c.req.param('groupId');

    const existing = await db.query.groupFeatureFlags.findFirst({
      where: and(eq(groupFeatureFlags.groupId, groupId), eq(groupFeatureFlags.flagId, flagId)),
    });
    if (!existing) return notFound(c, 'Override not found');

    await db.delete(groupFeatureFlags).where(eq(groupFeatureFlags.id, existing.id));
    return success(c);
  });

  // ============== Achievements ==============

  app.get('/achievements', async (c) => {
    const db = createDatabase(c.env.DB);

    const allAchievements = await db.query.achievements.findMany({ orderBy: [achievements.sortOrder] });

    const achievementsWithCounts = await Promise.all(
      allAchievements.map(async (achievement) => {
        const progress = await db.query.achievementProgress.findMany({
          where: eq(achievementProgress.achievementKey, achievement.key),
        });
        const completedCount = progress.filter((p) => p.completedAt).length;
        return { ...achievement, userCount: progress.length, completedCount };
      }),
    );

    return ok(c, achievementsWithCounts);
  });

  app.post('/achievements', zValidator('json', createAchievementSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const existing = await db.query.achievements.findFirst({ where: eq(achievements.key, data.key) });
    if (existing) return conflict(c, 'An achievement with this key already exists');

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
    });

    const createdAchievement = await db.query.achievements.findFirst({ where: eq(achievements.id, id) });
    return created(c, createdAchievement);
  });

  app.patch('/achievements/:id', zValidator('json', updateAchievementSchema), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.achievements.findFirst({ where: eq(achievements.id, id) });
    if (!existing) return notFound(c, 'Achievement not found');

    if (data.key && data.key !== existing.key) {
      const duplicate = await db.query.achievements.findFirst({ where: eq(achievements.key, data.key) });
      if (duplicate) return conflict(c, 'An achievement with this key already exists');
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

    await db.update(achievements).set(updateData).where(eq(achievements.id, id));

    const updated = await db.query.achievements.findFirst({ where: eq(achievements.id, id) });
    return ok(c, updated);
  });

  app.delete('/achievements/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.achievements.findFirst({ where: eq(achievements.id, id) });
    if (!existing) return notFound(c, 'Achievement not found');

    await db.delete(achievementProgress).where(eq(achievementProgress.achievementKey, existing.key));
    await db.delete(achievements).where(eq(achievements.id, id));

    return success(c);
  });

  app.post('/achievements/:achievementKey/users/:userId/progress', zValidator('json', z.object({
    currentValue: z.number().int().min(0),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const achievementKey = c.req.param('achievementKey');
    const userId = c.req.param('userId');
    const { currentValue } = c.req.valid('json');

    const achievement = await db.query.achievements.findFirst({ where: eq(achievements.key, achievementKey) });
    if (!achievement) return notFound(c, 'Achievement not found');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return notFound(c, 'User not found');

    const now = new Date().toISOString();
    const completedAt = currentValue >= achievement.targetValue ? now : null;

    const existing = await db.query.achievementProgress.findFirst({
      where: and(eq(achievementProgress.userId, userId), eq(achievementProgress.achievementKey, achievementKey)),
    });

    if (existing) {
      await db.update(achievementProgress).set({ currentValue, completedAt, updatedAt: now }).where(eq(achievementProgress.id, existing.id));
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

    return ok(c, { currentValue, completedAt });
  });

  app.delete('/achievements/:achievementKey/users/:userId/progress', async (c) => {
    const db = createDatabase(c.env.DB);
    const achievementKey = c.req.param('achievementKey');
    const userId = c.req.param('userId');

    await db.delete(achievementProgress).where(
      and(eq(achievementProgress.userId, userId), eq(achievementProgress.achievementKey, achievementKey)),
    );

    return success(c);
  });

  // ============== Webhooks ==============

  app.get('/webhooks', async (c) => {
    const db = createDatabase(c.env.DB);

    const allWebhooks = await db.query.webhooks.findMany({
      orderBy: (w, { desc: d }) => [d(w.createdAt)],
    });

    const userIds = [...new Set(allWebhooks.map((w) => w.userId))];
    const ownerUsers = userIds.length > 0
      ? await db.query.users.findMany({ where: or(...userIds.map((id) => eq(users.id, id))) })
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

  app.patch('/webhooks/:id', zValidator('json', z.object({
    url: z.string().url().optional(),
    eventTypes: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const existing = await db.query.webhooks.findFirst({ where: eq(webhooks.id, id) });
    if (!existing) return notFound(c, 'Webhook not found');

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.url !== undefined) updateData.url = data.url;
    if (data.eventTypes !== undefined) updateData.eventTypes = JSON.stringify(data.eventTypes);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await db.update(webhooks).set(updateData).where(eq(webhooks.id, id));
    return success(c);
  });

  app.delete('/webhooks/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.webhooks.findFirst({ where: eq(webhooks.id, id) });
    if (!existing) return notFound(c, 'Webhook not found');

    await db.delete(webhooks).where(eq(webhooks.id, id));
    return success(c);
  });

  // ============== Entitlements ==============

  app.get('/entitlements', async (c) => {
    const db = createDatabase(c.env.DB);

    const allEntitlements = await db.query.userEntitlements.findMany({
      orderBy: [desc(userEntitlements.grantedAt)],
    });

    const enriched = await Promise.all(
      allEntitlements.map(async (ent) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, ent.userId) });
        return {
          ...ent,
          userName: user?.name || user?.email || 'Unknown',
          userEmail: user?.email || '',
          userUsername: user?.username || null,
        };
      }),
    );

    return ok(c, enriched);
  });

  app.post('/entitlements', zValidator('json', z.object({
    userId: z.string().min(1),
    entitlement: z.string().min(1).max(100),
    expiresAt: z.string().optional(),
    source: z.string().optional().default('admin'),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const data = c.req.valid('json');

    const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (!user) return notFound(c, 'User not found');

    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, data.userId), eq(userEntitlements.entitlement, data.entitlement)),
    });
    if (existing) return conflict(c, 'User already has this entitlement');

    const id = crypto.randomUUID();
    await db.insert(userEntitlements).values({
      id,
      userId: data.userId,
      entitlement: data.entitlement,
      expiresAt: data.expiresAt || null,
      source: data.source,
    });

    const createdEnt = await db.query.userEntitlements.findFirst({ where: eq(userEntitlements.id, id) });
    return created(c, createdEnt);
  });

  app.delete('/entitlements/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.userEntitlements.findFirst({ where: eq(userEntitlements.id, id) });
    if (!existing) return notFound(c, 'Entitlement not found');

    await db.delete(userEntitlements).where(eq(userEntitlements.id, id));
    return success(c);
  });

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

    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, data.userId), eq(userEntitlements.entitlement, data.entitlement)),
    });

    if (existing) {
      await db.update(userEntitlements).set({ expiresAt: data.expiresAt || null, source: data.source }).where(eq(userEntitlements.id, existing.id));
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

  app.delete('/entitlements/:userId/:entitlement', async (c) => {
    const db = createDatabase(c.env.DB);
    const userId = c.req.param('userId');
    const entitlement = c.req.param('entitlement');

    const existing = await db.query.userEntitlements.findFirst({
      where: and(eq(userEntitlements.userId, userId), eq(userEntitlements.entitlement, entitlement)),
    });
    if (!existing) return notFound(c, 'Entitlement not found for this user');

    await db.delete(userEntitlements).where(eq(userEntitlements.id, existing.id));
    return success(c);
  });

  // ============== Badge Claim Links ==============

  app.get('/badges/:id/claim-links', async (c) => {
    const db = createDatabase(c.env.DB);
    const badgeId = c.req.param('id');

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, badgeId) });
    if (!badge) return notFound(c, 'Badge not found');

    const links = await db.query.badgeClaimLinks.findMany({ where: eq(badgeClaimLinks.badgeId, badgeId) });
    return ok(c, links);
  });

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

    const auth = c.get('adminAuth');
    const createdBy = auth.user.id;

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

    const createdLink = await db.query.badgeClaimLinks.findFirst({ where: eq(badgeClaimLinks.id, id) });
    return created(c, createdLink);
  });

  app.delete('/claim-links/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    const existing = await db.query.badgeClaimLinks.findFirst({ where: eq(badgeClaimLinks.id, id) });
    if (!existing) return notFound(c, 'Claim link not found');

    await db.delete(badgeClaimLinks).where(eq(badgeClaimLinks.id, id));
    return success(c);
  });

  // ============== Group Claim Requests ==============

  app.get('/claim-requests', zValidator('query', z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { status, limit, offset } = c.req.valid('query');

    const conditions = [];
    if (status) conditions.push(eq(groupClaimRequests.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db.query.groupClaimRequests.findMany({
      where,
      orderBy: [desc(groupClaimRequests.createdAt)],
      limit,
      offset,
    });

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

    return list(c, enriched, { total: allRequests.length, limit, offset });
  });

  app.post('/claim-requests/:id/approve', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const auth = c.get('adminAuth');

    const request = await db.query.groupClaimRequests.findFirst({ where: eq(groupClaimRequests.id, id) });
    if (!request) return notFound(c, 'Claim request not found');

    if (request.status !== 'pending') return badRequest(c, `Request is already ${request.status}`);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, request.groupId) });
    if (!group) return notFound(c, 'Group not found');

    const now = new Date().toISOString();

    await db.update(groupClaimRequests).set({
      status: 'approved',
      reviewedBy: auth.user.id,
      reviewedAt: now,
    }).where(eq(groupClaimRequests.id, id));

    const existingMember = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, request.groupId), eq(groupMembers.userId, request.userId)),
    });

    if (!existingMember) {
      await db.insert(groupMembers).values({
        id: crypto.randomUUID(),
        groupId: request.groupId,
        userId: request.userId,
        role: GroupMemberRole.OWNER,
      });
    } else if (existingMember.role !== GroupMemberRole.OWNER) {
      await db.update(groupMembers).set({ role: GroupMemberRole.OWNER }).where(eq(groupMembers.id, existingMember.id));
    }

    emitEvent(c, {
      type: 'dev.tampa.group.claimed',
      payload: {
        groupId: request.groupId,
        userId: request.userId,
        method: 'request',
        autoApproved: false,
        reviewedBy: auth.user.id,
      },
      metadata: { userId: request.userId, source: 'admin' },
    });

    return success(c, { message: 'Claim request approved' });
  });

  app.post('/claim-requests/:id/reject', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const auth = c.get('adminAuth');

    const request = await db.query.groupClaimRequests.findFirst({ where: eq(groupClaimRequests.id, id) });
    if (!request) return notFound(c, 'Claim request not found');

    if (request.status !== 'pending') return badRequest(c, `Request is already ${request.status}`);

    let notes: string | null = null;
    try {
      const body = await c.req.json();
      if (body?.notes) notes = body.notes;
    } catch {
      // No body
    }

    await db.update(groupClaimRequests).set({
      status: 'rejected',
      reviewedBy: auth.user.id,
      reviewedAt: new Date().toISOString(),
      notes: notes || request.notes,
    }).where(eq(groupClaimRequests.id, id));

    return success(c, { message: 'Claim request rejected' });
  });

  // ============== Group Claim Invites ==============

  app.get('/groups/:groupId/claim-invites', async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const invites = await db.query.groupClaimInvites.findMany({ where: eq(groupClaimInvites.groupId, groupId) });
    return ok(c, invites);
  });

  app.post('/groups/:groupId/claim-invites', zValidator('json', z.object({
    autoApprove: z.boolean().optional().default(false),
    expiresAt: z.string().optional(),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({ where: eq(groups.id, groupId) });
    if (!group) return notFound(c, 'Group not found');

    const auth = c.get('adminAuth');

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
      createdBy: auth.user.id,
    });

    const createdInvite = await db.query.groupClaimInvites.findFirst({ where: eq(groupClaimInvites.id, id) });
    return created(c, createdInvite);
  });

  // ============== Group Creation Requests ==============

  app.get('/group-creation-requests', zValidator('query', z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    offset: z.coerce.number().min(0).optional().default(0),
  })), async (c) => {
    const db = createDatabase(c.env.DB);
    const { status, limit, offset } = c.req.valid('query');

    const conditions = [];
    if (status) conditions.push(eq(groupCreationRequests.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db.query.groupCreationRequests.findMany({
      where,
      orderBy: [desc(groupCreationRequests.createdAt)],
      limit,
      offset,
    });

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

    return list(c, enriched, { total: allRequests.length, limit, offset });
  });

  app.post('/group-creation-requests/:id/approve', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const auth = c.get('adminAuth');

    const request = await db.query.groupCreationRequests.findFirst({ where: eq(groupCreationRequests.id, id) });
    if (!request) return notFound(c, 'Creation request not found');

    if (request.status !== 'pending') return badRequest(c, `Request is already ${request.status}`);

    const now = new Date().toISOString();

    const urlname = request.groupName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100);

    const existingGroup = await db.query.groups.findFirst({ where: eq(groups.urlname, urlname) });
    const finalUrlname = existingGroup ? `${urlname}-${Date.now().toString(36)}` : urlname;

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

    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId,
      userId: request.userId,
      role: GroupMemberRole.OWNER,
    });

    await db.update(groupCreationRequests).set({
      status: 'approved',
      reviewedBy: auth.user.id,
      reviewedAt: now,
      groupId,
    }).where(eq(groupCreationRequests.id, id));

    emitEvent(c, {
      type: 'dev.tampa.group.created',
      payload: {
        groupId,
        groupName: request.groupName,
        createdBy: request.userId,
        approvedBy: auth.user.id,
        source: 'creation-request',
      },
      metadata: { userId: request.userId, source: 'admin' },
    });

    return success(c, { message: 'Creation request approved', groupId, urlname: finalUrlname });
  });

  app.post('/group-creation-requests/:id/reject', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');
    const auth = c.get('adminAuth');

    const request = await db.query.groupCreationRequests.findFirst({ where: eq(groupCreationRequests.id, id) });
    if (!request) return notFound(c, 'Creation request not found');

    if (request.status !== 'pending') return badRequest(c, `Request is already ${request.status}`);

    let notes: string | null = null;
    try {
      const body = await c.req.json();
      if (body?.notes) notes = body.notes;
    } catch {
      // No body
    }

    await db.update(groupCreationRequests).set({
      status: 'rejected',
      reviewedBy: auth.user.id,
      reviewedAt: new Date().toISOString(),
    }).where(eq(groupCreationRequests.id, id));

    return success(c, { message: 'Creation request rejected' });
  });

  return app;
}

export const v1AdminRoutes = createV1AdminRoutes();
