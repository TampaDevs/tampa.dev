import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  createEvent,
  addGroupMember,
  getDb,
  appRequest,
} from '../helpers';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// ============== POST /groups/manage/:groupId/events/:eventId/checkin-codes ==============

describe('POST /groups/manage/:groupId/events/:eventId/checkin-codes', () => {
  it('generates a new checkin code for volunteer+', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-1' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-1' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { code: string; eventId: string; id: string } };
    expect(body.data.code).toHaveLength(8);
    expect(body.data.eventId).toBe(event.id);
    expect(body.data.id).toBeTruthy();
  });

  it('generates a checkin code for manager', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-2' });
    await addGroupMember(group.id, user.id, 'manager');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-2' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { code: string } };
    expect(body.data.code).toHaveLength(8);
  });

  it('generates a checkin code for owner', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-3' });
    await addGroupMember(group.id, user.id, 'owner');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-3' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
  });

  it('returns 401 if not authenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-4' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-4' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST' },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 if user is a regular member (not volunteer+)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-5' });
    await addGroupMember(group.id, user.id, 'member');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-5' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 if event does not belong to this group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-6' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const otherGroup = await createGroup({ platform: 'tampa.dev', platformId: 'cg-6b' });
    const event = await createEvent(otherGroup.id, { platform: 'tampa.dev', platformId: 'ce-6' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(404);
  });

  it('accepts optional maxUses in body', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-7' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-7' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { maxUses: 50 },
      },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { maxUses: number | null } };
    expect(body.data.maxUses).toBe(50);
  });

  it('accepts optional expiresAt in body', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-8' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-8' });

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { expiresAt: futureDate },
      },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { expiresAt: string | null } };
    expect(body.data.expiresAt).toBe(futureDate);
  });

  it('creates code with null maxUses and expiresAt by default', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-9' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-9' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { maxUses: number | null; expiresAt: string | null; currentUses: number } };
    expect(body.data.maxUses).toBeNull();
    expect(body.data.expiresAt).toBeNull();
    expect(body.data.currentUses).toBe(0);
  });

  it('generates codes using only unambiguous characters', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'cg-10' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ce-10' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { code: string } };
    // Code should not contain 0, O, 1, I, or L (ambiguous characters)
    expect(body.data.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });
});

// ============== GET /groups/manage/:groupId/events/:eventId/checkin-codes ==============

describe('GET /groups/manage/:groupId/events/:eventId/checkin-codes', () => {
  it('lists all checkin codes for an event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'lg-1' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'le-1' });

    // Create two codes
    await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; code: string; eventId: string }[] };
    expect(body.data).toHaveLength(2);
    expect(body.data[0].eventId).toBe(event.id);
    expect(body.data[1].eventId).toBe(event.id);
  });

  it('returns empty list when no codes exist', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'lg-2' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'le-2' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it('returns 403 if user is a regular member', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'lg-3' });
    await addGroupMember(group.id, user.id, 'member');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'le-3' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(403);
  });

  it('returns 401 if not authenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'lg-4' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'le-4' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env },
    );
    expect(res.status).toBe(401);
  });
});

// ============== DELETE /groups/manage/:groupId/checkin-codes/:codeId ==============

