/**
 * Admin API Routes
 *
 * Endpoints for managing groups, triggering syncs, and viewing logs.
 * These will eventually be protected by authentication.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, like } from 'drizzle-orm';
import { createDatabase } from '../db';
import { groups, events, syncLogs, users, userIdentities, sessions, EventPlatform, UserRole } from '../db/schema';
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
    const db = createDatabase(c.env.DB);

    // Initialize providers
    await providerRegistry.initializeAll(c.env);

    const syncService = new SyncService(db, providerRegistry, c.env);
    const result = await syncService.syncAllGroups();

    return c.json(result);
  });

  /**
   * Trigger sync for a single group
   * POST /api/admin/sync/group/:id
   */
  app.post('/sync/group/:id', async (c) => {
    const db = createDatabase(c.env.DB);
    const id = c.req.param('id');

    // Check group exists
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Initialize providers
    await providerRegistry.initializeAll(c.env);

    const syncService = new SyncService(db, providerRegistry, c.env);
    const result = await syncService.syncGroup(id);

    return c.json(result);
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
      conditions.push(like(users.email, `%${search}%`));
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

    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, id),
    });

    return c.json({
      ...user,
      identities: identities.map((i) => ({
        provider: i.provider,
        username: i.providerUsername,
      })),
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

  return app;
}

export const adminApiRoutes = createAdminApiRoutes();
