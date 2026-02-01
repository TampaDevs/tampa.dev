import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  createEvent,
  addGroupMember,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';

// ============== Helper: base path for event management routes ==============

function eventsPath(groupId: string, suffix = ''): string {
  return `/groups/manage/${groupId}/events${suffix}`;
}

// ============== Helper: create a native (tampa.dev) group with an owner ==============

async function setupNativeGroupWithOwner() {
  const owner = await createUser();
  const group = await createGroup({
    platform: 'tampa.dev',
    platformId: `native-${crypto.randomUUID()}`,
  });
  await addGroupMember(group.id, owner.id, 'owner');
  return { owner, group };
}

// ============== Helper: valid event body ==============

function validEventBody(overrides?: Record<string, unknown>) {
  const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
  return {
    title: 'Test Native Event',
    description: 'A great event for testing',
    startTime,
    endTime,
    timezone: 'America/New_York',
    eventType: 'physical',
    maxAttendees: 100,
    venue: {
      name: 'Tampa Convention Center',
      address: '333 S Franklin St',
      city: 'Tampa',
      state: 'FL',
      postalCode: '33602',
      country: 'US',
      latitude: 27.9425,
      longitude: -82.4587,
    },
    ...overrides,
  };
}

// ============== Event Creation ==============

describe('Event Creation (POST /groups/manage/:groupId/events)', () => {
  it('manager can create event with full details', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const body = validEventBody();
    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body,
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: Record<string, unknown>; checkinCode: string } };
    expect(data.event).toBeTruthy();
    expect(data.checkinCode).toBeTruthy();
    expect(typeof data.checkinCode).toBe('string');
    expect(data.checkinCode.length).toBe(8);
    expect(data.event.title).toBe('Test Native Event');
    expect(data.event.description).toBe('A great event for testing');
    expect(data.event.groupId).toBe(group.id);
    expect(data.event.timezone).toBe('America/New_York');
    expect(data.event.eventType).toBe('physical');
    expect(data.event.maxAttendees).toBe(100);
    expect(data.event.status).toBe('active');
  });

  it('sets platform to tampa.dev and platformId to event UUID', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: Record<string, unknown> } };
    expect(data.event.platform).toBe('tampa.dev');
    // platformId should equal the event id
    expect(data.event.platformId).toBe(data.event.id);
  });

  it('sets eventUrl to https://events.tampa.dev/events/{eventId}', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { id: string; eventUrl: string } } };
    expect(data.event.eventUrl).toBe(`https://events.tampa.dev/events/${data.event.id}`);
  });

  it('sets createdBy to the authenticated user ID', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { createdBy: string } } };
    expect(data.event.createdBy).toBe(manager.id);
  });

  it('creates a venue record when venue is provided', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { id: string; venueId: string } } };
    expect(data.event.venueId).toBeTruthy();

    // Verify venue was inserted into the database
    const db = getDb();
    const venue = await db.query.venues.findFirst({
      where: (v, { eq }) => eq(v.id, data.event.venueId),
    });
    expect(venue).toBeTruthy();
    expect(venue!.name).toBe('Tampa Convention Center');
    expect(venue!.city).toBe('Tampa');
    expect(venue!.state).toBe('FL');
    expect(venue!.platform).toBe('tampa.dev');
  });

  it('creates event without venue when not provided', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const body = validEventBody();
    delete (body as Record<string, unknown>).venue;

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body,
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { venueId: string | null } } };
    expect(data.event.venueId).toBeNull();
  });

  it('auto-generates a checkin code in the database', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { id: string }; checkinCode: string } };

    const db = getDb();
    const codes = await db.query.eventCheckinCodes.findMany({
      where: (c, { eq }) => eq(c.eventId, data.event.id),
    });
    expect(codes.length).toBe(1);
    expect(codes[0].code).toBe(data.checkinCode);
    expect(codes[0].createdBy).toBe(manager.id);
  });

  it('computes duration when both startTime and endTime provided', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const startTime = '2025-06-15T18:00:00.000Z';
    const endTime = '2025-06-15T20:30:00.000Z'; // 2 hours 30 minutes later

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody({ startTime, endTime }),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { duration: string } } };
    expect(data.event.duration).toBe('PT2H30M');
  });

  it('owner can create events', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
  });

  it('volunteer cannot create events (403)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const volunteer = await createUser();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const { cookieHeader } = await createSession(volunteer.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(403);
  });

  it('member cannot create events (403)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const member = await createUser();
    await addGroupMember(group.id, member.id, 'member');
    const { cookieHeader } = await createSession(member.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      body: validEventBody(),
    });

    expect(res.status).toBe(401);
  });

  it('platform admin can create events without group membership', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { createdBy: string } } };
    expect(data.event.createdBy).toBe(admin.id);
  });

  it('returns 404 for non-existent group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(eventsPath('nonexistent-group-id'), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });

    expect(res.status).toBe(404);
  });

  it('creates event with minimal fields (title + startTime only)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { title: 'Minimal Event', startTime },
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: Record<string, unknown> } };
    expect(data.event.title).toBe('Minimal Event');
    expect(data.event.description).toBeNull();
    expect(data.event.venueId).toBeNull();
    expect(data.event.status).toBe('active');
    expect(data.event.eventType).toBe('physical');
    expect(data.event.timezone).toBe('America/New_York');
  });
});