describe('DELETE /groups/manage/:groupId/checkin-codes/:codeId', () => {
  it('deletes a checkin code for manager+', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'dg-1' });
    await addGroupMember(group.id, user.id, 'manager');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'de-1' });

    // Create a code first
    const createRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    const createBody = (await createRes.json()) as { data: { id: string } };

    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/${createBody.data.id}`,
      { env, method: 'DELETE', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { success: boolean; message: string } };
    expect(body.data.success).toBe(true);
    expect(body.data.message).toBe('Checkin code deleted');

    // Verify it was deleted from DB
    const db = getDb();
    const deleted = await db.query.eventCheckinCodes.findFirst({
      where: eq(schema.eventCheckinCodes.id, createBody.data.id),
    });
    expect(deleted).toBeUndefined();
  });

  it('deletes a checkin code for owner', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'dg-2' });
    await addGroupMember(group.id, user.id, 'owner');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'de-2' });

    const createRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    const createBody = (await createRes.json()) as { data: { id: string } };

    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/${createBody.data.id}`,
      { env, method: 'DELETE', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
  });

  it('returns 403 for volunteer (needs manager+)', async () => {
    const { env } = createTestEnv();
    const volunteer = await createUser();
    const { cookieHeader: volunteerCookie } = await createSession(volunteer.id);
    const manager = await createUser();
    const { cookieHeader: managerCookie } = await createSession(manager.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'dg-3' });
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    await addGroupMember(group.id, manager.id, 'manager');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'de-3' });

    // Manager creates the code
    const createRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: managerCookie } },
    );
    const createBody = (await createRes.json()) as { data: { id: string } };

    // Volunteer tries to delete
    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/${createBody.data.id}`,
      { env, method: 'DELETE', headers: { Cookie: volunteerCookie } },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 if code does not belong to this group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group1 = await createGroup({ platform: 'tampa.dev', platformId: 'dg-4a' });
    const group2 = await createGroup({ platform: 'tampa.dev', platformId: 'dg-4b' });
    await addGroupMember(group1.id, user.id, 'manager');
    await addGroupMember(group2.id, user.id, 'manager');
    const event2 = await createEvent(group2.id, { platform: 'tampa.dev', platformId: 'de-4' });

    // Create code for group2's event
    const createRes = await appRequest(
      `/groups/manage/${group2.id}/events/${event2.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    const createBody = (await createRes.json()) as { data: { id: string } };

    // Try to delete from group1 context
    const res = await appRequest(
      `/groups/manage/${group1.id}/checkin-codes/${createBody.data.id}`,
      { env, method: 'DELETE', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 if code does not exist', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'dg-5' });
    await addGroupMember(group.id, user.id, 'manager');

    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/nonexistent-code-id`,
      { env, method: 'DELETE', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(404);
  });

  it('returns 401 if not authenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'dg-6' });

    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/any-code-id`,
      { env, method: 'DELETE' },
    );
    expect(res.status).toBe(401);
  });
});

// ============== GET /groups/manage/:groupId/events/:eventId/attendees ==============

describe('GET /groups/manage/:groupId/events/:eventId/attendees', () => {
  it('lists attendees with RSVP and checkin status', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader: managerCookie } = await createSession(manager.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ag-1' });
    await addGroupMember(group.id, manager.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ae-1' });

    // Create an RSVP user
    const attendee = await createUser();
    const db = getDb();
    await db.insert(schema.eventRsvps).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: attendee.id,
      status: 'confirmed',
      rsvpAt: new Date().toISOString(),
    });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: managerCookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        attendees: {
          userId: string;
          rsvpStatus: string;
          checkedIn: boolean;
          checkedInAt: string | null;
          checkinMethod: string | null;
          user: { id: string; name: string | null } | null;
        }[];
        totalConfirmed: number;
        totalWaitlisted: number;
        totalCheckedIn: number;
      };
    };
    expect(body.data.attendees).toHaveLength(1);
    expect(body.data.attendees[0].userId).toBe(attendee.id);
    expect(body.data.attendees[0].rsvpStatus).toBe('confirmed');
    expect(body.data.attendees[0].checkedIn).toBe(false);
    expect(body.data.attendees[0].checkedInAt).toBeNull();
    expect(body.data.attendees[0].checkinMethod).toBeNull();
    expect(body.data.attendees[0].user).toBeTruthy();
    expect(body.data.attendees[0].user!.id).toBe(attendee.id);
    expect(body.data.totalConfirmed).toBe(1);
    expect(body.data.totalWaitlisted).toBe(0);
    expect(body.data.totalCheckedIn).toBe(0);
  });

  it('shows checkedIn boolean, method, and timestamp when checked in', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader: managerCookie } = await createSession(manager.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ag-2' });
    await addGroupMember(group.id, manager.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ae-2' });

    const attendee = await createUser();
    const { cookieHeader: attendeeCookie } = await createSession(attendee.id);
    const db = getDb();

    // Create RSVP
    await db.insert(schema.eventRsvps).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: attendee.id,
      status: 'confirmed',
      rsvpAt: new Date().toISOString(),
    });

    // Create checkin code and check in
    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: managerCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: attendeeCookie },
      body: { method: 'qr' },
    });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: managerCookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        attendees: {
          userId: string;
          checkedIn: boolean;
          checkedInAt: string | null;
          checkinMethod: string | null;
        }[];
        totalCheckedIn: number;
      };
    };
    const attendeeRecord = body.data.attendees.find((a) => a.userId === attendee.id);
    expect(attendeeRecord).toBeTruthy();
    expect(attendeeRecord!.checkedIn).toBe(true);
    expect(attendeeRecord!.checkedInAt).toBeTruthy();
    expect(attendeeRecord!.checkinMethod).toBe('qr');
    expect(body.data.totalCheckedIn).toBe(1);
  });

  it('returns correct counts for mixed confirmed and waitlisted', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader: managerCookie } = await createSession(manager.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ag-3' });
    await addGroupMember(group.id, manager.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ae-3' });

    const db = getDb();
    const confirmedUser = await createUser();
    const waitlistedUser = await createUser();
    const cancelledUser = await createUser();

    await db.insert(schema.eventRsvps).values([
      {
        id: crypto.randomUUID(),
        eventId: event.id,
        userId: confirmedUser.id,
        status: 'confirmed',
        rsvpAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        eventId: event.id,
        userId: waitlistedUser.id,
        status: 'waitlisted',
        rsvpAt: new Date().toISOString(),
        waitlistPosition: 1,
      },
      {
        id: crypto.randomUUID(),
        eventId: event.id,
        userId: cancelledUser.id,
        status: 'cancelled',
        rsvpAt: new Date().toISOString(),
      },
    ]);

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: managerCookie } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        attendees: { userId: string }[];
        totalConfirmed: number;
        totalWaitlisted: number;
        totalCheckedIn: number;
      };
    };
    // Attendees list excludes cancelled RSVPs
    expect(body.data.attendees).toHaveLength(2);
    expect(body.data.totalConfirmed).toBe(1);
    expect(body.data.totalWaitlisted).toBe(1);
    expect(body.data.totalCheckedIn).toBe(0);
  });

  it('returns 403 if user is a regular member', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ag-4' });
    await addGroupMember(group.id, user.id, 'member');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ae-4' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(403);
  });

  it('returns 401 if not authenticated', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ag-5' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'ae-5' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env },
    );
    expect(res.status).toBe(401);
  });
});

