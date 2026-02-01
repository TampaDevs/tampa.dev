/**
 * RSVP Service
 *
 * Shared business logic for creating and cancelling RSVPs,
 * including capacity checks and waitlist promotion.
 * Used by both /v1/ API routes and session routes.
 */

import { eq, and, sql, count } from 'drizzle-orm';
import { events, eventRsvps } from '../db/schema.js';
import type { EventRsvp } from '../db/schema.js';
import type { DomainEvent } from '../lib/event-bus.js';

type DB = ReturnType<typeof import('../db/index.js').createDatabase>;

// ============== Result Types ==============

export interface RsvpResult {
  rsvp: EventRsvp;
  events: Omit<DomainEvent, 'timestamp'>[];
}

export interface CancelRsvpResult {
  promotedUserId: string | null;
  events: Omit<DomainEvent, 'timestamp'>[];
}

export interface RsvpStatusResult {
  rsvp: EventRsvp | null;
}

export interface RsvpSummaryResult {
  confirmed: number;
  waitlisted: number;
  capacity: number | null;
}

// ============== Error Types ==============

export class RsvpError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'conflict' | 'gone' | 'bad_request',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RsvpError';
  }
}

// ============== Service Functions ==============

/**
 * Create an RSVP for a user on an event.
 * Handles capacity checking, waitlist placement, and re-RSVP after cancellation.
 */
export async function createRsvp(
  db: DB,
  userId: string,
  eventId: string,
): Promise<RsvpResult> {
  // Validate event exists and is not cancelled
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!event) {
    throw new RsvpError('Event not found', 'not_found', 404);
  }
  if (event.status === 'cancelled') {
    throw new RsvpError('Event has been cancelled', 'gone', 410);
  }

  // Check for existing RSVP
  const existing = await db.query.eventRsvps.findFirst({
    where: and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)),
  });

  if (existing) {
    if (existing.status === 'confirmed' || existing.status === 'waitlisted') {
      throw new RsvpError(
        `Already ${existing.status} for this event`,
        'conflict',
        409,
      );
    }
    // If previously cancelled, delete to allow re-RSVP
    if (existing.status === 'cancelled') {
      await db
        .delete(eventRsvps)
        .where(eq(eventRsvps.id, existing.id));
    }
  }

  // Check capacity
  const [{ value: confirmedCount }] = await db
    .select({ value: count() })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'confirmed')),
    );

  let status: 'confirmed' | 'waitlisted' = 'confirmed';
  let waitlistPosition: number | null = null;

  if (event.maxAttendees && confirmedCount >= event.maxAttendees) {
    status = 'waitlisted';
    // Calculate waitlist position
    const [{ value: waitlistedCount }] = await db
      .select({ value: count() })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'waitlisted'),
        ),
      );
    waitlistPosition = waitlistedCount + 1;
  }

  // Insert the RSVP
  const rsvpId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(eventRsvps).values({
    id: rsvpId,
    eventId,
    userId,
    status,
    rsvpAt: now,
    waitlistPosition,
  });

  // Update event rsvpCount if confirmed
  if (status === 'confirmed') {
    await db
      .update(events)
      .set({ rsvpCount: sql`${events.rsvpCount} + 1` })
      .where(eq(events.id, eventId));
  }

  const rsvp = (await db.query.eventRsvps.findFirst({
    where: eq(eventRsvps.id, rsvpId),
  }))!;

  return {
    rsvp,
    events: [
      {
        type: 'dev.tampa.event.rsvp',
        payload: {
          eventId,
          userId,
          status,
          eventTitle: event.title,
          groupId: event.groupId,
        },
        metadata: { userId, source: 'rsvp' },
      },
    ],
  };
}

/**
 * Cancel an RSVP and promote the next waitlisted user if applicable.
 */
export async function cancelRsvp(
  db: DB,
  userId: string,
  eventId: string,
): Promise<CancelRsvpResult> {
  const rsvp = await db.query.eventRsvps.findFirst({
    where: and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)),
  });

  if (!rsvp || rsvp.status === 'cancelled') {
    throw new RsvpError('No active RSVP found for this event', 'not_found', 404);
  }

  const wasConfirmed = rsvp.status === 'confirmed';
  const now = new Date().toISOString();

  // Mark as cancelled
  await db
    .update(eventRsvps)
    .set({ status: 'cancelled', cancelledAt: now })
    .where(eq(eventRsvps.id, rsvp.id));

  const domainEvents: Omit<DomainEvent, 'timestamp'>[] = [
    {
      type: 'dev.tampa.event.rsvp_cancelled',
      payload: { eventId, userId },
      metadata: { userId, source: 'rsvp' },
    },
  ];

  let promotedUserId: string | null = null;

  // Promote next waitlisted user if a confirmed spot opened
  if (wasConfirmed) {
    // Step 1: Find the next waitlisted user
    const nextWaitlisted = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, 'waitlisted'),
      ),
      orderBy: [eventRsvps.waitlistPosition],
    });

    if (nextWaitlisted) {
      // Step 2: Conditional update with status guard prevents double-promotion
      // under concurrent cancellations. If another request already promoted
      // this user, the WHERE clause won't match and .returning() yields empty.
      const [promoted] = await db
        .update(eventRsvps)
        .set({ status: 'confirmed', waitlistPosition: null })
        .where(
          and(
            eq(eventRsvps.id, nextWaitlisted.id),
            eq(eventRsvps.status, 'waitlisted'),
          ),
        )
        .returning({ userId: eventRsvps.userId });

      if (promoted) {
        promotedUserId = promoted.userId;
        domainEvents.push({
          type: 'dev.tampa.event.rsvp',
          payload: {
            eventId,
            userId: promoted.userId,
            status: 'confirmed',
            promotedFromWaitlist: true,
          },
          metadata: { userId: promoted.userId, source: 'rsvp' },
        });
      }
    }

    // Recount confirmed RSVPs
    const [{ value: confirmedCount }] = await db
      .select({ value: count() })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.status, 'confirmed'),
        ),
      );
    await db
      .update(events)
      .set({ rsvpCount: confirmedCount })
      .where(eq(events.id, eventId));
  }

  return { promotedUserId, events: domainEvents };
}

/**
 * Get a user's RSVP status for a specific event.
 */
export async function getRsvpStatus(
  db: DB,
  userId: string,
  eventId: string,
): Promise<RsvpStatusResult> {
  const rsvp = await db.query.eventRsvps.findFirst({
    where: and(
      eq(eventRsvps.eventId, eventId),
      eq(eventRsvps.userId, userId),
    ),
  });

  // Don't return cancelled RSVPs as "active"
  if (rsvp && rsvp.status === 'cancelled') {
    return { rsvp: null };
  }

  return { rsvp: rsvp ?? null };
}

/**
 * Get RSVP summary counts for an event.
 */
export async function getRsvpSummary(
  db: DB,
  eventId: string,
): Promise<RsvpSummaryResult> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });
  if (!event) {
    throw new RsvpError('Event not found', 'not_found', 404);
  }

  const [{ value: confirmed }] = await db
    .select({ value: count() })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'confirmed')),
    );

  const [{ value: waitlisted }] = await db
    .select({ value: count() })
    .from(eventRsvps)
    .where(
      and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, 'waitlisted'),
      ),
    );

  return {
    confirmed,
    waitlisted,
    capacity: event.maxAttendees,
  };
}