// ============== Event Listing ==============

describe('Event Listing (GET /groups/manage/:groupId/events)', () => {
  it('manager can list events for their group', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    // Create events via factory for the group
    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'evt-1', title: 'Event A' });
    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'evt-2', title: 'Event B' });

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { title: string; confirmedRsvps: number; checkinCount: number }[] };
    expect(data.length).toBe(2);
  });

  it('returns events with confirmedRsvps and checkinCount', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'evt-rsvp' });

    // Add some RSVPs and checkins directly via db
    const db = getDb();
    const rsvpUser1 = await createUser();
    const rsvpUser2 = await createUser();
    const rsvpUser3 = await createUser();

    await db.insert(schema.eventRsvps).values([
      { id: crypto.randomUUID(), eventId: event.id, userId: rsvpUser1.id, status: 'confirmed' },
      { id: crypto.randomUUID(), eventId: event.id, userId: rsvpUser2.id, status: 'confirmed' },
      { id: crypto.randomUUID(), eventId: event.id, userId: rsvpUser3.id, status: 'waitlisted' },
    ]);

    await db.insert(schema.eventCheckins).values([
      { id: crypto.randomUUID(), eventId: event.id, userId: rsvpUser1.id, method: 'link' },
    ]);

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { id: string; confirmedRsvps: number; checkinCount: number }[] };
    const found = data.find((e) => e.id === event.id);
    expect(found).toBeTruthy();
    expect(found!.confirmedRsvps).toBe(2);
    expect(found!.checkinCount).toBe(1);
  });

  it('volunteer cannot list events (403)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const volunteer = await createUser();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const { cookieHeader } = await createSession(volunteer.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(403);
  });

  it('member cannot list events (403)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const member = await createUser();
    await addGroupMember(group.id, member.id, 'member');
    const { cookieHeader } = await createSession(member.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(403);
  });

  it('returns empty array when no events exist', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: unknown[] };
    expect(data).toEqual([]);
  });

  it('unauthenticated request returns 401', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();

    const res = await appRequest(eventsPath(group.id), { env });

    expect(res.status).toBe(401);
  });

  it('platform admin can list events for any group', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'admin-list-evt' });

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: unknown[] };
    expect(data.length).toBeGreaterThanOrEqual(1);
  });
});

// ============== Event Detail ==============

