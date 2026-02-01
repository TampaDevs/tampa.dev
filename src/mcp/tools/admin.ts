/**
 * MCP Admin Tools
 *
 * ~46 tools covering all platform administration operations.
 * Every handler checks isPlatformAdmin before proceeding.
 *
 * Organized by domain:
 *   - User Administration
 *   - Group Administration
 *   - Platform Connections
 *   - Sync Operations
 *   - Badge Administration
 *   - Achievement Administration
 *   - Feature Flags
 *   - OAuth Administration
 *   - Webhook Administration
 *   - Group Claims / Creation Requests
 */

import { z } from 'zod';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  users,
  userIdentities,
  userBadges,
  userEntitlements,
  groups,
  groupPlatformConnections,
  groupMembers,
  events,
  syncLogs,
  badges,
  achievements,
  achievementProgress,
  featureFlags,
  userFeatureFlags,
  groupFeatureFlags,
  webhooks,
  groupClaimRequests,
  groupClaimInvites,
  groupCreationRequests,
  sessions,
} from '../../db/schema.js';
import { isPlatformAdmin } from '../../lib/auth.js';
import type { ToolContext, ToolResult } from '../types.js';

// ── Helpers ──

function adminError(): ToolResult {
  return { content: [{ type: 'text', text: 'Error: Admin access required' }], isError: true };
}

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): ToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

function parseGroupJson(group: Record<string, unknown>) {
  return {
    ...group,
    tags: typeof group.tags === 'string' ? JSON.parse(group.tags) : group.tags ?? null,
    socialLinks: typeof group.socialLinks === 'string' ? JSON.parse(group.socialLinks) : group.socialLinks ?? null,
  };
}

