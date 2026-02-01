import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createAdminUser,
  createSession,
  createGroup,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';

describe('Admin Platform Connections API', () => {
  describe('GET /admin/groups/:groupId/connections', () => {
    it('returns empty connections for a group with none', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      const res = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: unknown[] };
      expect(body.data).toEqual([]);
    });

    it('returns 404 for non-existent group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups/nonexistent/connections', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /admin/groups/:groupId/connections', () => {
    it('creates a connection for a group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup({ platform: 'tampa.dev', platformId: 'native-group' });

      const res = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          platform: 'meetup',
          platformId: 'meetup-123',
          platformUrlname: 'test-meetup-group',
          platformLink: 'https://meetup.com/test-meetup-group',
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { id: string; platform: string; platformId: string } };
      expect(body.data.platform).toBe('meetup');
      expect(body.data.platformId).toBe('meetup-123');

      // Verify it appears in GET
      const getRes = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      const getBody = await getRes.json() as { data: { id: string }[] };
      expect(getBody.data).toHaveLength(1);
      expect(getBody.data[0].id).toBe(body.data.id);
    });

    it('rejects duplicate platform+platformId', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      // Create first connection
      await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { platform: 'eventbrite', platformId: 'eb-456' },
      });

      // Try to create duplicate
      const res = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { platform: 'eventbrite', platformId: 'eb-456' },
      });
      expect(res.status).toBe(409);
    });

    it('returns 404 for non-existent group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups/nonexistent/connections', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { platform: 'meetup', platformId: 'test-123' },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /admin/connections/:connectionId', () => {
    it('deletes an existing connection', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      // Create connection
      const createRes = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { platform: 'luma', platformId: 'luma-789' },
      });
      const created = await createRes.json() as { data: { id: string } };

      // Delete it
      const res = await appRequest(`/admin/connections/${created.data.id}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { success: boolean } };
      expect(body.data.success).toBe(true);

      // Verify it's gone
      const getRes = await appRequest(`/admin/groups/${group.id}/connections`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      const getBody = await getRes.json() as { data: unknown[] };
      expect(getBody.data).toHaveLength(0);
    });

    it('returns 404 for non-existent connection', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/connections/nonexistent', {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Group creation with auto-connection', () => {
    it('creates a platform connection when creating a non-tampa.dev group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          urlname: 'auto-connect-group',
          name: 'Auto Connect Group',
          platform: 'meetup',
          platformId: 'meetup-auto-123',
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { id: string } };

      // Verify connection was auto-created
      const connRes = await appRequest(`/admin/groups/${body.data.id}/connections`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      const connBody = await connRes.json() as { data: { platform: string; platformId: string }[] };
      expect(connBody.data).toHaveLength(1);
      expect(connBody.data[0].platform).toBe('meetup');
      expect(connBody.data[0].platformId).toBe('meetup-auto-123');
    });

    it('does not create a connection for tampa.dev groups', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          urlname: 'native-group',
          name: 'Native Group',
          platform: 'tampa.dev',
          platformId: 'native-123',
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { id: string } };

      // Verify no connection was created
      const connRes = await appRequest(`/admin/groups/${body.data.id}/connections`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      const connBody = await connRes.json() as { data: unknown[] };
      expect(connBody.data).toHaveLength(0);
    });
  });
});

describe('Schema: New Tables', () => {
  it('can insert and query event_rsvps', async () => {
    const db = getDb();
    const user = await createAdminUser();
    const group = await createGroup();
    const { createEvent } = await import('../helpers');
    const event = await createEvent(group.id);

    await db.insert(schema.eventRsvps).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: user.id,
      status: 'confirmed',
    });

    const rsvps = await db.query.eventRsvps.findMany();
    expect(rsvps).toHaveLength(1);
    expect(rsvps[0].status).toBe('confirmed');
    expect(rsvps[0].eventId).toBe(event.id);
  });

  it('can insert and query event_checkin_codes and event_checkins', async () => {
    const db = getDb();
    const user = await createAdminUser();
    const group = await createGroup();
    const { createEvent } = await import('../helpers');
    const event = await createEvent(group.id);

    const codeId = crypto.randomUUID();
    await db.insert(schema.eventCheckinCodes).values({
      id: codeId,
      eventId: event.id,
      code: 'TESTCODE123',
      createdBy: user.id,
    });

    await db.insert(schema.eventCheckins).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: user.id,
      checkinCodeId: codeId,
      method: 'qr',
    });

    const codes = await db.query.eventCheckinCodes.findMany();
    expect(codes).toHaveLength(1);
    expect(codes[0].code).toBe('TESTCODE123');

    const checkins = await db.query.eventCheckins.findMany();
    expect(checkins).toHaveLength(1);
    expect(checkins[0].method).toBe('qr');
  });

  it('can insert and query group_claim_requests', async () => {
    const db = getDb();
    const user = await createAdminUser();
    const group = await createGroup();

    await db.insert(schema.groupClaimRequests).values({
      id: crypto.randomUUID(),
      groupId: group.id,
      userId: user.id,
      status: 'pending',
    });

    const requests = await db.query.groupClaimRequests.findMany();
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('pending');
    expect(requests[0].verificationData).toBeNull();
  });

  it('can insert and query group_claim_invites', async () => {
    const db = getDb();
    const user = await createAdminUser();
    const group = await createGroup();

    await db.insert(schema.groupClaimInvites).values({
      id: crypto.randomUUID(),
      groupId: group.id,
      token: 'test-invite-token',
      autoApprove: false,
      createdBy: user.id,
    });

    const invites = await db.query.groupClaimInvites.findMany();
    expect(invites).toHaveLength(1);
    expect(invites[0].token).toBe('test-invite-token');
    expect(invites[0].autoApprove).toBe(false);
  });

  it('can insert and query group_creation_requests', async () => {
    const db = getDb();
    const user = await createAdminUser();

    await db.insert(schema.groupCreationRequests).values({
      id: crypto.randomUUID(),
      userId: user.id,
      groupName: 'My New Group',
      description: 'A test group',
      status: 'pending',
    });

    const requests = await db.query.groupCreationRequests.findMany();
    expect(requests).toHaveLength(1);
    expect(requests[0].groupName).toBe('My New Group');
    expect(requests[0].status).toBe('pending');
  });

  it('badges support optional groupId', async () => {
    const db = getDb();
    const group = await createGroup();

    // Platform badge (no group)
    const { createBadge } = await import('../helpers');
    const platformBadge = await createBadge({ slug: 'platform-badge' });
    expect(platformBadge.groupId).toBeNull();

    // Group badge
    const groupBadge = await createBadge({ slug: 'group-badge', groupId: group.id });
    expect(groupBadge.groupId).toBe(group.id);
  });

  it('events support optional createdBy', async () => {
    const db = getDb();
    const user = await createAdminUser();
    const group = await createGroup();
    const { createEvent } = await import('../helpers');

    // Synced event (no createdBy)
    const syncedEvent = await createEvent(group.id);
    expect(syncedEvent.createdBy).toBeNull();

    // Native event (with createdBy)
    const nativeEvent = await createEvent(group.id, {
      platform: 'tampa.dev',
      createdBy: user.id,
    });
    expect(nativeEvent.createdBy).toBe(user.id);
  });

  it('groups have maxBadges and maxBadgePoints defaults', async () => {
    const group = await createGroup();
    expect(group.maxBadges).toBe(10);
    expect(group.maxBadgePoints).toBe(50);
  });
});

describe('Schema: GroupMemberRole enum', () => {
  it('includes owner, manager, volunteer, member', () => {
    expect(schema.GroupMemberRole).toEqual({
      OWNER: 'owner',
      MANAGER: 'manager',
      VOLUNTEER: 'volunteer',
      MEMBER: 'member',
    });
  });
});

describe('Schema: EventPlatform enum', () => {
  it('includes tampa.dev', () => {
    expect(schema.EventPlatform.TAMPA_DEV).toBe('tampa.dev');
  });
});