describe('Event Detail (GET /groups/manage/:groupId/events/:eventId)', () => {
  it('manager can view event detail', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'detail-evt' });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: Record<string, unknown> };
    expect(data.id).toBe(event.id);
    expect(data.title).toBe(event.title);
  });

  it('returns venue info when event has a venue', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create a venue and associate it with an event
    const db = getDb();
    const venueId = crypto.randomUUID();
    await db.insert(schema.venues).values({
      id: venueId,
      name: 'Test Venue',
      city: 'Tampa',
      state: 'FL',
      platform: 'tampa.dev',
    });

    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'venue-detail-evt',
      venueId,
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { venue: { id: string; name: string; city: string } } };
    expect(data.venue).toBeTruthy();
    expect(data.venue.id).toBe(venueId);
    expect(data.venue.name).toBe('Test Venue');
    expect(data.venue.city).toBe('Tampa');
  });

  it('returns RSVP summary with confirmed, waitlisted, and cancelled counts', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'rsvp-detail' });

    const db = getDb();
    const user1 = await createUser();
    const user2 = await createUser();
    const user3 = await createUser();
    const user4 = await createUser();

    await db.insert(schema.eventRsvps).values([
      { id: crypto.randomUUID(), eventId: event.id, userId: user1.id, status: 'confirmed' },
      { id: crypto.randomUUID(), eventId: event.id, userId: user2.id, status: 'confirmed' },
      { id: crypto.randomUUID(), eventId: event.id, userId: user3.id, status: 'waitlisted' },
      { id: crypto.randomUUID(), eventId: event.id, userId: user4.id, status: 'cancelled' },
    ]);

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: { rsvpSummary: { confirmed: number; waitlisted: number; cancelled: number } };
    };
    expect(data.rsvpSummary.confirmed).toBe(2);
    expect(data.rsvpSummary.waitlisted).toBe(1);
    expect(data.rsvpSummary.cancelled).toBe(1);
  });

  it('returns checkin count and checkin codes', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'checkin-detail' });

    const db = getDb();
    const user1 = await createUser();
    const user2 = await createUser();

    // Insert checkin codes
    const codeId = crypto.randomUUID();
    await db.insert(schema.eventCheckinCodes).values({
      id: codeId,
      eventId: event.id,
      code: 'TESTCODE',
      createdBy: owner.id,
    });

    // Insert checkins
    await db.insert(schema.eventCheckins).values([
      { id: crypto.randomUUID(), eventId: event.id, userId: user1.id, method: 'link', checkinCodeId: codeId },
      { id: crypto.randomUUID(), eventId: event.id, userId: user2.id, method: 'qr', checkinCodeId: codeId },
    ]);

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: { checkinCount: number; checkinCodes: { id: string; code: string }[] };
    };
    expect(data.checkinCount).toBe(2);
    expect(data.checkinCodes).toHaveLength(1);
    expect(data.checkinCodes[0].code).toBe('TESTCODE');
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const res = await appRequest(eventsPath(group.id, '/nonexistent-event-id'), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(404);
  });

  it('returns 404 for event in different group', async () => {
    const { env } = createTestEnv();
    const { owner, group: group1 } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create a second group with an event
    const group2 = await createGroup({
      platform: 'tampa.dev',
      platformId: `native-other-${crypto.randomUUID()}`,
    });
    const otherEvent = await createEvent(group2.id, {
      platform: 'tampa.dev',
      platformId: 'other-group-evt',
    });

    // Try to access the event via the wrong group
    const res = await appRequest(eventsPath(group1.id, `/${otherEvent.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(404);
  });

  it('volunteer cannot view event detail (403)', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const volunteer = await createUser();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const { cookieHeader } = await createSession(volunteer.id);

    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'vol-detail' });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(403);
  });

  it('unauthenticated request returns 401', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'unauth-detail' });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), { env });

    expect(res.status).toBe(401);
  });
});

// ============== Event Update ==============

describe('Event Update (PUT /groups/manage/:groupId/events/:eventId)', () => {
  it('manager can update event fields', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    // Create a native event via the API first
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: {
        title: 'Updated Title',
        description: 'Updated description',
        eventType: 'hybrid',
        maxAttendees: 50,
      },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: Record<string, unknown> };
    expect(data.title).toBe('Updated Title');
    expect(data.description).toBe('Updated description');
    expect(data.eventType).toBe('hybrid');
    expect(data.maxAttendees).toBe(50);
  });

  it('updates the venue when venue object provided', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create event via API
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string; venueId: string } } };
    const created = createData.event;
    const originalVenueId = created.venueId;

    // Update with new venue
    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: {
        venue: {
          name: 'New Venue',
          address: '123 Main St',
          city: 'St. Petersburg',
          state: 'FL',
        },
      },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { venueId: string } };
    // A new venue should have been created (different id from original)
    expect(data.venueId).toBeTruthy();
    expect(data.venueId).not.toBe(originalVenueId);

    // Verify the new venue exists
    const db = getDb();
    const venue = await db.query.venues.findFirst({
      where: (v, { eq }) => eq(v.id, data.venueId),
    });
    expect(venue).toBeTruthy();
    expect(venue!.name).toBe('New Venue');
    expect(venue!.city).toBe('St. Petersburg');
  });

  it('can remove venue by passing null', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create event with venue via API
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string; venueId: string } } };
    const created = createData.event;
    expect(created.venueId).toBeTruthy();

    // Update with null venue
    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { venue: null },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { venueId: string | null } };
    expect(data.venueId).toBeNull();
  });

  it('cannot edit synced events (platform !== tampa.dev) - returns 400', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create a synced (meetup) event directly in the database
    const syncedEvent = await createEvent(group.id, {
      platform: 'meetup',
      platformId: 'meetup-evt-123',
    });

    const res = await appRequest(eventsPath(group.id, `/${syncedEvent.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { title: 'Attempted Edit' },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/synced/i);
  });

  it('returns 403 for volunteer', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const volunteer = await createUser();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const { cookieHeader } = await createSession(volunteer.id);

    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'vol-update-evt',
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { title: 'Volunteer Attempt' },
    });

    expect(res.status).toBe(403);
  });

  it('returns 403 for member', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const member = await createUser();
    await addGroupMember(group.id, member.id, 'member');
    const { cookieHeader } = await createSession(member.id);

    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'mem-update-evt',
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { title: 'Member Attempt' },
    });

    expect(res.status).toBe(403);
  });

  it('recalculates duration when times change', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create event via API with known times
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody({
        startTime: '2025-07-01T18:00:00.000Z',
        endTime: '2025-07-01T20:00:00.000Z',
      }),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string; duration: string } } };
    const created = createData.event;
    expect(created.duration).toBe('PT2H');

    // Update to a 3-hour event
    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: {
        endTime: '2025-07-01T21:00:00.000Z',
      },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { duration: string } };
    expect(data.duration).toBe('PT3H');
  });

  it('recalculates duration when startTime changes with existing endTime', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create event with known times
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody({
        startTime: '2025-07-01T18:00:00.000Z',
        endTime: '2025-07-01T20:00:00.000Z',
      }),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    // Move start time earlier so duration becomes 3 hours
    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: {
        startTime: '2025-07-01T17:00:00.000Z',
      },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { duration: string } };
    expect(data.duration).toBe('PT3H');
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const res = await appRequest(eventsPath(group.id, '/nonexistent-evt-id'), {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { title: 'Ghost Event' },
    });

    expect(res.status).toBe(404);
  });

  it('unauthenticated request returns 401', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'unauth-update',
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      method: 'PUT',
      body: { title: 'No Auth' },
    });

    expect(res.status).toBe(401);
  });
});

