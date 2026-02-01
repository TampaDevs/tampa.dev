/**
 * MCP Tools: Events
 *
 * Event-related MCP tools for listing, viewing, RSVP, and checkin.
 * Uses the RSVP service for shared business logic and emits domain
 * events via the EVENTS_QUEUE for achievements/webhooks/notifications.
 */

import { z } from 'zod';
import { eq, and, sql, gte, lte, asc, desc, like, count as drizzleCount } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  events,
  groups,
  venues,
  eventCheckinCodes,
  eventCheckins,
} from '../../db/schema.js';
import {
  getRsvpStatus,
  getRsvpSummary,
  createRsvp,
  cancelRsvp,
  RsvpError,
} from '../../services/rsvp.js';

// ── events_list ──

defineTool({
  name: 'events_list',
  description:
    'Search and list events with keyword search (title/description), location, type, and date filters. ' +
    'Supports sorting by start time, title, or RSVP count with flexible direction. ' +
    'Returns paginated results with total count.',
  scope: 'read:events',
  inputSchema: z.object({
    search: z.string().max(200).optional().describe('Keyword search on event title or description (substring match)'),
    group_slug: z.string().optional().describe('Filter by group URL slug (urlname)'),
    city: z.string().max(100).optional().describe('Filter by venue city (substring match)'),
    event_type: z.enum(['physical', 'online', 'hybrid']).optional().describe('Filter by event type'),
    featured: z.boolean().optional().describe('Filter by featured status'),
    after: z.string().optional().describe('ISO 8601 datetime — only events starting at or after this time'),
    before: z.string().optional().describe('ISO 8601 datetime — only events starting at or before this time'),
    status: z.enum(['active', 'cancelled', 'draft']).optional().describe('Filter by event status'),
    sort: z.enum(['start_time', 'title', 'rsvp_count']).optional().default('start_time').describe('Sort field'),
    direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc for start_time/title, desc for rsvp_count)'),
    limit: z.number().int().min(1).max(100).optional().default(25).describe('Max results to return (1-100, default 25)'),
    offset: z.number().int().min(0).optional().default(0).describe('Number of results to skip'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    // Resolve sort direction default based on sort field
    const sortField = args.sort ?? 'start_time';
    const sortDir = args.direction ?? (sortField === 'rsvp_count' ? 'desc' : 'asc');

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (args.search && args.search.trim().length > 0) {
      const searchTerm = `%${args.search.trim()}%`;
      conditions.push(sql`(${events.title} LIKE ${searchTerm} OR ${events.description} LIKE ${searchTerm})` as any);
    }

    if (args.group_slug) {
      const group = await db.query.groups.findFirst({
        where: eq(groups.urlname, args.group_slug),
      });
      if (!group) {
        return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
      }
      conditions.push(eq(events.groupId, group.id));
    }

    if (args.city && args.city.trim().length > 0) {
      conditions.push(like(venues.city, `%${args.city.trim()}%`) as any);
    }

    if (args.event_type) {
      conditions.push(eq(events.eventType, args.event_type));
    }

    if (args.featured !== undefined) {
      conditions.push(eq(events.isFeatured, args.featured));
    }

    if (args.after) {
      conditions.push(gte(events.startTime, args.after));
    }

    if (args.before) {
      conditions.push(lte(events.startTime, args.before));
    }

    if (args.status) {
      conditions.push(eq(events.status, args.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Dynamic ORDER BY — safe because values come from validated enum
    const orderByClause = sortField === 'title'
      ? (sortDir === 'asc' ? [asc(events.title)] : [desc(events.title)])
      : sortField === 'rsvp_count'
        ? (sortDir === 'asc' ? [asc(events.rsvpCount)] : [desc(events.rsvpCount)])
        : (sortDir === 'asc' ? [asc(events.startTime)] : [desc(events.startTime)]);

    // Main data query
    const eventRows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventUrl: events.eventUrl,
        photoUrl: events.photoUrl,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        status: events.status,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        isFeatured: events.isFeatured,
        groupId: events.groupId,
        groupName: groups.name,
        groupUrlname: groups.urlname,
        groupPhotoUrl: groups.photoUrl,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
        venueState: venues.state,
        venueLatitude: venues.latitude,
        venueLongitude: venues.longitude,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(args.limit)
      .offset(args.offset);

    // Count query (same filters, no pagination)
    const [countRow] = await db
      .select({ total: drizzleCount() })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(whereClause);
    const total = countRow?.total ?? 0;

    const entries = eventRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      eventUrl: row.eventUrl,
      photoUrl: row.photoUrl,
      startTime: row.startTime,
      endTime: row.endTime,
      timezone: row.timezone,
      status: row.status,
      eventType: row.eventType,
      rsvpCount: row.rsvpCount,
      maxAttendees: row.maxAttendees,
      isFeatured: row.isFeatured,
      group: {
        id: row.groupId,
        name: row.groupName,
        urlname: row.groupUrlname,
        photoUrl: row.groupPhotoUrl,
      },
      venue: row.venueName
        ? {
            name: row.venueName,
            address: row.venueAddress,
            city: row.venueCity,
            state: row.venueState,
            latitude: row.venueLatitude,
            longitude: row.venueLongitude,
          }
        : null,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          entries,
          total,
          limit: args.limit,
          offset: args.offset,
          hasMore: (args.offset + entries.length) < total,
        }),
      }],
    };
  },
});