// ============== GET /checkin/:code (Public) ==============

describe('GET /checkin/:code', () => {
  it('returns event and group info for a valid code (no auth)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'pg-1' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'pe-1' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    // Fetch without auth
    const res = await appRequest(`/checkin/${codeBody.data.code}`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        event: { id: string; title: string; startTime: string; timezone: string };
        group: { id: string; name: string; urlname: string } | null;
        checkinAvailable: boolean;
      };
    };
    expect(body.data.event.id).toBe(event.id);
    expect(body.data.event.title).toBeTruthy();
    expect(body.data.group).toBeTruthy();
    expect(body.data.group!.id).toBe(group.id);
    expect(body.data.checkinAvailable).toBe(true);
  });

  it('returns 404 for invalid code', async () => {
    const { env } = createTestEnv();

    const res = await appRequest('/checkin/ZZZZZZZZ', { env });
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('not found');
  });

  it('returns 410 for expired code', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'pg-3' });
    await addGroupMember(group.id, user.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'pe-3' });

    // Create a code with already-passed expiry
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { expiresAt: pastDate },
      },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const res = await appRequest(`/checkin/${codeBody.data.code}`, { env });
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('expired');
  });

  it('returns 410 for max-uses-reached code', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'pg-4' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'pe-4' });

    // Create code with maxUses=1
    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: creatorCookie },
        body: { maxUses: 1 },
      },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    // Use up the code
    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);
    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });

    // Now GET should return 410
    const res = await appRequest(`/checkin/${codeBody.data.code}`, { env });
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('maximum uses');
  });
});

// ============== POST /checkin/:code (Public, Auth Required) ==============

