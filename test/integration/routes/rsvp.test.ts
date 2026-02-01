import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
  createEvent,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// ============== GET /events/:eventId/rsvp ==============

describe('GET /events/:eventId/rsvp', () => {
  it('returns null rsvp when user has not RSVP\'d', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { rsvp: unknown } };
    expect(body.rsvp).toBeNull();
  });

  it('returns RSVP record when user has RSVP\'d', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // RSVP first
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { rsvp: { status: string; userId: string; eventId: string } } };
    expect(body.rsvp).toBeTruthy();
    expect(body.rsvp.status).toBe('confirmed');
    expect(body.rsvp.userId).toBe(user.id);
    expect(body.rsvp.eventId).toBe(event.id);
  });

  it('returns 401 when unauthenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp`, { env });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/events/nonexistent-event-id/rsvp', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });
});

// ============== GET /events/:eventId/rsvp-summary ==============

describe('GET /events/:eventId/rsvp-summary', () => {
  it('returns zero counts with no RSVPs', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        confirmed: number;
        waitlisted: number;
        capacity: number | null;
        userRsvpStatus: string | null;
      };
    };
    expect(body.confirmed).toBe(0);
    expect(body.waitlisted).toBe(0);
    expect(body.userRsvpStatus).toBeNull();
  });

  it('returns correct confirmed and waitlisted counts', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User 1 RSVPs (confirmed)
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User 2 RSVPs (waitlisted, capacity is 1)
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    const res = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        confirmed: number;
        waitlisted: number;
        capacity: number | null;
        userRsvpStatus: string | null;
      };
    };
    expect(body.confirmed).toBe(1);
    expect(body.waitlisted).toBe(1);
  });

  it('returns user\'s RSVP status when authenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    // RSVP first
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const res = await appRequest(`/events/${event.id}/rsvp-summary`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        confirmed: number;
        waitlisted: number;
        capacity: number | null;
        userRsvpStatus: string | null;
      };
    };
    expect(body.userRsvpStatus).toBe('confirmed');
    expect(body.confirmed).toBe(1);
  });

  it('returns capacity as null when no limit is set', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id); // no maxAttendees

    const res = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { capacity: number | null } };
    expect(body.capacity).toBeNull();
  });

  it('returns capacity when limit is set', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 50 });

    const res = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { capacity: number | null } };
    expect(body.capacity).toBe(50);
  });

  it('works without auth and returns null userRsvpStatus', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    // Add an RSVP from another user
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    // Query without auth
    const res = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        confirmed: number;
        userRsvpStatus: string | null;
      };
    };
    expect(body.confirmed).toBe(1);
    expect(body.userRsvpStatus).toBeNull();
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();

    const res = await appRequest('/events/nonexistent-event-id/rsvp-summary', { env });
    expect(res.status).toBe(404);
  });
});

// ============== GET /events/:eventId/rsvps ==============