// ── events_get ──

defineTool({
  name: 'events_get',
  description: 'Get a single event by ID, including venue and group data.',
  scope: 'read:events',
  inputSchema: z.object({
    event_id: z.string().describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventUrl: events.eventUrl,
        photoUrl: events.photoUrl,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        status: events.status,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        groupId: events.groupId,
        groupName: groups.name,
        groupUrlname: groups.urlname,
        groupPhotoUrl: groups.photoUrl,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
        venueState: venues.state,
        venueLatitude: venues.latitude,
        venueLongitude: venues.longitude,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, args.event_id))
      .limit(1);

    if (rows.length === 0) {
      return { content: [{ type: 'text', text: 'Error: Event not found' }], isError: true };
    }

    const row = rows[0];
    const result = {
      id: row.id,
      title: row.title,
      description: row.description,
      eventUrl: row.eventUrl,
      photoUrl: row.photoUrl,
      startTime: row.startTime,
      endTime: row.endTime,
      timezone: row.timezone,
      status: row.status,
      eventType: row.eventType,
      rsvpCount: row.rsvpCount,
      maxAttendees: row.maxAttendees,
      group: {
        id: row.groupId,
        name: row.groupName,
        urlname: row.groupUrlname,
        photoUrl: row.groupPhotoUrl,
      },
      venue: row.venueName
        ? {
            name: row.venueName,
            address: row.venueAddress,
            city: row.venueCity,
            state: row.venueState,
            latitude: row.venueLatitude,
            longitude: row.venueLongitude,
          }
        : null,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── events_rsvp_status ──

defineTool({
  name: 'events_rsvp_status',
  description: 'Get the authenticated user\'s RSVP status for a specific event.',
  scope: 'read:events',
  inputSchema: z.object({
    event_id: z.string().describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await getRsvpStatus(db, ctx.auth.user.id, args.event_id);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      if (error instanceof RsvpError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});

// ── events_rsvp_summary ──

defineTool({
  name: 'events_rsvp_summary',
  description: 'Get RSVP summary counts (confirmed, waitlisted, capacity) for an event.',
  scope: 'read:events',
  inputSchema: z.object({
    event_id: z.string().describe('The event ID'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await getRsvpSummary(db, args.event_id);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      if (error instanceof RsvpError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});

// ── events_rsvp ──

defineTool({
  name: 'events_rsvp',
  description: 'RSVP to an event for the authenticated user. Handles capacity checks and waitlisting.',
  scope: 'write:events',
  inputSchema: z.object({
    event_id: z.string().describe('The event ID to RSVP to'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await createRsvp(db, ctx.auth.user.id, args.event_id);

      // Emit domain events for achievements/webhooks/notifications
      for (const event of result.events) {
        ctx.executionCtx.waitUntil(
          ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            rsvpId: result.rsvp.id,
            eventId: result.rsvp.eventId,
            status: result.rsvp.status,
            waitlistPosition: result.rsvp.waitlistPosition,
            rsvpAt: result.rsvp.rsvpAt,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof RsvpError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});

// ── events_cancel_rsvp ──

defineTool({
  name: 'events_cancel_rsvp',
  description: 'Cancel the authenticated user\'s RSVP to an event. May promote the next waitlisted user.',
  scope: 'write:events',
  inputSchema: z.object({
    event_id: z.string().describe('The event ID to cancel RSVP for'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await cancelRsvp(db, ctx.auth.user.id, args.event_id);

      // Emit domain events for achievements/webhooks/notifications
      for (const event of result.events) {
        ctx.executionCtx.waitUntil(
          ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            cancelled: true,
            promotedUserId: result.promotedUserId,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof RsvpError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});

// ── events_checkin ──

defineTool({
  name: 'events_checkin',
  description: 'Check in to an event using a checkin code. Validates the code, checks expiration and usage limits, and records the checkin.',
  scope: 'write:events',
  inputSchema: z.object({
    code: z.string().describe('The checkin code (e.g., "A3B7KF2N")'),
    method: z.enum(['link', 'qr', 'nfc']).optional().default('link').describe('Checkin method (default: "link")'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;

    // Look up the checkin code
    const checkinCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.code, args.code),
    });

    if (!checkinCode) {
      return { content: [{ type: 'text', text: 'Error: Checkin code not found' }], isError: true };
    }

    // Check expiration
    if (checkinCode.expiresAt && new Date(checkinCode.expiresAt) < new Date()) {
      return { content: [{ type: 'text', text: 'Error: This checkin code has expired' }], isError: true };
    }

    // Check max uses
    if (checkinCode.maxUses !== null && checkinCode.currentUses >= checkinCode.maxUses) {
      return { content: [{ type: 'text', text: 'Error: This checkin code has reached its maximum uses' }], isError: true };
    }

    // Get the event
    const event = await db.query.events.findFirst({
      where: eq(events.id, checkinCode.eventId),
    });
    if (!event) {
      return { content: [{ type: 'text', text: 'Error: Event not found' }], isError: true };
    }

    if (event.status === 'cancelled') {
      return { content: [{ type: 'text', text: 'Error: Event has been cancelled' }], isError: true };
    }

    // Check uniqueness per user per event
    const existingCheckin = await db.query.eventCheckins.findFirst({
      where: and(
        eq(eventCheckins.eventId, event.id),
        eq(eventCheckins.userId, userId),
      ),
    });
    if (existingCheckin) {
      return { content: [{ type: 'text', text: 'Error: Already checked in to this event' }], isError: true };
    }

    // Record the checkin
    const now = new Date().toISOString();
    const checkinId = crypto.randomUUID();

    await db.insert(eventCheckins).values({
      id: checkinId,
      eventId: event.id,
      userId,
      checkinCodeId: checkinCode.id,
      method: args.method,
      checkedInAt: now,
    });

    // Atomic increment of currentUses
    await db
      .update(eventCheckinCodes)
      .set({ currentUses: sql`${eventCheckinCodes.currentUses} + 1` })
      .where(eq(eventCheckinCodes.id, checkinCode.id));

    // Emit checkin domain event
    ctx.executionCtx.waitUntil(
      ctx.env.EVENTS_QUEUE.send({
        type: 'dev.tampa.event.checkin',
        payload: {
          eventId: event.id,
          userId,
          checkinCodeId: checkinCode.id,
          method: args.method,
        },
        metadata: { userId, source: 'checkin' },
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: checkinId,
          eventId: event.id,
          checkedInAt: now,
          method: args.method,
        }),
      }],
    };
  },
});