describe('POST /checkin/:code', () => {
  it('creates a checkin record', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-1' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-1' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string; id: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { id: string; eventId: string; checkedInAt: string; method: string };
    };
    expect(body.data.eventId).toBe(event.id);
    expect(body.data.checkedInAt).toBeTruthy();
    expect(body.data.method).toBe('link'); // default method

    // Verify DB record
    const db = getDb();
    const checkin = await db.query.eventCheckins.findFirst({
      where: eq(schema.eventCheckins.id, body.data.id),
    });
    expect(checkin).toBeTruthy();
    expect(checkin!.userId).toBe(checkinUser.id);
    expect(checkin!.eventId).toBe(event.id);
    expect(checkin!.checkinCodeId).toBe(codeBody.data.id);
  });

  it('increments currentUses on the code', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-2' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-2' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string; id: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });

    // Verify currentUses incremented
    const db = getDb();
    const updatedCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(schema.eventCheckinCodes.id, codeBody.data.id),
    });
    expect(updatedCode!.currentUses).toBe(1);
  });

  it('returns 409 if already checked in (uniqueness per user per event)', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-3' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-3' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    // First checkin
    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });

    // Second attempt
    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Already checked in');
  });

  it('returns 401 if not authenticated', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-4' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-4' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('returns 410 for expired code', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-5' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-5' });

    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: creatorCookie },
        body: { expiresAt: pastDate },
      },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('expired');
  });

  it('returns 410 for maxed-out code', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-6' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-6' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      {
        env,
        method: 'POST',
        headers: { Cookie: creatorCookie },
        body: { maxUses: 1 },
      },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    // First user checks in successfully
    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });

    // Second user should get 410
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);
    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('maximum uses');
  });

  it('supports method field "qr"', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-7' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-7' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
      body: { method: 'qr' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { method: string } };
    expect(body.data.method).toBe('qr');
  });

  it('supports method field "nfc"', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-8' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-8' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
      body: { method: 'nfc' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { method: string } };
    expect(body.data.method).toBe('nfc');
  });

  it('defaults to "link" method when no body provided', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-9' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-9' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { method: string } };
    expect(body.data.method).toBe('link');
  });

  it('ignores invalid method values and defaults to "link"', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-10' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-10' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    const res = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
      body: { method: 'bluetooth' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { method: string } };
    expect(body.data.method).toBe('link');
  });

  it('returns 404 for nonexistent checkin code', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/checkin/NONEXIST', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('emits dev.tampa.event.checkin domain event', async () => {
    const { env, mockQueue } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-12' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-12' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string; id: string } };

    const checkinUser = await createUser();
    const { cookieHeader: checkinCookie } = await createSession(checkinUser.id);

    mockQueue.messages.length = 0;

    await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: checkinCookie },
      body: { method: 'qr' },
    });

    const checkinEvent = mockQueue.messages.find(
      (m) => (m.body as { type: string }).type === 'dev.tampa.event.checkin',
    );
    expect(checkinEvent).toBeDefined();
    const payload = (checkinEvent!.body as {
      payload: { eventId: string; userId: string; checkinCodeId: string; method: string };
    }).payload;
    expect(payload.eventId).toBe(event.id);
    expect(payload.userId).toBe(checkinUser.id);
    expect(payload.checkinCodeId).toBe(codeBody.data.id);
    expect(payload.method).toBe('qr');
  });

  it('allows different users to check in with the same code', async () => {
    const { env } = createTestEnv();
    const creator = await createUser();
    const { cookieHeader: creatorCookie } = await createSession(creator.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ci-13' });
    await addGroupMember(group.id, creator.id, 'volunteer');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'cie-13' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: creatorCookie } },
    );
    const codeBody = (await codeRes.json()) as { data: { code: string; id: string } };

    const user1 = await createUser();
    const { cookieHeader: cookie1 } = await createSession(user1.id);
    const user2 = await createUser();
    const { cookieHeader: cookie2 } = await createSession(user2.id);

    const res1 = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie1 },
    });
    expect(res1.status).toBe(201);

    const res2 = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookie2 },
    });
    expect(res2.status).toBe(201);

    // Verify currentUses is 2
    const db = getDb();
    const updatedCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(schema.eventCheckinCodes.id, codeBody.data.id),
    });
    expect(updatedCode!.currentUses).toBe(2);
  });
});

// ============== Platform Admin Bypass ==============

