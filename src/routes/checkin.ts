/**
 * Checkin Routes
 *
 * Management endpoints for checkin code CRUD and attendee lists,
 * plus public endpoints for the checkin flow.
 *
 * Management routes: mounted under /groups/manage/:groupId via group-management.
 * Public routes: mounted at /checkin in the main app.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  events,
  eventCheckinCodes,
  eventCheckins,
  eventRsvps,
  groups,
  users,
  GroupMemberRole,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser, requireGroupRole, requireScope } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, forbidden, notFound, conflict, gone } from '../lib/responses.js';

// ============== Helper ==============

function generateCheckinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============== Management Routes ==============

/**
 * Checkin management routes.
 * Mounted at /manage/:groupId in group-management so handlers can
 * access c.req.param('groupId').
 */
export function createCheckinManagementRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * POST /events/:eventId/checkin-codes - Generate a new checkin code
   * Requires volunteer+ role.
   */
  app.post('/events/:eventId/checkin-codes', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Parse optional body for maxUses and expiresAt
    let maxUses: number | null = null;
    let expiresAt: string | null = null;
    try {
      const body = await c.req.json();
      if (body.maxUses && typeof body.maxUses === 'number') maxUses = body.maxUses;
      if (body.expiresAt && typeof body.expiresAt === 'string') expiresAt = body.expiresAt;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const code = generateCheckinCode();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(eventCheckinCodes).values({
      id,
      eventId,
      code,
      maxUses,
      expiresAt,
      createdBy: user.id,
      createdAt: now,
    });

    const createdCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.id, id),
    });

    return created(c, createdCode);
  });

  /**
   * GET /events/:eventId/checkin-codes - List checkin codes for an event
   * Requires volunteer+ role.
   */
  app.get('/events/:eventId/checkin-codes', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    const codes = await db.query.eventCheckinCodes.findMany({
      where: eq(eventCheckinCodes.eventId, eventId),
    });

    return ok(c, codes);
  });

  /**
   * DELETE /checkin-codes/:codeId - Delete a checkin code
   * Requires manager+ role. Verifies the code belongs to an event in this group.
   */
  app.delete('/checkin-codes/:codeId', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const codeId = c.req.param('codeId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
    if (!hasRole) return forbidden(c);

    const code = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.id, codeId),
    });
    if (!code) return notFound(c, 'Checkin code not found');

    // Verify the code belongs to an event in this group
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, code.eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Checkin code not found in this group');

    await db.delete(eventCheckinCodes).where(eq(eventCheckinCodes.id, codeId));

    return success(c, { message: 'Checkin code deleted' });
  });

  /**
   * GET /events/:eventId/attendees - Attendee list with checkin status
   * Requires volunteer+ role.
   */
  app.get('/events/:eventId/attendees', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const scopeErr = requireScope(auth, 'manage:checkins', c);
    if (scopeErr) return scopeErr;
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const groupId = c.req.param('groupId');
    const eventId = c.req.param('eventId');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    if (!group) return notFound(c, 'Group not found');

    const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.VOLUNTEER, user);
    if (!hasRole) return forbidden(c);

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.groupId, groupId)),
    });
    if (!event) return notFound(c, 'Event not found');

    // Get all RSVPs (non-cancelled)
    const rsvps = await db.query.eventRsvps.findMany({
      where: eq(eventRsvps.eventId, eventId),
    });

    // Get all checkins
    const checkins = await db.query.eventCheckins.findMany({
      where: eq(eventCheckins.eventId, eventId),
    });

    const checkinMap = new Map(checkins.map((ch) => [ch.userId, ch]));

    // Enrich with user details
    const attendees = await Promise.all(
      rsvps
        .filter((r) => r.status !== 'cancelled')
        .map(async (r) => {
          const attendeeUser = await db.query.users.findFirst({
            where: eq(users.id, r.userId),
          });
          const checkin = checkinMap.get(r.userId);
          return {
            rsvpId: r.id,
            userId: r.userId,
            rsvpStatus: r.status,
            rsvpAt: r.rsvpAt,
            waitlistPosition: r.waitlistPosition,
            checkedIn: !!checkin,
            checkedInAt: checkin?.checkedInAt ?? null,
            checkinMethod: checkin?.method ?? null,
            user: attendeeUser ? {
              id: attendeeUser.id,
              name: attendeeUser.name,
              username: attendeeUser.username,
              avatarUrl: attendeeUser.avatarUrl,
            } : null,
          };
        }),
    );

    return ok(c, {
      attendees,
      totalConfirmed: rsvps.filter((r) => r.status === 'confirmed').length,
      totalWaitlisted: rsvps.filter((r) => r.status === 'waitlisted').length,
      totalCheckedIn: checkins.length,
    });
  });

  return app;
}