// ══════════════════════════════════════════════
// USER ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_users',
  description: 'List users with pagination and optional filters (search by name/email, role filter)',
  scope: 'admin',
  inputSchema: z.object({
    search: z.string().optional().describe('Search name, email, or username (LIKE match)'),
    role: z.enum(['user', 'admin', 'superadmin']).optional().describe('Filter by role'),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.role) conditions.push(eq(users.role, args.role));
    if (args.search) {
      conditions.push(
        or(
          like(users.email, `%${args.search}%`),
          like(users.name, `%${args.search}%`),
          like(users.username, `%${args.search}%`),
        )!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.users.findMany({
      where,
      orderBy: [desc(users.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    const allMatching = await db.query.users.findMany({ where });
    return ok({ data: results, pagination: { total: allMatching.length, limit: args.limit, offset: args.offset } });
  },
});

defineTool({
  name: 'admin_get_user',
  description: 'Get a user by ID, including badge count and group memberships',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const user = await db.query.users.findFirst({ where: eq(users.id, args.userId) });
    if (!user) return err('User not found');

    const [badgesList, memberships, identities, entitlements] = await Promise.all([
      db.query.userBadges.findMany({ where: eq(userBadges.userId, args.userId) }),
      db.query.groupMembers.findMany({ where: eq(groupMembers.userId, args.userId) }),
      db.query.userIdentities.findMany({ where: eq(userIdentities.userId, args.userId) }),
      db.query.userEntitlements.findMany({ where: eq(userEntitlements.userId, args.userId) }),
    ]);

    // Enrich memberships with group name
    const enrichedMemberships = await Promise.all(
      memberships.map(async (m) => {
        const group = await db.query.groups.findFirst({ where: eq(groups.id, m.groupId) });
        return { groupId: m.groupId, groupName: group?.name, role: m.role, createdAt: m.createdAt };
      }),
    );

    return ok({
      ...user,
      identities: identities.map((i) => ({ provider: i.provider, username: i.providerUsername })),
      badgeCount: badgesList.length,
      badges: badgesList,
      memberships: enrichedMemberships,
      entitlements,
    });
  },
});

defineTool({
  name: 'admin_update_user_role',
  description: 'Update a user\'s role (user/admin/superadmin)',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    role: z.enum(['user', 'admin', 'superadmin']).describe('New role'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const user = await db.query.users.findFirst({ where: eq(users.id, args.userId) });
    if (!user) return err('User not found');

    // Only superadmins can promote to superadmin
    if (args.role === 'superadmin' && ctx.auth.user.role !== 'superadmin') {
      return err('Only superadmins can promote to superadmin');
    }

    await db.update(users).set({ role: args.role, updatedAt: new Date().toISOString() }).where(eq(users.id, args.userId));
    return ok({ success: true, userId: args.userId, newRole: args.role });
  },
});

defineTool({
  name: 'admin_delete_user',
  description: 'Delete a user. Requires confirm=true. Without it, returns a preview of affected data.',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    confirm: z.boolean().optional().default(false).describe('Must be true to proceed with deletion'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const user = await db.query.users.findFirst({ where: eq(users.id, args.userId) });
    if (!user) return err('User not found');

    // Prevent deleting yourself
    if (args.userId === ctx.auth.user.id) return err('Cannot delete your own account via admin tool');

    // Prevent deleting superadmins unless you are superadmin
    if (user.role === 'superadmin' && ctx.auth.user.role !== 'superadmin') {
      return err('Only superadmins can delete superadmin accounts');
    }

    const [badgesList, memberships, sessionList] = await Promise.all([
      db.query.userBadges.findMany({ where: eq(userBadges.userId, args.userId) }),
      db.query.groupMembers.findMany({ where: eq(groupMembers.userId, args.userId) }),
      db.query.sessions.findMany({ where: eq(sessions.userId, args.userId) }),
    ]);

    if (!args.confirm) {
      return ok({
        preview: true,
        message: 'Pass confirm=true to proceed with deletion',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        affectedData: {
          badges: badgesList.length,
          groupMemberships: memberships.length,
          activeSessions: sessionList.length,
        },
      });
    }

    // Cascade deletes are handled by FK constraints, but clean up sessions explicitly
    await db.delete(sessions).where(eq(sessions.userId, args.userId));
    await db.delete(users).where(eq(users.id, args.userId));

    return ok({ success: true, deletedUserId: args.userId });
  },
});

defineTool({
  name: 'admin_grant_entitlement',
  description: 'Grant an entitlement to a user',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    entitlement: z.string().min(1).describe('Entitlement key'),
    source: z.string().optional().default('admin').describe('Grant source (defaults to "admin")'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const user = await db.query.users.findFirst({ where: eq(users.id, args.userId) });
    if (!user) return err('User not found');

    // Upsert: ON CONFLICT DO NOTHING
    await db.insert(userEntitlements).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      entitlement: args.entitlement,
      source: args.source,
    }).onConflictDoNothing();

    return ok({ success: true, userId: args.userId, entitlement: args.entitlement });
  },
});

// ══════════════════════════════════════════════
// GROUP ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_groups',
  description: 'List all groups with pagination and optional filters',
  scope: 'admin',
  inputSchema: z.object({
    platform: z.enum(['meetup', 'eventbrite', 'luma', 'tampa.dev']).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    search: z.string().optional().describe('Search by group name (LIKE match)'),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.platform) conditions.push(eq(groups.platform, args.platform));
    if (args.isActive !== undefined) conditions.push(eq(groups.isActive, args.isActive));
    if (args.isFeatured !== undefined) conditions.push(eq(groups.isFeatured, args.isFeatured));
    if (args.search) conditions.push(like(groups.name, `%${args.search}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.groups.findMany({
      where,
      orderBy: [desc(groups.updatedAt)],
      limit: args.limit,
      offset: args.offset,
    });

    const allMatching = await db.query.groups.findMany({ where });
    return ok({
      data: results.map(parseGroupJson),
      pagination: { total: allMatching.length, limit: args.limit, offset: args.offset },
    });
  },
});

defineTool({
  name: 'admin_get_group',
  description: 'Get a group by ID, including platform connections and member count',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().describe('Group ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, args.groupId) });
    if (!group) return err('Group not found');

    const [connections, members, groupEvents] = await Promise.all([
      db.query.groupPlatformConnections.findMany({ where: eq(groupPlatformConnections.groupId, args.groupId) }),
      db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, args.groupId) }),
      db.query.events.findMany({ where: eq(events.groupId, args.groupId) }),
    ]);

    return ok({
      ...parseGroupJson(group),
      connections,
      memberCount: members.length,
      eventCount: groupEvents.length,
    });
  },
});

defineTool({
  name: 'admin_create_group',
  description: 'Create a new group',
  scope: 'admin',
  inputSchema: z.object({
    name: z.string().min(1).max(200),
    urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    platform: z.enum(['meetup', 'eventbrite', 'luma', 'tampa.dev']),
    platformId: z.string().min(1).max(200),
    description: z.string().optional(),
    website: z.string().url().optional(),
    isActive: z.boolean().optional().default(true),
    displayOnSite: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional(),
    socialLinks: z.record(z.string()).optional(),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    // Check uniqueness
    const existingUrlname = await db.query.groups.findFirst({ where: eq(groups.urlname, args.urlname) });
    if (existingUrlname) return err('A group with this urlname already exists');

    const existingPlatformId = await db.query.groups.findFirst({
      where: and(eq(groups.platform, args.platform), eq(groups.platformId, args.platformId)),
    });
    if (existingPlatformId) return err(`A group with this platform ID already exists: ${existingPlatformId.urlname}`);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const link = `https://${args.platform}.com/${args.platformId}`;

    await db.insert(groups).values({
      id,
      urlname: args.urlname,
      name: args.name,
      platform: args.platform,
      platformId: args.platformId,
      description: args.description,
      link,
      website: args.website,
      isActive: args.isActive ?? true,
      displayOnSite: args.displayOnSite ?? false,
      isFeatured: args.isFeatured ?? false,
      tags: args.tags ? JSON.stringify(args.tags) : null,
      socialLinks: args.socialLinks ? JSON.stringify(args.socialLinks) : null,
      createdAt: now,
      updatedAt: now,
    });

    // Create platform connection for non-tampa.dev groups
    if (args.platform !== 'tampa.dev') {
      await db.insert(groupPlatformConnections).values({
        id: crypto.randomUUID(),
        groupId: id,
        platform: args.platform,
        platformId: args.platformId,
        platformUrlname: args.urlname,
        platformLink: link,
        isActive: args.isActive ?? true,
      });
    }

    const created = await db.query.groups.findFirst({ where: eq(groups.id, id) });
    return ok({ success: true, group: created ? parseGroupJson(created) : null });
  },
});

defineTool({
  name: 'admin_update_group',
  description: 'Update a group\'s fields',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Group ID'),
    name: z.string().min(1).max(200).optional(),
    urlname: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional(),
    website: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    displayOnSite: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string()).optional().nullable(),
    socialLinks: z.record(z.string()).optional().nullable(),
    maxBadges: z.number().int().min(0).max(1000).optional(),
    maxBadgePoints: z.number().int().min(0).max(10000).optional(),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.groups.findFirst({ where: eq(groups.id, args.id) });
    if (!existing) return err('Group not found');

    if (args.urlname && args.urlname !== existing.urlname) {
      const dup = await db.query.groups.findFirst({ where: eq(groups.urlname, args.urlname) });
      if (dup) return err('A group with this urlname already exists');
    }

    const { id: _id, ...updateFields } = args;
    const updateData: Record<string, unknown> = { ...updateFields, updatedAt: new Date().toISOString() };
    if (updateFields.tags !== undefined) updateData.tags = updateFields.tags ? JSON.stringify(updateFields.tags) : null;
    if (updateFields.socialLinks !== undefined) updateData.socialLinks = updateFields.socialLinks ? JSON.stringify(updateFields.socialLinks) : null;

    await db.update(groups).set(updateData).where(eq(groups.id, args.id));
    const updated = await db.query.groups.findFirst({ where: eq(groups.id, args.id) });
    return ok({ success: true, group: updated ? parseGroupJson(updated) : null });
  },
});

