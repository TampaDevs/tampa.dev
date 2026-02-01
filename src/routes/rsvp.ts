/**
 * RSVP Routes
 *
 * Endpoints for event RSVPs with capacity limits and waitlist management.
 * When a confirmed user cancels with waitlisted users, the next waitlisted
 * user is automatically promoted.
 */

import { Hono } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  events,
  eventRsvps,
  users,
} from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getCurrentUser } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, created, success, unauthorized, notFound, badRequest, conflict } from '../lib/responses.js';

export function createRsvpRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /events/:eventId/rsvp - Current user's RSVP status
   */
  app.get('/:eventId/rsvp', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const eventId = c.req.param('eventId');

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    const rsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, user.id),
      ),
    });

    return ok(c, { rsvp: rsvp ?? null });
  });

  /**
   * GET /events/:eventId/rsvp-summary - RSVP counts and user's status
   */
  app.get('/:eventId/rsvp-summary', async (c) => {
    const auth = await getCurrentUser(c);

    const db = createDatabase(c.env.DB);
    const eventId = c.req.param('eventId');

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    const allRsvps = await db.query.eventRsvps.findMany({
      where: eq(eventRsvps.eventId, eventId),
    });

    const confirmed = allRsvps.filter((r) => r.status === 'confirmed').length;
    const waitlisted = allRsvps.filter((r) => r.status === 'waitlisted').length;

    let userRsvpStatus: string | null = null;
    if (auth?.user) {
      const userRsvp = allRsvps.find((r) => r.userId === auth.user.id);
      userRsvpStatus = userRsvp?.status ?? null;
    }

    return ok(c, {
      confirmed,
      waitlisted,
      capacity: event.maxAttendees ?? null,
      userRsvpStatus,
    });
  });

  /**
   * GET /events/:eventId/rsvps - List RSVPs
   * Public: returns confirmed count. Authenticated managers get full list.
   */
  app.get('/:eventId/rsvps', async (c) => {
    const db = createDatabase(c.env.DB);
    const eventId = c.req.param('eventId');

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    const allRsvps = await db.query.eventRsvps.findMany({
      where: eq(eventRsvps.eventId, eventId),
    });

    const confirmedRsvps = allRsvps.filter((r) => r.status === 'confirmed');
    const totalConfirmed = confirmedRsvps.length;
    const totalWaitlisted = allRsvps.filter((r) => r.status === 'waitlisted').length;

    // Unauthenticated: counts only (no user details for privacy)
    const auth = await getCurrentUser(c);
    if (!auth) {
      return ok(c, {
        rsvps: [],
        totalConfirmed,
        totalWaitlisted,
      });
    }

    // Authenticated: full RSVP details with user info (respecting profileVisibility)
    const rsvpsWithUsers = await Promise.all(
      confirmedRsvps.map(async (r) => {
        const rsvpUser = await db.query.users.findFirst({
          where: eq(users.id, r.userId),
        });
        // Respect profileVisibility: only expose user details for public profiles
        const isPublic = rsvpUser?.profileVisibility === 'public';
        return {
          id: r.id,
          userId: r.userId,
          status: r.status,
          rsvpAt: r.rsvpAt,
          user: rsvpUser ? {
            id: rsvpUser.id,
            name: isPublic ? rsvpUser.name : null,
            username: isPublic ? rsvpUser.username : null,
            avatarUrl: isPublic ? rsvpUser.avatarUrl : null,
          } : null,
        };
      }),
    );

    return ok(c, {
      rsvps: rsvpsWithUsers,
      totalConfirmed,
      totalWaitlisted,
    });
  });

  /**
   * POST /events/:eventId/rsvp - RSVP to an event
   * If under maxAttendees -> confirmed. Otherwise -> waitlisted with position.
   */
  app.post('/:eventId/rsvp', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const eventId = c.req.param('eventId');

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    if (event.status === 'cancelled') {
      return badRequest(c, 'Cannot RSVP to a cancelled event');
    }

    // Check for existing RSVP
    const existingRsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, user.id),
      ),
    });

    if (existingRsvp) {
      if (existingRsvp.status === 'confirmed' || existingRsvp.status === 'waitlisted') {
        return conflict(c, 'Already RSVP\'d to this event');
      }
      // If previously cancelled, allow re-RSVP by deleting old record
      await db.delete(eventRsvps).where(eq(eventRsvps.id, existingRsvp.id));
    }

    // Get current confirmed count
    const confirmedRsvps = await db.query.eventRsvps.findMany({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, 'confirmed'),
      ),
    });

    const now = new Date().toISOString();
    const rsvpId = crypto.randomUUID();

    let status: 'confirmed' | 'waitlisted';
    let waitlistPosition: number | null = null;

    if (event.maxAttendees && confirmedRsvps.length >= event.maxAttendees) {
      // Event is full -> waitlist
      status = 'waitlisted';
      const waitlistedRsvps = await db.query.eventRsvps.findMany({
        where: and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'waitlisted'),
        ),
      });
      waitlistPosition = waitlistedRsvps.length + 1;
    } else {
      status = 'confirmed';
    }

    await db.insert(eventRsvps).values({
      id: rsvpId,
      eventId,
      userId: user.id,
      status,
      rsvpAt: now,
      waitlistPosition,
    });

    // Update RSVP count on event (confirmed only)
    if (status === 'confirmed') {
      await db.update(events)
        .set({ rsvpCount: confirmedRsvps.length + 1 })
        .where(eq(events.id, eventId));
    }

    const rsvp = await db.query.eventRsvps.findFirst({
      where: eq(eventRsvps.id, rsvpId),
    });

    emitEvent(c, {
      type: 'dev.tampa.event.rsvp',
      payload: {
        eventId,
        userId: user.id,
        status,
        waitlistPosition,
      },
      metadata: { userId: user.id, source: 'rsvp' },
    });

    return created(c, rsvp);
  });

  /**
   * DELETE /events/:eventId/rsvp - Cancel RSVP
   * If confirmed user cancels with waitlisted users -> promote next waitlisted.
   */
  app.delete('/:eventId/rsvp', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const { user } = auth;

    const db = createDatabase(c.env.DB);
    const eventId = c.req.param('eventId');

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) return notFound(c, 'Event not found');

    const rsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, user.id),
      ),
    });
    if (!rsvp) return notFound(c, 'No RSVP found');

    if (rsvp.status === 'cancelled') {
      return badRequest(c, 'RSVP is already cancelled');
    }

    const wasConfirmed = rsvp.status === 'confirmed';

    // Mark as cancelled
    await db.update(eventRsvps)
      .set({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      })
      .where(eq(eventRsvps.id, rsvp.id));

    emitEvent(c, {
      type: 'dev.tampa.event.rsvp_cancelled',
      payload: {
        eventId,
        userId: user.id,
        previousStatus: rsvp.status,
      },
      metadata: { userId: user.id, source: 'rsvp' },
    });

    // If was confirmed and there are waitlisted users, promote next one
    let promotedUserId: string | null = null;
    if (wasConfirmed) {
      const nextWaitlisted = await db.query.eventRsvps.findFirst({
        where: and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'waitlisted'),
        ),
        orderBy: [asc(eventRsvps.waitlistPosition)],
      });

      if (nextWaitlisted) {
        await db.update(eventRsvps)
          .set({
            status: 'confirmed',
            waitlistPosition: null,
          })
          .where(eq(eventRsvps.id, nextWaitlisted.id));

        promotedUserId = nextWaitlisted.userId;

        emitEvent(c, {
          type: 'dev.tampa.event.rsvp',
          payload: {
            eventId,
            userId: nextWaitlisted.userId,
            status: 'confirmed',
            promotedFromWaitlist: true,
          },
          metadata: { userId: nextWaitlisted.userId, source: 'rsvp' },
        });
      }

      // Update RSVP count: -1 for cancel, +1 if promoted (net 0 if promoted)
      const newConfirmedCount = await db.query.eventRsvps.findMany({
        where: and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'confirmed'),
        ),
      });
      await db.update(events)
        .set({ rsvpCount: newConfirmedCount.length })
        .where(eq(events.id, eventId));
    }

    return success(c, {
      message: 'RSVP cancelled',
      promotedUserId,
    });
  });

  return app;
}

export const rsvpRoutes = createRsvpRoutes();