// ============== Event Cancellation ==============

describe('Event Cancellation (POST /groups/manage/:groupId/events/:eventId/cancel)', () => {
  it('manager can cancel event - status becomes cancelled', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const manager = await createUser();
    await addGroupMember(group.id, manager.id, 'manager');
    const { cookieHeader } = await createSession(manager.id);

    // Create event via API
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { success: boolean; message: string } };
    expect(data.success).toBe(true);

    // Verify status in database
    const db = getDb();
    const event = await db.query.events.findFirst({
      where: (e, { eq }) => eq(e.id, created.id),
    });
    expect(event!.status).toBe('cancelled');
  });

  it('owner can cancel event', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
  });

  it('cannot cancel already cancelled event - returns 400', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create and cancel an event
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    // First cancel
    const cancelRes = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(cancelRes.status).toBe(200);

    // Second cancel should fail
    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/already cancelled/i);
  });

  it('cannot cancel synced events - returns 400', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    // Create a synced (meetup) event via factory
    const syncedEvent = await createEvent(group.id, {
      platform: 'meetup',
      platformId: 'meetup-cancel-evt',
    });

    const res = await appRequest(eventsPath(group.id, `/${syncedEvent.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/synced/i);
  });

  it('volunteer cannot cancel - returns 403', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader: ownerCookie } = await createSession(owner.id);

    // Owner creates event
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    // Volunteer tries to cancel
    const volunteer = await createUser();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const { cookieHeader: volCookie } = await createSession(volunteer.id);

    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: volCookie },
    });

    expect(res.status).toBe(403);
  });

  it('member cannot cancel - returns 403', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader: ownerCookie } = await createSession(owner.id);

    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    const member = await createUser();
    await addGroupMember(group.id, member.id, 'member');
    const { cookieHeader: memberCookie } = await createSession(member.id);

    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: memberCookie },
    });

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent event', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader } = await createSession(owner.id);

    const res = await appRequest(eventsPath(group.id, '/nonexistent-evt/cancel'), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(404);
  });

  it('unauthenticated request returns 401', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'unauth-cancel',
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}/cancel`), {
      env,
      method: 'POST',
    });

    expect(res.status).toBe(401);
  });
});