defineTool({
  name: 'admin_delete_group',
  description: 'Delete (deactivate) a group. Requires confirm=true. Without it, returns a preview.',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Group ID'),
    confirm: z.boolean().optional().default(false),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, args.id) });
    if (!group) return err('Group not found');

    const [members, groupEvents, groupBadges] = await Promise.all([
      db.query.groupMembers.findMany({ where: eq(groupMembers.groupId, args.id) }),
      db.query.events.findMany({ where: eq(events.groupId, args.id) }),
      db.query.badges.findMany({ where: eq(badges.groupId, args.id) }),
    ]);

    if (!args.confirm) {
      return ok({
        preview: true,
        message: 'Pass confirm=true to proceed with deactivation',
        group: { id: group.id, name: group.name, platform: group.platform },
        affectedData: { members: members.length, events: groupEvents.length, badges: groupBadges.length },
      });
    }

    await db.update(groups).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(groups.id, args.id));
    return ok({ success: true, deactivatedGroupId: args.id });
  },
});

// ══════════════════════════════════════════════
// PLATFORM CONNECTIONS
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_connections',
  description: 'List platform connections for a group',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().describe('Group ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, args.groupId) });
    if (!group) return err('Group not found');

    const connections = await db.query.groupPlatformConnections.findMany({
      where: eq(groupPlatformConnections.groupId, args.groupId),
    });
    return ok({ groupId: args.groupId, groupName: group.name, connections });
  },
});

