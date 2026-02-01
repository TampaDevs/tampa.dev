/**
 * MCP Tools: Group Management
 *
 * Tools for managing groups, members, and settings via MCP.
 * All tools require the `manage:groups` scope and appropriate group roles.
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { groups, groupMembers, users, GroupMemberRole } from '../../db/schema.js';
import { requireGroupRole, hasMinRole } from '../../lib/auth.js';

// ── manage_list_groups ──

defineTool({
  name: 'manage_list_groups',
  description: 'List groups where the authenticated user is a member. Returns group details and user role for each.',
  scope: 'manage:groups',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const memberships = await db
      .select({
        groupId: groupMembers.groupId,
        role: groupMembers.role,
        group: groups,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, ctx.auth.user.id))
      .orderBy(desc(groupMembers.createdAt));

    const result = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      urlname: m.group.urlname,
      description: m.group.description,
      website: m.group.website,
      memberCount: m.group.memberCount,
      photoUrl: m.group.photoUrl,
      tags: m.group.tags ? JSON.parse(m.group.tags) : null,
      socialLinks: m.group.socialLinks ? JSON.parse(m.group.socialLinks) : null,
      role: m.role,
    }));

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── manage_get_group ──

defineTool({
  name: 'manage_get_group',
  description: 'Get detailed information about a group including member count and your role. Requires volunteer+ role.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId } = args;

    const { hasRole, member } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) {
      return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
    }

    const memberCountResult = await db
      .select({ count: groupMembers.id })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const result = {
      ...group,
      tags: group.tags ? JSON.parse(group.tags) : null,
      socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      totalMembers: memberCountResult.length,
      userRole: member?.role ?? null,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── manage_update_group ──

defineTool({
  name: 'manage_update_group',
  description: 'Update group settings such as name, description, website, social links, and tags. Requires manager+ role.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    name: z.string().min(1).max(200).optional().describe('Group display name'),
    description: z.string().max(5000).optional().describe('Group description'),
    website: z.string().url().optional().describe('Group website URL'),
    socialLinks: z.object({
      slack: z.string().url().optional(),
      discord: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      github: z.string().url().optional(),
      meetup: z.string().url().optional(),
    }).optional().describe('Social media links'),
    tags: z.array(z.string()).optional().describe('Array of tag strings'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, ...updates } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) {
      return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
    }

    const setValues: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.website !== undefined) setValues.website = updates.website;
    if (updates.socialLinks !== undefined) setValues.socialLinks = JSON.stringify(updates.socialLinks);
    if (updates.tags !== undefined) setValues.tags = JSON.stringify(updates.tags);

    await db.update(groups).set(setValues).where(eq(groups.id, groupId));

    const updated = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.group.updated',
        payload: { groupId, changes: Object.keys(updates) },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...updated,
          tags: updated?.tags ? JSON.parse(updated.tags) : null,
          socialLinks: updated?.socialLinks ? JSON.parse(updated.socialLinks) : null,
        }),
      }],
    };
  },
});

// ── manage_list_members ──

defineTool({
  name: 'manage_list_members',
  description: 'List all members of a group with their roles. Requires volunteer+ role.',
  scope: 'manage:groups',
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

    const members = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        createdAt: groupMembers.createdAt,
        userName: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(groupMembers.createdAt);

    return { content: [{ type: 'text', text: JSON.stringify(members) }] };
  },
});

// ── manage_add_member ──

defineTool({
  name: 'manage_add_member',
  description: 'Add a user as a member of a group. Requires manager+ role.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    userId: z.string().min(1).describe('The user ID to add'),
    role: z.enum(['member', 'volunteer', 'manager', 'owner']).default('member').describe('Role to assign'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, userId, role } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Verify user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!targetUser) {
      return { content: [{ type: 'text', text: 'Error: User not found' }], isError: true };
    }

    // Check if already a member
    const existing = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    });
    if (existing) {
      return { content: [{ type: 'text', text: 'Error: User is already a member of this group' }], isError: true };
    }

    const id = crypto.randomUUID();
    await db.insert(groupMembers).values({
      id,
      groupId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.group.member_added',
        payload: { groupId, userId, role },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ id, groupId, userId, role }) }] };
  },
});

// ── manage_update_member_role ──

defineTool({
  name: 'manage_update_member_role',
  description: 'Update the role of an existing group member. Requires manager+ role. Only owners can promote to manager or owner.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    memberId: z.string().min(1).describe('The group membership record ID'),
    role: z.enum(['member', 'volunteer', 'manager', 'owner']).describe('New role to assign'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, memberId, role } = args;

    const { hasRole, member: callerMember } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Promoting to manager or owner requires owner role
    if ((role === 'manager' || role === 'owner') && callerMember && !hasMinRole(callerMember.role, GroupMemberRole.OWNER)) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - only owners can promote to manager or owner' }], isError: true };
    }

    const targetMember = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!targetMember) {
      return { content: [{ type: 'text', text: 'Error: Member not found' }], isError: true };
    }

    await db.update(groupMembers).set({ role }).where(eq(groupMembers.id, memberId));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.group.member_role_changed',
        payload: { groupId, userId: targetMember.userId, oldRole: targetMember.role, newRole: role },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ memberId, groupId, userId: targetMember.userId, role }) }] };
  },
});

// ── manage_remove_member ──

defineTool({
  name: 'manage_remove_member',
  description: 'Remove a member from a group. Requires manager+ role.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    memberId: z.string().min(1).describe('The group membership record ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, memberId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const targetMember = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.id, memberId), eq(groupMembers.groupId, groupId)),
    });
    if (!targetMember) {
      return { content: [{ type: 'text', text: 'Error: Member not found' }], isError: true };
    }

    // Prevent removing yourself via this tool (use manage_leave_group instead)
    if (targetMember.userId === ctx.auth.user.id) {
      return { content: [{ type: 'text', text: 'Error: Cannot remove yourself. Use manage_leave_group instead.' }], isError: true };
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, memberId));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.group.member_removed',
        payload: { groupId, userId: targetMember.userId },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, memberId, groupId }) }] };
  },
});

// ── manage_leave_group ──

defineTool({
  name: 'manage_leave_group',
  description: 'Leave a group. Any member can leave. Deletes own membership record.',
  scope: 'manage:groups',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID to leave'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId } = args;

    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, ctx.auth.user.id),
      ),
    });
    if (!membership) {
      return { content: [{ type: 'text', text: 'Error: You are not a member of this group' }], isError: true };
    }

    await db.delete(groupMembers).where(eq(groupMembers.id, membership.id));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.group.member_left',
        payload: { groupId, userId: ctx.auth.user.id },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, groupId }) }] };
  },
});
