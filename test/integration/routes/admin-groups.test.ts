import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  createEvent,
  createBadge,
  awardBadge,
  addGroupMember,
  createFavorite,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';

// ── Helpers ──────────────────────────────────────────────────────────

function deletePath(groupId: string, hard = false): string {
  return `/admin/groups/${groupId}${hard ? '?hard=true' : ''}`;
}

// ── Soft Delete ──────────────────────────────────────────────────────

describe('Admin Group Delete - Soft (DELETE /admin/groups/:id)', () => {
  it('soft-deletes a group (sets isActive = false)', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup({ isActive: true });

    const res = await appRequest(deletePath(group.id), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { success: boolean; message: string } };
    expect(body.data.success).toBe(true);
    expect(body.data.message).toBe('Group deactivated');

    // Verify the group still exists but is inactive
    const db = getDb();
    const updated = await db.query.groups.findFirst({
      where: eq(schema.groups.id, group.id),
    });
    expect(updated).toBeTruthy();
    expect(updated!.isActive).toBe(false);
  });

  it('returns 404 for non-existent group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(deletePath('nonexistent-id'), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id), {
      env,
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(403);
  });

  it('preserves related data after soft delete', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    const event = await createEvent(group.id);
    const badge = await createBadge({ groupId: group.id, slug: 'soft-del-badge' });
    const member = await createUser();
    await addGroupMember(group.id, member.id, 'member');

    // Soft delete
    const res = await appRequest(deletePath(group.id), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify related data still exists
    const db = getDb();
    const events = await db.query.events.findMany({ where: eq(schema.events.groupId, group.id) });
    expect(events.length).toBe(1);

    const badges = await db.query.badges.findMany({ where: eq(schema.badges.groupId, group.id) });
    expect(badges.length).toBe(1);

    const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, group.id) });
    expect(members.length).toBe(1);
  });
});

// ── Hard Delete ──────────────────────────────────────────────────────