defineTool({
  name: 'admin_add_connection',
  description: 'Add a platform connection to a group',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().describe('Group ID'),
    platform: z.enum(['meetup', 'eventbrite', 'luma']),
    platformId: z.string().min(1).max(200),
    platformUrlname: z.string().optional(),
    platformLink: z.string().url().optional(),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, args.groupId) });
    if (!group) return err('Group not found');

    const existing = await db.query.groupPlatformConnections.findFirst({
      where: and(
        eq(groupPlatformConnections.platform, args.platform),
        eq(groupPlatformConnections.platformId, args.platformId),
      ),
    });
    if (existing) return err(`Connection for ${args.platform}/${args.platformId} already exists`);

    const id = crypto.randomUUID();
    await db.insert(groupPlatformConnections).values({
      id,
      groupId: args.groupId,
      platform: args.platform,
      platformId: args.platformId,
      platformUrlname: args.platformUrlname || null,
      platformLink: args.platformLink || `https://${args.platform}.com/${args.platformId}`,
      isActive: true,
    });

    const created = await db.query.groupPlatformConnections.findFirst({ where: eq(groupPlatformConnections.id, id) });
    return ok({ success: true, connection: created });
  },
});

defineTool({
  name: 'admin_remove_connection',
  description: 'Remove a platform connection',
  scope: 'admin',
  inputSchema: z.object({
    connectionId: z.string().describe('Connection ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.groupPlatformConnections.findFirst({
      where: eq(groupPlatformConnections.id, args.connectionId),
    });
    if (!existing) return err('Connection not found');

    await db.delete(groupPlatformConnections).where(eq(groupPlatformConnections.id, args.connectionId));
    return ok({ success: true, deletedConnectionId: args.connectionId });
  },
});

// ══════════════════════════════════════════════
// SYNC OPERATIONS
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_sync_status',
  description: 'Get sync status overview: groups with their lastSyncAt, syncError, and recent sync logs',
  scope: 'admin',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const allGroups = await db.query.groups.findMany();
    const activeGroups = allGroups.filter((g) => g.isActive);
    const recentLogs = await db.query.syncLogs.findMany({
      orderBy: [desc(syncLogs.startedAt)],
      limit: 10,
    });

    const groupSyncStatus = activeGroups.map((g) => ({
      id: g.id,
      name: g.name,
      platform: g.platform,
      lastSyncAt: g.lastSyncAt,
      syncError: g.syncError,
    }));

    return ok({
      groups: { total: allGroups.length, active: activeGroups.length },
      groupSyncStatus,
      recentLogs,
    });
  },
});