// ============== Public Routes ==============

/**
 * Public checkin routes.
 * Mounted at /checkin in the main app.
 */
export function createCheckinPublicRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /checkin/:code - Event info for checkin page (no auth)
   */
  app.get('/:code', async (c) => {
    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    const checkinCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.code, code),
    });

    if (!checkinCode) return notFound(c, 'Checkin code not found');

    // Check expiration
    if (checkinCode.expiresAt && new Date(checkinCode.expiresAt) < new Date()) {
      return gone(c, 'This checkin code has expired');
    }

    // Check max uses
    if (checkinCode.maxUses !== null && checkinCode.currentUses >= checkinCode.maxUses) {
      return gone(c, 'This checkin code has reached its maximum uses');
    }

    // Get event info
    const event = await db.query.events.findFirst({
      where: eq(events.id, checkinCode.eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    // Get group info
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, event.groupId),
    });

    return ok(c, {
      event: {
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        timezone: event.timezone,
        eventType: event.eventType,
        photoUrl: event.photoUrl,
      },
      group: group ? {
        id: group.id,
        name: group.name,
        urlname: group.urlname,
        photoUrl: group.photoUrl,
      } : null,
      checkinAvailable: true,
    });
  });

  /**
   * POST /checkin/:code - Check in to an event (auth required)
   * Validates code, checks uniqueness per user per event, inserts checkin,
   * increments currentUses. Emits dev.tampa.event.checkin.
   */
  app.post('/:code', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const { user } = auth;

    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    const checkinCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.code, code),
    });

    if (!checkinCode) return notFound(c, 'Checkin code not found');

    // Check expiration
    if (checkinCode.expiresAt && new Date(checkinCode.expiresAt) < new Date()) {
      return gone(c, 'This checkin code has expired');
    }

    // Check max uses
    if (checkinCode.maxUses !== null && checkinCode.currentUses >= checkinCode.maxUses) {
      return gone(c, 'This checkin code has reached its maximum uses');
    }

    // Get event
    const event = await db.query.events.findFirst({
      where: eq(events.id, checkinCode.eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    // Check uniqueness per user per event
    const existingCheckin = await db.query.eventCheckins.findFirst({
      where: and(
        eq(eventCheckins.eventId, event.id),
        eq(eventCheckins.userId, user.id),
      ),
    });
    if (existingCheckin) {
      return conflict(c, 'Already checked in to this event');
    }

    // Parse optional method from body
    let method = 'link';
    try {
      const body = await c.req.json();
      if (body.method && ['link', 'qr', 'nfc'].includes(body.method)) {
        method = body.method;
      }
    } catch {
      // No body or invalid JSON — use default
    }

    const now = new Date().toISOString();
    const checkinId = crypto.randomUUID();

    await db.insert(eventCheckins).values({
      id: checkinId,
      eventId: event.id,
      userId: user.id,
      checkinCodeId: checkinCode.id,
      method,
      checkedInAt: now,
    });

    // Atomic increment of currentUses on the checkin code
    await db.update(eventCheckinCodes).set({
      currentUses: sql`${eventCheckinCodes.currentUses} + 1`,
    }).where(eq(eventCheckinCodes.id, checkinCode.id));

    emitEvent(c, {
      type: 'dev.tampa.event.checkin',
      payload: {
        eventId: event.id,
        userId: user.id,
        checkinCodeId: checkinCode.id,
        method,
      },
      metadata: { userId: user.id, source: 'checkin' },
    });

    return created(c, {
      id: checkinId,
      eventId: event.id,
      checkedInAt: now,
      method,
    });
  });

  return app;
}

export const checkinManagementRoutes = createCheckinManagementRoutes();
export const checkinPublicRoutes = createCheckinPublicRoutes();