describe('GET /events/:eventId/rsvps', () => {
  it('returns confirmed RSVPs with user details', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    // Authenticated request to get full RSVP details (unauthenticated only gets counts)
    const res = await appRequest(`/events/${event.id}/rsvps`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        rsvps: { id: string; userId: string; status: string; user: { id: string; name: string; username: string } }[];
        totalConfirmed: number;
        totalWaitlisted: number;
      };
    };
    expect(body.rsvps).toHaveLength(1);
    expect(body.rsvps[0].status).toBe('confirmed');
    expect(body.rsvps[0].userId).toBe(user.id);
    expect(body.rsvps[0].user).toBeTruthy();
    expect(body.rsvps[0].user.id).toBe(user.id);
    expect(body.rsvps[0].user.name).toBeTruthy();
    expect(body.totalConfirmed).toBe(1);
    expect(body.totalWaitlisted).toBe(0);
  });

  it('returns correct totalConfirmed and totalWaitlisted counts', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // Authenticated request to get full RSVP details
    const res = await appRequest(`/events/${event.id}/rsvps`, {
      env,
      headers: { Cookie: cookie1 },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        rsvps: { status: string }[];
        totalConfirmed: number;
        totalWaitlisted: number;
      };
    };
    // rsvps list only includes confirmed
    expect(body.rsvps).toHaveLength(1);
    expect(body.rsvps[0].status).toBe('confirmed');
    expect(body.totalConfirmed).toBe(1);
    expect(body.totalWaitlisted).toBe(1);
  });

  it('does not include cancelled RSVPs in the list', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // Cancel user2's RSVP
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie2 },
    });

    // Authenticated request to get full RSVP details
    const res = await appRequest(`/events/${event.id}/rsvps`, {
      env,
      headers: { Cookie: cookie1 },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as {
      data: {
        rsvps: { userId: string }[];
        totalConfirmed: number;
        totalWaitlisted: number;
      };
    };
    expect(body.rsvps).toHaveLength(1);
    expect(body.rsvps[0].userId).toBe(user1.id);
    expect(body.totalConfirmed).toBe(1);
    expect(body.totalWaitlisted).toBe(0);
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();

    const res = await appRequest('/events/nonexistent-event-id/rsvps', { env });
    expect(res.status).toBe(404);
  });
});

// ============== POST /events/:eventId/rsvp ==============

describe('POST /events/:eventId/rsvp', () => {
  it('confirmed when event has no capacity limit', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id); // no maxAttendees

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(201);
    const { data: body } = await res.json() as {
      data: {
        id: string;
        eventId: string;
        userId: string;
        status: string;
        waitlistPosition: number | null;
      };
    };
    expect(body.status).toBe('confirmed');
    expect(body.eventId).toBe(event.id);
    expect(body.userId).toBe(user.id);
    expect(body.waitlistPosition).toBeNull();
  });

  it('confirmed when under capacity', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 5 });

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(201);
    const { data: body } = await res.json() as { data: { status: string } };
    expect(body.status).toBe('confirmed');
  });

  it('waitlisted when at capacity', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // Fill capacity
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // Next user should be waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(res.status).toBe(201);
    const { data: body } = await res.json() as { data: { status: string; waitlistPosition: number | null } };
    expect(body.status).toBe('waitlisted');
    expect(body.waitlistPosition).toBe(1);
  });

  it('assigns incrementing waitlist positions', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // Fill capacity
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // Waitlist position 1
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    const res2 = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    const { data: body2 } = await res2.json() as { data: { waitlistPosition: number } };
    expect(body2.waitlistPosition).toBe(1);

    // Waitlist position 2
    const user3 = await createUser();
    const { cookieHeader: cookie3 } = await createSession(user3.id);
    const res3 = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie3 },
    });
    const { data: body3 } = await res3.json() as { data: { waitlistPosition: number } };
    expect(body3.waitlistPosition).toBe(2);
  });

  it('returns 409 for duplicate RSVP', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // First RSVP
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    // Duplicate RSVP
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string; code: string };
    expect(body.error).toContain('Already RSVP');
    expect(body.code).toBe('conflict');
  });

  it('returns 409 for duplicate waitlisted RSVP', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // Fill capacity
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 gets waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // User2 tries again
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(res.status).toBe(409);
  });

  it('returns 401 when unauthenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/events/nonexistent-event-id/rsvp', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for cancelled event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id, { status: 'cancelled' });

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('cancelled');
  });

  it('updates rsvpCount on the event after confirmed RSVP', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const db = getDb();
    const updatedEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(updatedEvent!.rsvpCount).toBe(1);
  });

  it('does not update rsvpCount when user is waitlisted', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // Fill capacity
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // This user should be waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    const db = getDb();
    const updatedEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    // rsvpCount should only reflect confirmed (1), not waitlisted
    expect(updatedEvent!.rsvpCount).toBe(1);
  });

  it('allows re-RSVP after cancellation', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // RSVP
    const rsvpRes = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(rsvpRes.status).toBe(201);
    const { data: firstRsvp } = await rsvpRes.json() as { data: { id: string } };

    // Cancel
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    // Re-RSVP should work
    const reRsvpRes = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(reRsvpRes.status).toBe(201);
    const { data: newRsvp } = await reRsvpRes.json() as { data: { id: string; status: string } };
    expect(newRsvp.status).toBe('confirmed');
    // The new RSVP should have a different ID (old record deleted, new one created)
    expect(newRsvp.id).not.toBe(firstRsvp.id);
  });

  it('emits domain event on RSVP', async () => {
    const { env, mockQueue } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const rsvpEvent = mockQueue.messages.find(
      (m) => (m.body as { type: string }).type === 'dev.tampa.event.rsvp',
    );
    expect(rsvpEvent).toBeDefined();
    const payload = (rsvpEvent!.body as { payload: { eventId: string; userId: string; status: string } }).payload;
    expect(payload.eventId).toBe(event.id);
    expect(payload.userId).toBe(user.id);
    expect(payload.status).toBe('confirmed');
  });
});