defineTool({
  name: 'admin_sync_all',
  description: 'Trigger a full sync of all active groups. Requires confirm=true. Note: This delegates to the admin REST API since sync requires provider instances.',
  scope: 'admin',
  inputSchema: z.object({
    confirm: z.boolean().optional().default(false),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();

    if (!args.confirm) {
      return ok({
        preview: true,
        message: 'Pass confirm=true to trigger a full sync. This will sync all active groups across all configured providers.',
        hint: 'Alternatively, use POST /api/admin/sync/all via the REST API.',
      });
    }

    return ok({
      message: 'Full sync must be triggered via the REST API: POST /api/admin/sync/all. The MCP tool cannot instantiate provider adapters directly. Use the admin web UI or call the API endpoint.',
    });
  },
});

defineTool({
  name: 'admin_sync_group',
  description: 'Trigger sync for a single group. Note: Delegates to REST API since sync requires provider instances.',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().describe('Group ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({ where: eq(groups.id, args.groupId) });
    if (!group) return err('Group not found');

    return ok({
      message: `Sync for group "${group.name}" must be triggered via the REST API: POST /api/admin/sync/group/${args.groupId}. The MCP tool cannot instantiate provider adapters directly.`,
      group: { id: group.id, name: group.name, platform: group.platform },
    });
  },
});

defineTool({
  name: 'admin_sync_logs',
  description: 'Query sync logs with optional groupId filter',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().optional().describe('Filter by group ID'),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.groupId) conditions.push(eq(syncLogs.groupId, args.groupId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.syncLogs.findMany({
      where,
      orderBy: [desc(syncLogs.startedAt)],
      limit: args.limit,
      offset: args.offset,
    });

    return ok({ data: results, limit: args.limit, offset: args.offset });
  },
});

// ══════════════════════════════════════════════
// BADGE ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_badges',
  description: 'List all badges with optional groupId filter',
  scope: 'admin',
  inputSchema: z.object({
    groupId: z.string().optional().describe('Filter by group ID'),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.groupId) conditions.push(eq(badges.groupId, args.groupId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.badges.findMany({
      where,
      orderBy: [desc(badges.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    return ok({ data: results });
  },
});

defineTool({
  name: 'admin_create_badge',
  description: 'Create a new platform badge',
  scope: 'admin',
  inputSchema: z.object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    icon: z.string().min(1).describe('Emoji or icon identifier'),
    color: z.string().optional().default('#E5574F'),
    xpValue: z.number().int().min(0).optional().default(0).describe('Points/XP value'),
    groupId: z.string().optional().describe('Group ID (null for platform badges)'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.badges.findFirst({ where: eq(badges.slug, args.slug) });
    if (existing) return err('A badge with this slug already exists');

    if (args.groupId) {
      const group = await db.query.groups.findFirst({ where: eq(groups.id, args.groupId) });
      if (!group) return err('Group not found');
    }

    const id = crypto.randomUUID();
    await db.insert(badges).values({
      id,
      name: args.name,
      slug: args.slug,
      description: args.description,
      icon: args.icon,
      color: args.color,
      points: args.xpValue,
      groupId: args.groupId || null,
    });

    const created = await db.query.badges.findFirst({ where: eq(badges.id, id) });
    return ok({ success: true, badge: created });
  },
});

defineTool({
  name: 'admin_update_badge',
  description: 'Update a badge',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Badge ID'),
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    xpValue: z.number().int().min(0).optional(),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.badges.findFirst({ where: eq(badges.id, args.id) });
    if (!existing) return err('Badge not found');

    const updateData: Record<string, unknown> = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.icon !== undefined) updateData.icon = args.icon;
    if (args.color !== undefined) updateData.color = args.color;
    if (args.xpValue !== undefined) updateData.points = args.xpValue;

    if (Object.keys(updateData).length === 0) return err('No fields to update');

    await db.update(badges).set(updateData).where(eq(badges.id, args.id));
    const updated = await db.query.badges.findFirst({ where: eq(badges.id, args.id) });
    return ok({ success: true, badge: updated });
  },
});

defineTool({
  name: 'admin_delete_badge',
  description: 'Delete a badge. Requires confirm=true. Without it, returns a preview.',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Badge ID'),
    confirm: z.boolean().optional().default(false),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const badge = await db.query.badges.findFirst({ where: eq(badges.id, args.id) });
    if (!badge) return err('Badge not found');

    const awards = await db.query.userBadges.findMany({ where: eq(userBadges.badgeId, args.id) });

    if (!args.confirm) {
      return ok({
        preview: true,
        message: 'Pass confirm=true to proceed with deletion',
        badge: { id: badge.id, name: badge.name, slug: badge.slug },
        affectedData: { userAwards: awards.length },
      });
    }

    await db.delete(userBadges).where(eq(userBadges.badgeId, args.id));
    await db.delete(badges).where(eq(badges.id, args.id));
    return ok({ success: true, deletedBadgeId: args.id });
  },
});

defineTool({
  name: 'admin_award_badge',
  description: 'Award a badge to a user',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    badgeId: z.string().describe('Badge ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const [user, badge] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, args.userId) }),
      db.query.badges.findFirst({ where: eq(badges.id, args.badgeId) }),
    ]);
    if (!user) return err('User not found');
    if (!badge) return err('Badge not found');

    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, args.userId), eq(userBadges.badgeId, args.badgeId)),
    });
    if (existing) return err('User already has this badge');

    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      badgeId: args.badgeId,
      awardedBy: ctx.auth.user.id,
    });

    return ok({ success: true, userId: args.userId, badgeId: args.badgeId, badgeName: badge.name });
  },
});

defineTool({
  name: 'admin_revoke_badge',
  description: 'Revoke a badge from a user',
  scope: 'admin',
  inputSchema: z.object({
    userId: z.string().describe('User ID'),
    badgeId: z.string().describe('Badge ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, args.userId), eq(userBadges.badgeId, args.badgeId)),
    });
    if (!existing) return err('User does not have this badge');

    await db.delete(userBadges).where(
      and(eq(userBadges.userId, args.userId), eq(userBadges.badgeId, args.badgeId)),
    );

    return ok({ success: true, userId: args.userId, revokedBadgeId: args.badgeId });
  },
});