// ============== Platform Admin ==============

describe('Platform Admin Bypass', () => {
  it('admin can create events in any group without membership', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: validEventBody({ title: 'Admin Created Event' }),
    });

    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { event: { title: string; createdBy: string } } };
    expect(data.event.title).toBe('Admin Created Event');
    expect(data.event.createdBy).toBe(admin.id);
  });

  it('admin can update events in any group', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader: ownerCookie } = await createSession(owner.id);

    // Owner creates event
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    // Admin updates it without group membership
    const admin = await createAdminUser();
    const { cookieHeader: adminCookie } = await createSession(admin.id);

    const res = await appRequest(eventsPath(group.id, `/${created.id}`), {
      env,
      method: 'PUT',
      headers: { Cookie: adminCookie },
      body: { title: 'Admin Updated Title' },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { title: string } };
    expect(data.title).toBe('Admin Updated Title');
  });

  it('admin can cancel events in any group', async () => {
    const { env } = createTestEnv();
    const { owner, group } = await setupNativeGroupWithOwner();
    const { cookieHeader: ownerCookie } = await createSession(owner.id);

    // Owner creates event
    const createRes = await appRequest(eventsPath(group.id), {
      env,
      method: 'POST',
      headers: { Cookie: ownerCookie },
      body: validEventBody(),
    });
    expect(createRes.status).toBe(201);
    const { data: createData } = (await createRes.json()) as { data: { event: { id: string } } };
    const created = createData.event;

    // Admin cancels it without group membership
    const admin = await createAdminUser();
    const { cookieHeader: adminCookie } = await createSession(admin.id);

    const res = await appRequest(eventsPath(group.id, `/${created.id}/cancel`), {
      env,
      method: 'POST',
      headers: { Cookie: adminCookie },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { success: boolean } };
    expect(data.success).toBe(true);

    // Verify in database
    const db = getDb();
    const event = await db.query.events.findFirst({
      where: (e, { eq }) => eq(e.id, created.id),
    });
    expect(event!.status).toBe('cancelled');
  });

  it('admin can list events for any group', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'admin-list' });

    const res = await appRequest(eventsPath(group.id), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: unknown[] };
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('admin can view event detail for any group', async () => {
    const { env } = createTestEnv();
    const { group } = await setupNativeGroupWithOwner();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const event = await createEvent(group.id, {
      platform: 'tampa.dev',
      platformId: 'admin-detail',
      title: 'Admin Viewable Event',
    });

    const res = await appRequest(eventsPath(group.id, `/${event.id}`), {
      env,
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: { id: string; title: string } };
    expect(data.id).toBe(event.id);
    expect(data.title).toBe('Admin Viewable Event');
  });
});