describe('Admin Group Delete - Hard (DELETE /admin/groups/:id?hard=true)', () => {
  it('permanently deletes the group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { success: boolean; message: string } };
    expect(body.data.success).toBe(true);
    expect(body.data.message).toBe('Group permanently deleted');

    // Verify the group no longer exists
    const db = getDb();
    const deleted = await db.query.groups.findFirst({
      where: eq(schema.groups.id, group.id),
    });
    expect(deleted).toBeUndefined();
  });

  it('deletes associated events and their dependents', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    const event = await createEvent(group.id, { platform: 'tampa.dev', platformId: 'hard-del-evt' });

    // Add RSVP, checkin code, and checkin for this event
    const db = getDb();
    const rsvpUser = await createUser();
    await db.insert(schema.eventRsvps).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: rsvpUser.id,
      status: 'confirmed',
    });
    await db.insert(schema.eventCheckinCodes).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      code: 'DELTEST',
      createdBy: admin.id,
    });
    await db.insert(schema.eventCheckins).values({
      id: crypto.randomUUID(),
      eventId: event.id,
      userId: rsvpUser.id,
      method: 'link',
    });

    // Hard delete
    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify event and dependents are gone
    const events = await db.query.events.findMany({ where: eq(schema.events.groupId, group.id) });
    expect(events.length).toBe(0);

    const rsvps = await db.query.eventRsvps.findMany({ where: eq(schema.eventRsvps.eventId, event.id) });
    expect(rsvps.length).toBe(0);

    const checkins = await db.query.eventCheckins.findMany({ where: eq(schema.eventCheckins.eventId, event.id) });
    expect(checkins.length).toBe(0);

    const codes = await db.query.eventCheckinCodes.findMany({ where: eq(schema.eventCheckinCodes.eventId, event.id) });
    expect(codes.length).toBe(0);
  });

  it('deletes associated badges and their dependents', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    const badge = await createBadge({ groupId: group.id, slug: 'hard-del-badge' });

    // Award the badge to a user
    const badgeUser = await createUser();
    await awardBadge(badgeUser.id, badge.id);

    // Create a claim link for the badge
    const db = getDb();
    await db.insert(schema.badgeClaimLinks).values({
      id: crypto.randomUUID(),
      badgeId: badge.id,
      code: 'CLAIMTEST',
      createdBy: admin.id,
    });

    // Hard delete
    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify badges and dependents are gone
    const badges = await db.query.badges.findMany({ where: eq(schema.badges.groupId, group.id) });
    expect(badges.length).toBe(0);

    const userBadges = await db.query.userBadges.findMany({ where: eq(schema.userBadges.badgeId, badge.id) });
    expect(userBadges.length).toBe(0);

    const claimLinks = await db.query.badgeClaimLinks.findMany({ where: eq(schema.badgeClaimLinks.badgeId, badge.id) });
    expect(claimLinks.length).toBe(0);
  });

  it('cascades deletion to group members and favorites', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    // Add members and favorites
    const member1 = await createUser();
    const member2 = await createUser();
    await addGroupMember(group.id, member1.id, 'owner');
    await addGroupMember(group.id, member2.id, 'member');
    await createFavorite(member1.id, group.id);

    // Hard delete
    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify cascaded records are gone
    const db = getDb();
    const members = await db.query.groupMembers.findMany({ where: eq(schema.groupMembers.groupId, group.id) });
    expect(members.length).toBe(0);

    const favorites = await db.query.userFavorites.findMany({ where: eq(schema.userFavorites.groupId, group.id) });
    expect(favorites.length).toBe(0);
  });

  it('nullifies sync log and group creation request references', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    // Create a sync log referencing this group
    const db = getDb();
    const syncLogId = crypto.randomUUID();
    await db.insert(schema.syncLogs).values({
      id: syncLogId,
      platform: 'meetup',
      groupId: group.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success',
      eventsCreated: 1,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    // Create a group creation request referencing this group
    const requestId = crypto.randomUUID();
    await db.insert(schema.groupCreationRequests).values({
      id: requestId,
      userId: admin.id,
      groupName: 'Requested Group',
      description: 'A group creation request',
      status: 'approved',
      groupId: group.id,
    });

    // Hard delete
    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify sync log still exists but groupId is null
    const syncLog = await db.query.syncLogs.findFirst({ where: eq(schema.syncLogs.id, syncLogId) });
    expect(syncLog).toBeTruthy();
    expect(syncLog!.groupId).toBeNull();

    // Verify group creation request still exists but groupId is null
    const creationReq = await db.query.groupCreationRequests.findFirst({
      where: eq(schema.groupCreationRequests.id, requestId),
    });
    expect(creationReq).toBeTruthy();
    expect(creationReq!.groupId).toBeNull();
  });

  it('handles group with no related data', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { success: boolean; message: string } };
    expect(body.data.message).toBe('Group permanently deleted');

    const db = getDb();
    const deleted = await db.query.groups.findFirst({ where: eq(schema.groups.id, group.id) });
    expect(deleted).toBeUndefined();
  });

  it('returns 404 for non-existent group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(deletePath('nonexistent-id', true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();

    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(res.status).toBe(403);

    // Verify the group was NOT deleted
    const db = getDb();
    const intact = await db.query.groups.findFirst({ where: eq(schema.groups.id, group.id) });
    expect(intact).toBeTruthy();
    expect(intact!.isActive).toBe(true);
  });

  it('deletes multiple events and badges in a single hard delete', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    // Create multiple events and badges
    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'multi-evt-1' });
    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'multi-evt-2' });
    await createEvent(group.id, { platform: 'tampa.dev', platformId: 'multi-evt-3' });
    await createBadge({ groupId: group.id, slug: 'multi-badge-1' });
    await createBadge({ groupId: group.id, slug: 'multi-badge-2' });

    // Hard delete
    const res = await appRequest(deletePath(group.id, true), {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify all events and badges are gone
    const db = getDb();
    const events = await db.query.events.findMany({ where: eq(schema.events.groupId, group.id) });
    expect(events.length).toBe(0);

    const badges = await db.query.badges.findMany({ where: eq(schema.badges.groupId, group.id) });
    expect(badges.length).toBe(0);
  });
});