// ══════════════════════════════════════════════
// ACHIEVEMENT ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_achievements',
  description: 'List all achievement definitions',
  scope: 'admin',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const results = await db.query.achievements.findMany({
      orderBy: [desc(achievements.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    return ok({ data: results });
  },
});

defineTool({
  name: 'admin_create_achievement',
  description: 'Create a new achievement definition',
  scope: 'admin',
  inputSchema: z.object({
    name: z.string().min(1).max(200),
    key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
    description: z.string().min(1),
    icon: z.string().optional(),
    color: z.string().optional(),
    xpReward: z.number().int().min(0).optional().default(0),
    targetValue: z.number().int().min(1).optional().default(1),
    eventType: z.string().optional().describe('Domain event type that increments this achievement'),
    conditions: z.string().optional().describe('JSON string of condition array'),
    badgeSlug: z.string().optional().describe('Auto-award this badge on completion'),
    entitlement: z.string().optional().describe('Auto-grant this entitlement on completion'),
    hidden: z.boolean().optional().default(false),
    enabled: z.boolean().optional().default(true).describe('Whether this achievement is actively evaluated. Disabled achievements won\'t accumulate progress.'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.achievements.findFirst({ where: eq(achievements.key, args.key) });
    if (existing) return err('An achievement with this key already exists');

    // Validate conditions JSON if provided
    if (args.conditions) {
      try { JSON.parse(args.conditions); } catch { return err('Invalid JSON for conditions'); }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(achievements).values({
      id,
      name: args.name,
      key: args.key,
      description: args.description,
      icon: args.icon || null,
      color: args.color || null,
      points: args.xpReward,
      targetValue: args.targetValue,
      eventType: args.eventType || null,
      conditions: args.conditions || null,
      badgeSlug: args.badgeSlug || null,
      entitlement: args.entitlement || null,
      hidden: args.hidden ? 1 : 0,
      enabled: args.enabled !== false ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.query.achievements.findFirst({ where: eq(achievements.id, id) });
    return ok({ success: true, achievement: created });
  },
});

defineTool({
  name: 'admin_update_achievement',
  description: 'Update an achievement definition',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Achievement ID'),
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    xpReward: z.number().int().min(0).optional(),
    targetValue: z.number().int().min(1).optional(),
    hidden: z.boolean().optional(),
    enabled: z.boolean().optional().describe('Whether this achievement is actively evaluated. Disabled achievements won\'t accumulate progress.'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.achievements.findFirst({ where: eq(achievements.id, args.id) });
    if (!existing) return err('Achievement not found');

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.icon !== undefined) updateData.icon = args.icon;
    if (args.color !== undefined) updateData.color = args.color;
    if (args.xpReward !== undefined) updateData.points = args.xpReward;
    if (args.targetValue !== undefined) updateData.targetValue = args.targetValue;
    if (args.hidden !== undefined) updateData.hidden = args.hidden ? 1 : 0;
    if (args.enabled !== undefined) updateData.enabled = args.enabled ? 1 : 0;

    await db.update(achievements).set(updateData).where(eq(achievements.id, args.id));
    const updated = await db.query.achievements.findFirst({ where: eq(achievements.id, args.id) });
    return ok({ success: true, achievement: updated });
  },
});

defineTool({
  name: 'admin_delete_achievement',
  description: 'Delete an achievement. Requires confirm=true. Without it, returns a preview.',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Achievement ID'),
    confirm: z.boolean().optional().default(false),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const achievement = await db.query.achievements.findFirst({ where: eq(achievements.id, args.id) });
    if (!achievement) return err('Achievement not found');

    const progress = await db.query.achievementProgress.findMany({
      where: eq(achievementProgress.achievementKey, achievement.key),
    });

    if (!args.confirm) {
      return ok({
        preview: true,
        message: 'Pass confirm=true to proceed with deletion',
        achievement: { id: achievement.id, name: achievement.name, key: achievement.key },
        affectedData: { usersWithProgress: progress.length },
      });
    }

    // Delete progress records and the achievement
    await db.delete(achievementProgress).where(eq(achievementProgress.achievementKey, achievement.key));
    await db.delete(achievements).where(eq(achievements.id, args.id));
    return ok({ success: true, deletedAchievementId: args.id });
  },
});

// ══════════════════════════════════════════════
// FEATURE FLAGS
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_flags',
  description: 'List all feature flags',
  scope: 'admin',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const results = await db.query.featureFlags.findMany({
      orderBy: [desc(featureFlags.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    // Count user and group overrides for each flag
    const flagsWithCounts = await Promise.all(
      results.map(async (flag) => {
        const [userOverrides, groupOverrides] = await Promise.all([
          db.query.userFeatureFlags.findMany({ where: eq(userFeatureFlags.flagId, flag.id) }),
          db.query.groupFeatureFlags.findMany({ where: eq(groupFeatureFlags.flagId, flag.id) }),
        ]);
        return { ...flag, userOverrideCount: userOverrides.length, groupOverrideCount: groupOverrides.length };
      }),
    );

    return ok({ data: flagsWithCounts });
  },
});

defineTool({
  name: 'admin_create_flag',
  description: 'Create a new feature flag',
  scope: 'admin',
  inputSchema: z.object({
    key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    enabled: z.boolean().optional().default(false).describe('Enabled by default'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.slug, args.key) });
    if (existing) return err('A feature flag with this key already exists');

    const id = crypto.randomUUID();
    await db.insert(featureFlags).values({
      id,
      name: args.name,
      slug: args.key,
      description: args.description || null,
      enabledByDefault: args.enabled ?? false,
    });

    const created = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, id) });
    return ok({ success: true, flag: created });
  },
});

defineTool({
  name: 'admin_update_flag',
  description: 'Update a feature flag',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Feature flag ID'),
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional().describe('Enabled by default'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const existing = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, args.id) });
    if (!existing) return err('Feature flag not found');

    const updateData: Record<string, unknown> = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.enabled !== undefined) updateData.enabledByDefault = args.enabled;

    if (Object.keys(updateData).length === 0) return err('No fields to update');

    await db.update(featureFlags).set(updateData).where(eq(featureFlags.id, args.id));
    const updated = await db.query.featureFlags.findFirst({ where: eq(featureFlags.id, args.id) });
    return ok({ success: true, flag: updated });
  },
});

