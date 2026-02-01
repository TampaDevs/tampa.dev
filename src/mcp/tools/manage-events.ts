/**
 * MCP Tools: Event Management
 *
 * Tools for creating, updating, listing, and cancelling events within groups.
 * All tools require the `manage:events` scope and appropriate group roles.
 */

import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { events, eventRsvps, groups, GroupMemberRole, EventPlatform } from '../../db/schema.js';
import { requireGroupRole } from '../../lib/auth.js';

// ── Helper ──

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

// ── manage_list_events ──

defineTool({
  name: 'manage_list_events',
  description: 'List events for a group with optional status filter and pagination. Requires volunteer+ role.',
  scope: 'manage:events',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    limit: z.number().int().min(1).max(100).default(25).describe('Max number of events to return'),
    offset: z.number().int().min(0).default(0).describe('Number of events to skip'),
    status: z.enum(['active', 'cancelled', 'draft']).optional().describe('Filter by event status'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, limit, offset, status } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.VOLUNTEER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires volunteer+ role in this group' }], isError: true };
    }

    const conditions = [eq(events.groupId, groupId)];
    if (status) {
      conditions.push(eq(events.status, status));
    }

    const eventList = await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.startTime))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(and(...conditions));

    const result = {
      events: eventList,
      pagination: {
        total: total[0]?.count ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (total[0]?.count ?? 0),
      },
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── manage_get_event ──

defineTool({
  name: 'manage_get_event',
  description: 'Get detailed information about an event including RSVP count. Requires volunteer+ role.',
  scope: 'manage:events',
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

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found' }], isError: true };
    }

    const rsvpCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'confirmed')));

    const result = {
      ...event,
      confirmedRsvps: rsvpCount[0]?.count ?? 0,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── manage_create_event ──

defineTool({
  name: 'manage_create_event',
  description: 'Create a new event in a group. Requires manager+ role. Events are created with platform "tampa.dev".',
  scope: 'manage:events',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    title: z.string().min(1).max(200).describe('Event title'),
    description: z.string().max(10000).optional().describe('Event description'),
    startTime: z.string().describe('Event start time in ISO 8601 format'),
    endTime: z.string().optional().describe('Event end time in ISO 8601 format'),
    timezone: z.string().default('America/New_York').describe('IANA timezone string'),
    eventType: z.enum(['physical', 'online', 'hybrid']).default('physical').describe('Type of event'),
    maxAttendees: z.number().int().positive().optional().describe('Maximum number of attendees'),
    eventUrl: z.string().url().optional().describe('External URL for the event'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, title, description, startTime, endTime, timezone, eventType, maxAttendees, eventUrl } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    // Validate the group exists
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) {
      return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
    }

    // Validate start time
    if (isNaN(Date.parse(startTime))) {
      return { content: [{ type: 'text', text: 'Error: Invalid startTime - must be a valid ISO 8601 date' }], isError: true };
    }
    if (endTime && isNaN(Date.parse(endTime))) {
      return { content: [{ type: 'text', text: 'Error: Invalid endTime - must be a valid ISO 8601 date' }], isError: true };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const duration = computeDuration(startTime, endTime);
    const resolvedEventUrl = eventUrl || `https://events.tampa.dev/events/${id}`;

    await db.insert(events).values({
      id,
      platform: EventPlatform.TAMPA_DEV,
      platformId: id,
      groupId,
      title,
      description: description ?? null,
      eventUrl: resolvedEventUrl,
      startTime,
      endTime: endTime ?? null,
      timezone,
      duration,
      status: 'active',
      eventType,
      maxAttendees: maxAttendees ?? null,
      rsvpCount: 0,
      isFeatured: false,
      createdBy: ctx.auth.user.id,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.query.events.findFirst({
      where: eq(events.id, id),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.event.created',
        payload: { eventId: id, groupId, title },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify(created) }] };
  },
});

// ── manage_update_event ──

defineTool({
  name: 'manage_update_event',
  description: 'Update an existing event. Requires manager+ role.',
  scope: 'manage:events',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    eventId: z.string().min(1).describe('The event ID'),
    title: z.string().min(1).max(200).optional().describe('Event title'),
    description: z.string().max(10000).optional().describe('Event description'),
    startTime: z.string().optional().describe('Event start time in ISO 8601 format'),
    endTime: z.string().optional().describe('Event end time in ISO 8601 format'),
    timezone: z.string().optional().describe('IANA timezone string'),
    eventType: z.enum(['physical', 'online', 'hybrid']).optional().describe('Type of event'),
    maxAttendees: z.number().int().positive().optional().describe('Maximum number of attendees'),
    eventUrl: z.string().url().optional().describe('External URL for the event'),
    status: z.enum(['active', 'draft']).optional().describe('Event status'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, eventId, ...updates } = args;

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found' }], isError: true };
    }

    const setValues: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.title !== undefined) setValues.title = updates.title;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.startTime !== undefined) {
      if (isNaN(Date.parse(updates.startTime))) {
        return { content: [{ type: 'text', text: 'Error: Invalid startTime' }], isError: true };
      }
      setValues.startTime = updates.startTime;
    }
    if (updates.endTime !== undefined) {
      if (isNaN(Date.parse(updates.endTime))) {
        return { content: [{ type: 'text', text: 'Error: Invalid endTime' }], isError: true };
      }
      setValues.endTime = updates.endTime;
    }
    if (updates.timezone !== undefined) setValues.timezone = updates.timezone;
    if (updates.eventType !== undefined) setValues.eventType = updates.eventType;
    if (updates.maxAttendees !== undefined) setValues.maxAttendees = updates.maxAttendees;
    if (updates.eventUrl !== undefined) setValues.eventUrl = updates.eventUrl;
    if (updates.status !== undefined) setValues.status = updates.status;

    // Recompute duration if start or end time changed
    const finalStartTime = (setValues.startTime as string) ?? event.startTime;
    const finalEndTime = (setValues.endTime as string) ?? event.endTime;
    setValues.duration = computeDuration(finalStartTime, finalEndTime);

    await db.update(events).set(setValues).where(eq(events.id, eventId));

    const updated = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.event.updated',
        payload: { eventId, groupId, changes: Object.keys(updates) },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify(updated) }] };
  },
});