// ============== DELETE /events/:eventId/rsvp ==============

describe('DELETE /events/:eventId/rsvp', () => {
  it('cancels a confirmed RSVP', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { success: boolean; message: string; promotedUserId: string | null } };
    expect(body.success).toBe(true);
    expect(body.message).toBe('RSVP cancelled');
    expect(body.promotedUserId).toBeNull();

    // Verify the RSVP is now cancelled in the database
    const db = getDb();
    const rsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(schema.eventRsvps.eventId, event.id),
        eq(schema.eventRsvps.userId, user.id),
      ),
    });
    expect(rsvp!.status).toBe('cancelled');
    expect(rsvp!.cancelledAt).toBeTruthy();
  });

  it('cancels a waitlisted RSVP', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // Fill capacity
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 is waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // Cancel waitlisted RSVP
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie2 },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { success: boolean; promotedUserId: string | null } };
    expect(body.success).toBe(true);
    // No promotion since the cancelled user was waitlisted, not confirmed
    expect(body.promotedUserId).toBeNull();
  });

  it('returns 404 when no RSVP exists', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('No RSVP found');
  });

  it('returns 400 when RSVP is already cancelled', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // RSVP then cancel
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    // Try to cancel again
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('already cancelled');
  });

  it('returns 401 when unauthenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/events/nonexistent-event-id/rsvp', {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('updates rsvpCount on the event after cancellation', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id);

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // Cancel user1
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });

    const db = getDb();
    const updatedEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(updatedEvent!.rsvpCount).toBe(1);
  });

  it('emits domain event on cancellation', async () => {
    const { env, mockQueue } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    const event = await createEvent(group.id);

    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    mockQueue.messages.length = 0;

    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    const cancelEvent = mockQueue.messages.find(
      (m) => (m.body as { type: string }).type === 'dev.tampa.event.rsvp_cancelled',
    );
    expect(cancelEvent).toBeDefined();
    const payload = (cancelEvent!.body as { payload: { eventId: string; userId: string; previousStatus: string } }).payload;
    expect(payload.eventId).toBe(event.id);
    expect(payload.userId).toBe(user.id);
    expect(payload.previousStatus).toBe('confirmed');
  });
});

// ============== Waitlist Promotion ==============

