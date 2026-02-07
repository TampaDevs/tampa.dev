/**
 * MCP Tools: Checkin Management
 *
 * Tools for creating/listing/deleting checkin codes and viewing attendees.
 * All tools require the `manage:checkins` scope and appropriate group roles.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  events,
  eventCheckinCodes,
  eventCheckins,
  users,
  GroupMemberRole,
} from '../../db/schema.js';
import { requireGroupRole } from '../../lib/auth.js';

// ── Helper ──

function generateCheckinCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── manage_create_checkin_code ──

defineTool({
  name: 'manage_create_checkin_code',
  description: 'Generate a new checkin code for an event. Requires volunteer+ role.',
  scope: 'manage:checkins',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    eventId: z.string().min(1).describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, eventId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    // Verify event exists and belongs to group
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found in this group' }], isError: true };
    }

    const code = generateCheckinCode();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(eventCheckinCodes).values({
      id,
      eventId,
      code,
      maxUses: null,
      currentUses: 0,
      expiresAt: null,
      createdBy: ctx.auth.user.id,
      createdAt: now,
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.checkin.code_created',
        payload: { eventId, groupId, codeId: id },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ id, eventId, code, maxUses: null, currentUses: 0, expiresAt: null, createdAt: now }),
      }],
    };
  },
});

// ── manage_list_checkin_codes ──

defineTool({
  name: 'manage_list_checkin_codes',
  description: 'List all checkin codes for an event. Requires volunteer+ role.',
  scope: 'manage:checkins',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    eventId: z.string().min(1).describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, eventId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    // Verify event belongs to group
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found in this group' }], isError: true };
    }

    const codes = await db
      .select()
      .from(eventCheckinCodes)
      .where(eq(eventCheckinCodes.eventId, eventId));

    return { content: [{ type: 'text', text: JSON.stringify(codes) }] };
  },
});

// ── manage_delete_checkin_code ──

defineTool({
  name: 'manage_delete_checkin_code',
  description: 'Delete a checkin code. Requires manager+ role.',
  scope: 'manage:checkins',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    codeId: z.string().min(1).describe('The checkin code record ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, codeId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Look up the code and verify it belongs to an event in this group
    const codeRecord = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.id, codeId),
    });
    if (!codeRecord) {
      return { content: [{ type: 'text', text: 'Error: Checkin code not found' }], isError: true };
    }

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, codeRecord.eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Checkin code does not belong to an event in this group' }], isError: true };
    }

    await db.delete(eventCheckinCodes).where(eq(eventCheckinCodes.id, codeId));

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, codeId }) }] };
  },
});

// ── manage_list_attendees ──

defineTool({
  name: 'manage_list_attendees',
  description: 'List checked-in attendees for an event. Requires volunteer+ role.',
  scope: 'manage:checkins',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    eventId: z.string().min(1).describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, eventId } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    // Verify event belongs to group
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found in this group' }], isError: true };
    }

    const attendees = await db
      .select({
        checkinId: eventCheckins.id,
        userId: eventCheckins.userId,
        method: eventCheckins.method,
        checkedInAt: eventCheckins.checkedInAt,
        userName: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(eventCheckins)
      .innerJoin(users, eq(users.id, eventCheckins.userId))
      .where(eq(eventCheckins.eventId, eventId));

    return { content: [{ type: 'text', text: JSON.stringify(attendees) }] };
  },
});