// ── manage_cancel_event ──

defineTool({
  name: 'manage_cancel_event',
  description: 'Cancel an event by setting its status to "cancelled". Requires manager+ role. Pass confirm=true to proceed.',
  scope: 'manage:events',
  inputSchema: z.object({
    groupId: z.string().min(1).describe('The group ID'),
    eventId: z.string().min(1).describe('The event ID'),
    confirm: z.boolean().describe('Must be true to confirm cancellation'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const { groupId, eventId, confirm } = args;

    if (!confirm) {
      return { content: [{ type: 'text', text: 'Error: You must pass confirm=true to cancel an event' }], isError: true };
    }

    const { hasRole } = await requireGroupRole(db, ctx.auth.user.id, groupId, GroupMemberRole.MANAGER, ctx.auth.user);
    if (!hasRole) {
      return { content: [{ type: 'text', text: 'Error: Forbidden - requires manager+ role in this group' }], isError: true };
    }

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found' }], isError: true };
    }

    if (event.status === 'cancelled') {
      return { content: [{ type: 'text', text: 'Error: Event is already cancelled' }], isError: true };
    }

    await db.update(events).set({
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    }).where(eq(events.id, eventId));

    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.event.cancelled',
        payload: { eventId, groupId, title: event.title },
        metadata: { userId: ctx.auth.user.id, source: 'mcp' },
        timestamp: new Date().toISOString(),
      }),
    );

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, eventId, status: 'cancelled' }) }] };
  },
});