// ══════════════════════════════════════════════
// OAUTH ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_oauth_clients',
  description: 'List OAuth clients. OAuth clients are managed by the OAuthProvider and stored in KV.',
  scope: 'admin',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();

    return ok({
      message: 'OAuth clients are managed by @cloudflare/workers-oauth-provider and stored in KV. Use the REST API endpoints (/oauth/register, /oauth/token) to manage OAuth clients. Direct KV enumeration is not supported via MCP.',
    });
  },
});

defineTool({
  name: 'admin_oauth_stats',
  description: 'Get OAuth statistics. Returns guidance on where to find OAuth stats.',
  scope: 'admin',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();

    return ok({
      message: 'OAuth statistics are not aggregated centrally. OAuth clients and tokens are managed by @cloudflare/workers-oauth-provider via KV storage. For token counts, query the KV namespace directly or use the Cloudflare dashboard.',
    });
  },
});

// ══════════════════════════════════════════════
// WEBHOOK ADMINISTRATION
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_webhooks',
  description: 'List all registered webhooks (secrets are redacted)',
  scope: 'admin',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const results = await db.query.webhooks.findMany({
      orderBy: [desc(webhooks.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    // Redact secrets
    const redacted = results.map((w) => ({
      ...w,
      secret: '***REDACTED***',
    }));

    return ok({ data: redacted });
  },
});

// ══════════════════════════════════════════════
// GROUP CLAIMS / CREATION REQUESTS
// ══════════════════════════════════════════════

defineTool({
  name: 'admin_list_group_claims',
  description: 'List group claim requests',
  scope: 'admin',
  inputSchema: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.status) conditions.push(eq(groupClaimRequests.status, args.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.groupClaimRequests.findMany({
      where,
      orderBy: [desc(groupClaimRequests.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    // Enrich with user and group info
    const enriched = await Promise.all(
      results.map(async (r) => {
        const [user, group] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, r.userId) }),
          db.query.groups.findFirst({ where: eq(groups.id, r.groupId) }),
        ]);
        return {
          ...r,
          userName: user?.name || user?.email,
          groupName: group?.name,
        };
      }),
    );

    return ok({ data: enriched });
  },
});

defineTool({
  name: 'admin_approve_group_claim',
  description: 'Approve a group claim request, granting the user ownership of the group',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Claim request ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const claim = await db.query.groupClaimRequests.findFirst({ where: eq(groupClaimRequests.id, args.id) });
    if (!claim) return err('Claim request not found');
    if (claim.status !== 'pending') return err(`Claim request is already ${claim.status}`);

    const now = new Date().toISOString();
    await db.update(groupClaimRequests).set({
      status: 'approved',
      reviewedBy: ctx.auth.user.id,
      reviewedAt: now,
    }).where(eq(groupClaimRequests.id, args.id));

    // Grant owner role to the claiming user
    const existingMembership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, claim.groupId), eq(groupMembers.userId, claim.userId)),
    });

    if (existingMembership) {
      await db.update(groupMembers).set({ role: 'owner' }).where(eq(groupMembers.id, existingMembership.id));
    } else {
      await db.insert(groupMembers).values({
        id: crypto.randomUUID(),
        groupId: claim.groupId,
        userId: claim.userId,
        role: 'owner',
      });
    }

    return ok({ success: true, claimId: args.id, status: 'approved' });
  },
});