describe('Platform Admin Bypass', () => {
  it('admin user can create checkin codes without group membership', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ab-1' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'abe-1' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { code: string } };
    expect(body.data.code).toHaveLength(8);
  });

  it('admin user can list checkin codes without group membership', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ab-2' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'abe-2' });

    // Create a code first
    await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });

  it('admin user can delete checkin codes without group membership', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ab-3' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'abe-3' });

    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: cookieHeader } },
    );
    const codeBody = (await codeRes.json()) as { data: { id: string } };

    const res = await appRequest(
      `/groups/manage/${group.id}/checkin-codes/${codeBody.data.id}`,
      { env, method: 'DELETE', headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
  });

  it('admin user can view attendees without group membership', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'ab-4' });
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'abe-4' });

    const res = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: cookieHeader } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        attendees: unknown[];
        totalConfirmed: number;
        totalWaitlisted: number;
        totalCheckedIn: number;
      };
    };
    expect(body.data.attendees).toHaveLength(0);
    expect(body.data.totalConfirmed).toBe(0);
    expect(body.data.totalCheckedIn).toBe(0);
  });
});

// ============== Full Checkin Flow ==============

describe('Full Checkin Flow', () => {
  it('end-to-end: create code, check in, verify attendee list', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader: managerCookie } = await createSession(manager.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'flow-1' });
    await addGroupMember(group.id, manager.id, 'manager');
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'flowe-1' });

    // Step 1: Manager creates checkin code
    const codeRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, method: 'POST', headers: { Cookie: managerCookie } },
    );
    expect(codeRes.status).toBe(201);
    const codeBody = (await codeRes.json()) as { data: { code: string; id: string } };

    // Step 2: Attendee RSVPs (add RSVP directly in DB)
    const attendee = await createUser();
    const { cookieHeader: attendeeCookie } = await createSession(attendee.id);
    const db = getDb();
    await db.insert(schema.eventRsvps).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: attendee.id,
      status: 'confirmed',
      rsvpAt: new Date().toISOString(),
    });

    // Step 3: Attendee looks up checkin code info (no auth)
    const lookupRes = await appRequest(`/checkin/${codeBody.data.code}`, { env });
    expect(lookupRes.status).toBe(200);
    const lookupBody = (await lookupRes.json()) as { data: { event: { id: string }; checkinAvailable: boolean } };
    expect(lookupBody.data.event.id).toBe(event.id);
    expect(lookupBody.data.checkinAvailable).toBe(true);

    // Step 4: Attendee checks in
    const checkinRes = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: attendeeCookie },
      body: { method: 'qr' },
    });
    expect(checkinRes.status).toBe(201);

    // Step 5: Manager views attendee list
    const attendeesRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/attendees`,
      { env, headers: { Cookie: managerCookie } },
    );
    expect(attendeesRes.status).toBe(200);
    const attendeesBody = (await attendeesRes.json()) as {
      data: {
        attendees: {
          userId: string;
          checkedIn: boolean;
          checkinMethod: string | null;
          checkedInAt: string | null;
          rsvpStatus: string;
        }[];
        totalConfirmed: number;
        totalCheckedIn: number;
      };
    };
    expect(attendeesBody.data.attendees).toHaveLength(1);
    expect(attendeesBody.data.attendees[0].userId).toBe(attendee.id);
    expect(attendeesBody.data.attendees[0].checkedIn).toBe(true);
    expect(attendeesBody.data.attendees[0].checkinMethod).toBe('qr');
    expect(attendeesBody.data.attendees[0].checkedInAt).toBeTruthy();
    expect(attendeesBody.data.attendees[0].rsvpStatus).toBe('confirmed');
    expect(attendeesBody.data.totalConfirmed).toBe(1);
    expect(attendeesBody.data.totalCheckedIn).toBe(1);

    // Step 6: Manager lists codes and verifies currentUses
    const codesRes = await appRequest(
      `/groups/manage/${group.id}/events/${event.id}/checkin-codes`,
      { env, headers: { Cookie: managerCookie } },
    );
    expect(codesRes.status).toBe(200);
    const codesBody = (await codesRes.json()) as { data: { id: string; currentUses: number }[] };
    expect(codesBody.data).toHaveLength(1);
    expect(codesBody.data[0].currentUses).toBe(1);

    // Step 7: Attendee tries to check in again -> 409
    const dupRes = await appRequest(`/checkin/${codeBody.data.code}`, {
      env,
      method: 'POST',
      headers: { Cookie: attendeeCookie },
    });
    expect(dupRes.status).toBe(409);
  });
});