describe('Waitlist Promotion', () => {
  it('promotes next waitlisted user when confirmed user cancels', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User1 RSVPs (confirmed)
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 RSVPs (waitlisted)
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // User1 cancels
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });
    expect(res.status).toBe(200);
    const { data: body } = await res.json() as { data: { success: boolean; promotedUserId: string | null } };
    expect(body.success).toBe(true);
    expect(body.promotedUserId).toBe(user2.id);
  });

  it('promoted user status changes to confirmed', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // Verify user2 is waitlisted
    const statusBefore = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie2 },
    });
    const { data: beforeBody } = await statusBefore.json() as { data: { rsvp: { status: string; waitlistPosition: number | null } } };
    expect(beforeBody.rsvp.status).toBe('waitlisted');
    expect(beforeBody.rsvp.waitlistPosition).toBe(1);

    // User1 cancels, triggering promotion
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });

    // Verify user2 is now confirmed
    const statusAfter = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie2 },
    });
    const { data: afterBody } = await statusAfter.json() as { data: { rsvp: { status: string; waitlistPosition: number | null } } };
    expect(afterBody.rsvp.status).toBe('confirmed');
    expect(afterBody.rsvp.waitlistPosition).toBeNull();
  });

  it('promotes by waitlist position order', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User1 confirmed
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 waitlisted (position 1)
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // User3 waitlisted (position 2)
    const user3 = await createUser();
    const { cookieHeader: cookie3 } = await createSession(user3.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie3 },
    });

    // Cancel confirmed user -> user2 (position 1) should be promoted, not user3
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });
    const { data: body } = await res.json() as { data: { promotedUserId: string | null } };
    expect(body.promotedUserId).toBe(user2.id);

    // Verify user2 is confirmed
    const user2Status = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie2 },
    });
    const { data: u2Body } = await user2Status.json() as { data: { rsvp: { status: string } } };
    expect(u2Body.rsvp.status).toBe('confirmed');

    // Verify user3 is still waitlisted
    const user3Status = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie3 },
    });
    const { data: u3Body } = await user3Status.json() as { data: { rsvp: { status: string } } };
    expect(u3Body.rsvp.status).toBe('waitlisted');
  });

  it('does not promote when waitlisted user cancels', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User1 confirmed
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // User3 waitlisted
    const user3 = await createUser();
    const { cookieHeader: cookie3 } = await createSession(user3.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie3 },
    });

    // Cancel user2 (waitlisted) -> no promotion should happen
    const res = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie2 },
    });
    const { data: body } = await res.json() as { data: { promotedUserId: string | null } };
    expect(body.promotedUserId).toBeNull();

    // User3 should still be waitlisted
    const user3Status = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie3 },
    });
    const { data: u3Body } = await user3Status.json() as { data: { rsvp: { status: string } } };
    expect(u3Body.rsvp.status).toBe('waitlisted');
  });

  it('maintains correct rsvpCount after promotion', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User1 confirmed
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    const db = getDb();

    // Before cancel: rsvpCount should be 1
    const beforeEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(beforeEvent!.rsvpCount).toBe(1);

    // Cancel user1 -> user2 promoted
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });

    // After promotion: rsvpCount should still be 1 (cancel -1, promote +1 = net 0)
    const afterEvent = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(afterEvent!.rsvpCount).toBe(1);
  });

  it('emits promotion domain event', async () => {
    const { env, mockQueue } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    mockQueue.messages.length = 0;

    // Cancel user1, promoting user2
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });

    // Should have cancellation event and promotion event
    const promotionEvent = mockQueue.messages.find(
      (m) => {
        const body = m.body as { type: string; payload: { promotedFromWaitlist?: boolean } };
        return body.type === 'dev.tampa.event.rsvp' && body.payload.promotedFromWaitlist === true;
      },
    );
    expect(promotionEvent).toBeDefined();
    const payload = (promotionEvent!.body as { payload: { userId: string; status: string } }).payload;
    expect(payload.userId).toBe(user2.id);
    expect(payload.status).toBe('confirmed');
  });
});

// ============== Full RSVP Flow ==============