defineTool({
  name: 'admin_reject_group_claim',
  description: 'Reject a group claim request',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Claim request ID'),
    reason: z.string().optional().describe('Rejection reason (stored in notes)'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const claim = await db.query.groupClaimRequests.findFirst({ where: eq(groupClaimRequests.id, args.id) });
    if (!claim) return err('Claim request not found');
    if (claim.status !== 'pending') return err(`Claim request is already ${claim.status}`);

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status: 'rejected',
      reviewedBy: ctx.auth.user.id,
      reviewedAt: now,
    };
    if (args.reason) updateData.notes = args.reason;

    await db.update(groupClaimRequests).set(updateData).where(eq(groupClaimRequests.id, args.id));

    return ok({ success: true, claimId: args.id, status: 'rejected' });
  },
});

defineTool({
  name: 'admin_list_creation_requests',
  description: 'List group creation requests',
  scope: 'admin',
  inputSchema: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    limit: z.number().int().min(1).max(100).optional().default(50),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const conditions = [];
    if (args.status) conditions.push(eq(groupCreationRequests.status, args.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.groupCreationRequests.findMany({
      where,
      orderBy: [desc(groupCreationRequests.createdAt)],
      limit: args.limit,
      offset: args.offset,
    });

    // Enrich with user info
    const enriched = await Promise.all(
      results.map(async (r) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, r.userId) });
        return { ...r, userName: user?.name || user?.email };
      }),
    );

    return ok({ data: enriched });
  },
});

defineTool({
  name: 'admin_approve_creation_request',
  description: 'Approve a group creation request. Creates the group and makes the requester the owner.',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Creation request ID'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const request = await db.query.groupCreationRequests.findFirst({ where: eq(groupCreationRequests.id, args.id) });
    if (!request) return err('Creation request not found');
    if (request.status !== 'pending') return err(`Request is already ${request.status}`);

    // If the request already has a groupId, the group was already created
    if (request.groupId) return err('Group was already created for this request');

    const now = new Date().toISOString();

    // Generate a urlname from the group name
    const urlname = request.groupName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    // Check urlname uniqueness
    const existingUrlname = await db.query.groups.findFirst({ where: eq(groups.urlname, urlname) });
    if (existingUrlname) return err(`Cannot auto-generate urlname: "${urlname}" already exists. Create the group manually.`);

    // Create the group
    const groupId = crypto.randomUUID();
    await db.insert(groups).values({
      id: groupId,
      urlname,
      name: request.groupName,
      platform: 'tampa.dev',
      platformId: groupId,
      description: request.description,
      link: `https://tampa.dev/groups/${urlname}`,
      isActive: true,
      displayOnSite: false,
      isFeatured: false,
      createdAt: now,
      updatedAt: now,
    });

    // Make the requester the owner
    await db.insert(groupMembers).values({
      id: crypto.randomUUID(),
      groupId,
      userId: request.userId,
      role: 'owner',
    });

    // Update the request
    await db.update(groupCreationRequests).set({
      status: 'approved',
      reviewedBy: ctx.auth.user.id,
      reviewedAt: now,
      groupId,
    }).where(eq(groupCreationRequests.id, args.id));

    return ok({ success: true, requestId: args.id, status: 'approved', groupId, urlname });
  },
});

defineTool({
  name: 'admin_reject_creation_request',
  description: 'Reject a group creation request',
  scope: 'admin',
  inputSchema: z.object({
    id: z.string().describe('Creation request ID'),
    reason: z.string().optional().describe('Rejection reason'),
  }),
  handler: async (args, ctx) => {
    if (!isPlatformAdmin(ctx.auth.user)) return adminError();
    const db = createDatabase(ctx.env.DB);

    const request = await db.query.groupCreationRequests.findFirst({ where: eq(groupCreationRequests.id, args.id) });
    if (!request) return err('Creation request not found');
    if (request.status !== 'pending') return err(`Request is already ${request.status}`);

    const now = new Date().toISOString();
    await db.update(groupCreationRequests).set({
      status: 'rejected',
      reviewedBy: ctx.auth.user.id,
      reviewedAt: now,
    }).where(eq(groupCreationRequests.id, args.id));

    return ok({ success: true, requestId: args.id, status: 'rejected' });
  },
});
