/**
 * Event Management Routes
 *
 * Endpoints for group managers to create, update, and cancel native events.
 * All events created here use platform: 'tampa.dev'.
 *
 * Mounted under /groups/manage/:groupId/events via group-management.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  events,
  venues,
  eventCheckinCodes,
  eventRsvps,
  eventCheckins,
  groups,
  EventPlatform,
  EventStatus,
  GroupMemberRole,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireScope, requireGroupRole, isPlatformAdmin } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, forbidden, notFound, badRequest } from '../lib/responses.js';

// ============== Validation Schemas ==============

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  startTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date'),
  endTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional(),
  timezone: z.string().default('America/New_York'),
  eventType: z.enum(['physical', 'online', 'hybrid']).default('physical'),
  maxAttendees: z.number().int().positive().optional(),
  venue: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  photoUrl: z.string().url().optional(),
  status: z.enum(['active', 'draft']).default('active'),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  startTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional(),
  endTime: z.string().refine((s) => !isNaN(Date.parse(s)), 'Must be a valid ISO 8601 date').optional().nullable(),
  timezone: z.string().optional(),
  eventType: z.enum(['physical', 'online', 'hybrid']).optional(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  venue: z.object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  status: z.enum(['active', 'draft']).optional(),
});

// ============== Helper ==============

function generateCheckinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

// ============== Routes ==============

export function createEventManagementRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /groups/manage/:groupId/events - List events for a managed group
   * Requires manager+ role. Includes drafts and RSVP/checkin counts.
   */
  app.get('/', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, groupId),
      orderBy: [desc(events.startTime)],
    });

    // Fetch RSVP and checkin counts for each event
    const eventsWithCounts = await Promise.all(
      groupEvents.map(async (event) => {
        const allRsvps = await db.query.eventRsvps.findMany({
          where: eq(eventRsvps.eventId, event.id),
        });
        const checkins = await db.query.eventCheckins.findMany({
          where: eq(eventCheckins.eventId, event.id),
        });
        return {
          ...event,
          rsvpSummary: {
            confirmed: allRsvps.filter((r) => r.status === 'confirmed').length,
            waitlisted: allRsvps.filter((r) => r.status === 'waitlisted').length,
            cancelled: allRsvps.filter((r) => r.status === 'cancelled').length,
          },
          checkinCount: checkins.length,
        };
      }),
    );

    return ok(c, eventsWithCounts);
  });

  /**
   * GET /groups/manage/:groupId/events/:eventId - Event detail with attendee stats
   * Requires manager+ role.
   */
  app.get('/:eventId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Get venue info
    let venue = null;
    if (event.venueId) {
      venue = await db.query.venues.findFirst({
        where: eq(venues.id, event.venueId),
      });
    }

    // Get RSVP counts by status
    const allRsvps = await db.query.eventRsvps.findMany({
      where: eq(eventRsvps.eventId, eventId),
    });
    const confirmedCount = allRsvps.filter((r) => r.status === 'confirmed').length;
    const waitlistedCount = allRsvps.filter((r) => r.status === 'waitlisted').length;
    const cancelledCount = allRsvps.filter((r) => r.status === 'cancelled').length;

    // Get checkin count
    const checkins = await db.query.eventCheckins.findMany({
      where: eq(eventCheckins.eventId, eventId),
    });

    // Get checkin codes
    const codes = await db.query.eventCheckinCodes.findMany({
      where: eq(eventCheckinCodes.eventId, eventId),
    });

    return ok(c, {
      ...event,
      venue,
      rsvpSummary: {
        confirmed: confirmedCount,
        waitlisted: waitlistedCount,
        cancelled: cancelledCount,
      },
      checkinCount: checkins.length,
      checkinCodes: codes,
    });
  });

  /**
   * POST /groups/manage/:groupId/events - Create a native event
   * Requires manager+ role. Sets platform to 'tampa.dev'.
   * Auto-generates one checkin code.
   */
  app.post('/', zValidator('json', createEventSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
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

    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create or find venue if provided
    let venueId: string | null = null;
    if (data.venue && data.eventType !== 'online') {
      const venueRecord = {
        id: crypto.randomUUID(),
        name: data.venue.name,
        address: data.venue.address || null,
        city: data.venue.city || null,
        state: data.venue.state || null,
        postalCode: data.venue.postalCode || null,
        country: data.venue.country || null,
        latitude: data.venue.latitude ?? null,
        longitude: data.venue.longitude ?? null,
        isOnline: false,
        platform: EventPlatform.TAMPA_DEV,
        createdAt: now,
      };
      await db.insert(venues).values(venueRecord);
      venueId = venueRecord.id;
    }

    const duration = computeDuration(data.startTime, data.endTime);

    await db.insert(events).values({
      id: eventId,
      platform: EventPlatform.TAMPA_DEV,
      platformId: eventId,
      groupId,
      venueId,
      title: data.title,
      description: data.description || null,
      eventUrl: `https://events.tampa.dev/events/${eventId}`,
      photoUrl: data.photoUrl || null,
      startTime: data.startTime,
      endTime: data.endTime || null,
      timezone: data.timezone,
      duration,
      status: data.status,
      eventType: data.eventType,
      maxAttendees: data.maxAttendees ?? null,
      createdBy: user.id,
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-generate one checkin code
    const checkinCode = generateCheckinCode();
    await db.insert(eventCheckinCodes).values({
      id: crypto.randomUUID(),
      eventId,
      code: checkinCode,
      createdBy: user.id,
      createdAt: now,
    });

    const createdEvent = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    emitEvent(c, {
      type: 'dev.tampa.event.created',
      payload: {
        eventId,
        groupId,
        title: data.title,
        startTime: data.startTime,
        createdBy: user.id,
      },
      metadata: { userId: user.id, source: 'event-management' },
    });

    return created(c, { event: createdEvent, checkinCode });
  });

  /**
   * PUT /groups/manage/:groupId/events/:eventId - Update a native event
   * Requires manager+ role.
   */
  app.put('/:eventId', zValidator('json', updateEventSchema), async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');
    const data = c.req.valid('json');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Only allow editing native events
    if (event.platform !== EventPlatform.TAMPA_DEV) {
      return badRequest(c, 'Cannot edit synced events');
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.eventType !== undefined) updateData.eventType = data.eventType;
    if (data.maxAttendees !== undefined) updateData.maxAttendees = data.maxAttendees;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.status !== undefined) updateData.status = data.status;

    // Recalculate duration if start or end time changed
    const startTime = data.startTime ?? event.startTime;
    const endTime = data.endTime !== undefined ? data.endTime : event.endTime;
    updateData.duration = computeDuration(startTime, endTime);

    // Handle venue updates
    if (data.venue !== undefined) {
      if (data.venue === null) {
        updateData.venueId = null;
      } else {
        const venueRecord = {
          id: crypto.randomUUID(),
          name: data.venue.name,
          address: data.venue.address || null,
          city: data.venue.city || null,
          state: data.venue.state || null,
          postalCode: data.venue.postalCode || null,
          country: data.venue.country || null,
          latitude: data.venue.latitude ?? null,
          longitude: data.venue.longitude ?? null,
          isOnline: false,
          platform: EventPlatform.TAMPA_DEV,
          createdAt: now,
        };
        await db.insert(venues).values(venueRecord);
        updateData.venueId = venueRecord.id;
      }
    }

    // Update eventUrl if it's a native event (reflects the canonical URL)
    updateData.eventUrl = `https://events.tampa.dev/events/${eventId}`;

    await db.update(events).set(updateData).where(eq(events.id, eventId));

    const updated = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    emitEvent(c, {
      type: 'dev.tampa.event.updated',
      payload: {
        eventId,
        groupId,
        fields: Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined),
        updatedBy: user.id,
      },
      metadata: { userId: user.id, source: 'event-management' },
    });

    return ok(c, updated);
  });

  /**
   * POST /groups/manage/:groupId/events/:eventId/cancel - Cancel an event
   * Requires manager+ role. Sets status to 'cancelled'.
   */
  app.post('/:eventId/cancel', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:events', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    if (event.platform !== EventPlatform.TAMPA_DEV) {
      return badRequest(c, 'Cannot cancel synced events');
    }

    if (event.status === EventStatus.CANCELLED) {
      return badRequest(c, 'Event is already cancelled');
    }

    await db.update(events)
      .set({ status: EventStatus.CANCELLED, updatedAt: new Date().toISOString() })
      .where(eq(events.id, eventId));

    emitEvent(c, {
      type: 'dev.tampa.event.cancelled',
      payload: {
        eventId,
        groupId,
        title: event.title,
        cancelledBy: user.id,
      },
      metadata: { userId: user.id, source: 'event-management' },
    });

    return success(c, { message: 'Event cancelled' });
  });

  return app;
}

export const eventManagementRoutes = createEventManagementRoutes();