describe('Full RSVP Flow', () => {
  it('handles complete flow: RSVP, fill capacity, waitlist, cancel, promote', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 2 });
    const db = getDb();

    // Step 1: User1 RSVPs -> confirmed
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    const res1 = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });
    expect(res1.status).toBe(201);
    const { data: body1 } = await res1.json() as { data: { status: string } };
    expect(body1.status).toBe('confirmed');

    // Step 2: User2 RSVPs -> confirmed (still under capacity of 2)
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    const res2 = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(res2.status).toBe(201);
    const { data: body2 } = await res2.json() as { data: { status: string } };
    expect(body2.status).toBe('confirmed');

    // Verify rsvpCount is 2
    let eventState = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(eventState!.rsvpCount).toBe(2);

    // Step 3: User3 RSVPs -> waitlisted (capacity full)
    const user3 = await createUser();
    const { cookieHeader: cookie3 } = await createSession(user3.id);
    const res3 = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie3 },
    });
    expect(res3.status).toBe(201);
    const { data: body3 } = await res3.json() as { data: { status: string; waitlistPosition: number } };
    expect(body3.status).toBe('waitlisted');
    expect(body3.waitlistPosition).toBe(1);

    // Verify rsvpCount is still 2 (waitlisted not counted)
    eventState = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(eventState!.rsvpCount).toBe(2);

    // Verify summary
    const summaryRes = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    const { data: summary } = await summaryRes.json() as {
      data: {
        confirmed: number;
        waitlisted: number;
        capacity: number;
      };
    };
    expect(summary.confirmed).toBe(2);
    expect(summary.waitlisted).toBe(1);
    expect(summary.capacity).toBe(2);

    // Step 4: User1 cancels -> User3 gets promoted
    const cancelRes = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie1 },
    });
    expect(cancelRes.status).toBe(200);
    const { data: cancelBody } = await cancelRes.json() as { data: { success: boolean; promotedUserId: string | null } };
    expect(cancelBody.success).toBe(true);
    expect(cancelBody.promotedUserId).toBe(user3.id);

    // Verify User3 is now confirmed
    const user3Status = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie3 },
    });
    const { data: u3Body } = await user3Status.json() as { data: { rsvp: { status: string; waitlistPosition: number | null } } };
    expect(u3Body.rsvp.status).toBe('confirmed');
    expect(u3Body.rsvp.waitlistPosition).toBeNull();

    // Verify User1 is cancelled
    const user1Status = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      headers: { Cookie: cookie1 },
    });
    const { data: u1Body } = await user1Status.json() as { data: { rsvp: { status: string } } };
    expect(u1Body.rsvp.status).toBe('cancelled');

    // Verify rsvpCount is 2 (user2 + promoted user3)
    eventState = await db.query.events.findFirst({
      where: eq(schema.events.id, event.id),
    });
    expect(eventState!.rsvpCount).toBe(2);

    // Verify final summary
    const finalSummary = await appRequest(`/events/${event.id}/rsvp-summary`, { env });
    const { data: finalBody } = await finalSummary.json() as {
      data: {
        confirmed: number;
        waitlisted: number;
      };
    };
    expect(finalBody.confirmed).toBe(2);
    expect(finalBody.waitlisted).toBe(0);

    // Verify RSVP list only shows confirmed users (authenticated request)
    const listRes = await appRequest(`/events/${event.id}/rsvps`, {
      env,
      headers: { Cookie: cookie2 },
    });
    const { data: listBody } = await listRes.json() as {
      data: {
        rsvps: { userId: string }[];
        totalConfirmed: number;
        totalWaitlisted: number;
      };
    };
    expect(listBody.rsvps).toHaveLength(2);
    const confirmedUserIds = listBody.rsvps.map((r) => r.userId);
    expect(confirmedUserIds).toContain(user2.id);
    expect(confirmedUserIds).toContain(user3.id);
    expect(confirmedUserIds).not.toContain(user1.id);
    expect(listBody.totalConfirmed).toBe(2);
    expect(listBody.totalWaitlisted).toBe(0);
  });

  it('handles re-RSVP after cancel going back to waitlist', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();
    const event = await createEvent(group.id, { maxAttendees: 1 });

    // User1 confirmed
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // User2 waitlisted
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });

    // User2 cancels
    await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookie2 },
    });

    // User2 re-RSVPs -> should be waitlisted again since user1 is still confirmed
    const reRsvpRes = await appRequest(`/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(reRsvpRes.status).toBe(201);
    const { data: reRsvpBody } = await reRsvpRes.json() as { data: { status: string } };
    expect(reRsvpBody.status).toBe('waitlisted');
  });
});
