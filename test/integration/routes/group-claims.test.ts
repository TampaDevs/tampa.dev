import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  addGroupMember,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// ============== 1. Group Claim Invite Flow (public endpoints) ==============

describe('Group Claims', () => {
  // ── GET /groups/claim/:token ─────────────────────────────────────

  describe('GET /groups/claim/:token', () => {
    it('returns group info for a valid invite', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'valid-token-get',
        autoApprove: true,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/valid-token-get', { env });
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        group: { id: string; name: string };
        autoApprove: boolean;
        claimable: boolean;
      };
      expect(data.group.id).toBe(group.id);
      expect(data.group.name).toBe(group.name);
      expect(data.autoApprove).toBe(true);
      expect(data.claimable).toBe(true);
    });

    it('returns 404 for invalid token', async () => {
      const { env } = createTestEnv();
      const res = await appRequest('/groups/claim/nonexistent-token', { env });
      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/not found/i);
    });

    it('returns 410 for already-used invite', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'used-token',
        autoApprove: true,
        createdBy: admin.id,
        usedBy: user.id,
        usedAt: new Date().toISOString(),
      });

      const res = await appRequest('/groups/claim/used-token', { env });
      expect(res.status).toBe(410);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already been used/i);
    });

    it('returns 410 for expired invite', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const group = await createGroup();
      const db = getDb();

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'expired-token',
        autoApprove: false,
        expiresAt: pastDate,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/expired-token', { env });
      expect(res.status).toBe(410);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/expired/i);
    });

    it('returns group info for invite with future expiration', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const group = await createGroup();
      const db = getDb();

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'future-expiry-token',
        autoApprove: false,
        expiresAt: futureDate,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/future-expiry-token', { env });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { autoApprove: boolean; claimable: boolean };
      expect(data.autoApprove).toBe(false);
      expect(data.claimable).toBe(true);
    });
  });

  // ── POST /groups/claim/:token ────────────────────────────────────

  describe('POST /groups/claim/:token', () => {
    it('with autoApprove=true: adds user as owner immediately', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'auto-approve-token',
        autoApprove: true,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/auto-approve-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; status: string; message: string };
      expect(data.success).toBe(true);
      expect(data.status).toBe('approved');

      // Verify user is now an owner
      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.userId, user.id),
        ),
      });
      expect(member).toBeTruthy();
      expect(member!.role).toBe('owner');
    });

    it('with autoApprove=true: upgrades existing member to owner', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      // Make user a regular member first
      await addGroupMember(group.id, user.id, 'member');

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'upgrade-token',
        autoApprove: true,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/upgrade-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { status: string };
      expect(data.status).toBe('approved');

      // Verify user is now an owner (upgraded from member)
      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.userId, user.id),
        ),
      });
      expect(member!.role).toBe('owner');
    });

    it('with autoApprove=false: creates pending claim request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'pending-token',
        autoApprove: false,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/pending-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; status: string; requestId: string };
      expect(data.success).toBe(true);
      expect(data.status).toBe('pending');
      expect(data.requestId).toBeTruthy();

      // Verify a claim request was created
      const request = await db.query.groupClaimRequests.findFirst({
        where: eq(schema.groupClaimRequests.id, data.requestId),
      });
      expect(request).toBeTruthy();
      expect(request!.status).toBe('pending');
      expect(request!.userId).toBe(user.id);
      expect(request!.groupId).toBe(group.id);
    });

    it('returns 401 if not authenticated', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'no-auth-token',
        autoApprove: true,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/no-auth-token', {
        env,
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('returns 410 for used invite on POST', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user1 = await createUser();
      const user2 = await createUser();
      const { cookieHeader } = await createSession(user2.id);
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'used-post-token',
        autoApprove: true,
        createdBy: admin.id,
        usedBy: user1.id,
        usedAt: new Date().toISOString(),
      });

      const res = await appRequest('/groups/claim/used-post-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(410);
    });

    it('returns 410 for expired invite on POST', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await db.insert(schema.groupClaimInvites).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        token: 'expired-post-token',
        autoApprove: true,
        expiresAt: pastDate,
        createdBy: admin.id,
      });

      const res = await appRequest('/groups/claim/expired-post-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(410);
    });

    it('marks invite as used after claiming', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      const inviteId = crypto.randomUUID();
      await db.insert(schema.groupClaimInvites).values({
        id: inviteId,
        groupId: group.id,
        token: 'mark-used-token',
        autoApprove: true,
        createdBy: admin.id,
      });

      await appRequest('/groups/claim/mark-used-token', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      // Verify invite is marked as used
      const invite = await db.query.groupClaimInvites.findFirst({
        where: eq(schema.groupClaimInvites.id, inviteId),
      });
      expect(invite!.usedBy).toBe(user.id);
      expect(invite!.usedAt).toBeTruthy();
    });

    it('returns 404 for nonexistent token on POST', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/groups/claim/does-not-exist', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /groups/:groupId/claim ──────────────────────────────────

  describe('POST /groups/:groupId/claim', () => {
    it('submits a pending claim request', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();

      const res = await appRequest(`/groups/${group.id}/claim`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { notes: 'I am the organizer of this group' },
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as { success: boolean; status: string; requestId: string };
      expect(data.success).toBe(true);
      expect(data.status).toBe('pending');
      expect(data.requestId).toBeTruthy();

      // Verify the claim request in the database
      const db = getDb();
      const request = await db.query.groupClaimRequests.findFirst({
        where: eq(schema.groupClaimRequests.id, data.requestId),
      });
      expect(request!.groupId).toBe(group.id);
      expect(request!.userId).toBe(user.id);
      expect(request!.notes).toBe('I am the organizer of this group');
    });

    it('returns 409 if already has pending request', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      // Create existing pending request
      await db.insert(schema.groupClaimRequests).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/groups/${group.id}/claim`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already have a pending/i);
    });

    it('returns 409 if already an owner', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();

      await addGroupMember(group.id, user.id, 'owner');

      const res = await appRequest(`/groups/${group.id}/claim`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already an owner/i);
    });

    it('returns 404 if group does not exist', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/groups/nonexistent-group-id/claim', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });

    it('returns 401 if not authenticated', async () => {
      const { env } = createTestEnv();
      const group = await createGroup();

      const res = await appRequest(`/groups/${group.id}/claim`, {
        env,
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('allows claim request when user has a rejected request', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      const db = getDb();

      // Create a previously rejected request
      await db.insert(schema.groupClaimRequests).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        userId: user.id,
        status: 'rejected',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/groups/${group.id}/claim`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      // Should succeed because the old request was rejected, not pending
      expect(res.status).toBe(201);
    });
  });
});

// ============== 2. Admin Claim Request Endpoints ==============

describe('Admin Claim Requests', () => {
  // ── GET /admin/claim-requests ────────────────────────────────────

  describe('GET /admin/claim-requests', () => {
    it('lists all claim requests', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user1 = await createUser();
      const user2 = await createUser();
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimRequests).values([
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          userId: user1.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          userId: user2.id,
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await appRequest('/admin/claim-requests', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { userId: string; groupName: string; userName: string }[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it('filters by status query param', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user1 = await createUser();
      const user2 = await createUser();
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimRequests).values([
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          userId: user1.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          userId: user2.id,
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await appRequest('/admin/claim-requests?status=pending', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { status: string }[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.data[0].status).toBe('pending');
      expect(body.pagination.total).toBe(1);
    });

    it('includes user and group info', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser({ name: 'Claim User', email: 'claim@test.local' });
      const group = await createGroup({ name: 'Claimed Group' });
      const db = getDb();

      await db.insert(schema.groupClaimRequests).values({
        id: crypto.randomUUID(),
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest('/admin/claim-requests', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: {
          userName: string;
          userEmail: string;
          groupName: string;
          groupUrlname: string;
        }[];
      };
      expect(body.data[0].userName).toBe('Claim User');
      expect(body.data[0].userEmail).toBe('claim@test.local');
      expect(body.data[0].groupName).toBe('Claimed Group');
      expect(body.data[0].groupUrlname).toBeTruthy();
    });
  });

  // ── POST /admin/claim-requests/:id/approve ───────────────────────

  describe('POST /admin/claim-requests/:id/approve', () => {
    it('approves request and adds user as owner', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/claim-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { success: boolean; message: string } };
      expect(body.data.success).toBe(true);

      // Verify request status updated
      const updated = await db.query.groupClaimRequests.findFirst({
        where: eq(schema.groupClaimRequests.id, requestId),
      });
      expect(updated!.status).toBe('approved');
      expect(updated!.reviewedBy).toBe(admin.id);
      expect(updated!.reviewedAt).toBeTruthy();

      // Verify user is now an owner
      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.userId, user.id),
        ),
      });
      expect(member).toBeTruthy();
      expect(member!.role).toBe('owner');
    });

    it('upgrades existing member to owner if already a member', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      // Make user a regular member first
      await addGroupMember(group.id, user.id, 'member');

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/claim-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);

      // Verify user was upgraded from member to owner
      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(schema.groupMembers.groupId, group.id),
          eq(schema.groupMembers.userId, user.id),
        ),
      });
      expect(member!.role).toBe('owner');
    });

    it('returns 400 if request is not pending', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'approved',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/claim-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already approved/i);
    });

    it('returns 404 for invalid id', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/claim-requests/nonexistent-id/approve', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /admin/claim-requests/:id/reject ────────────────────────

  describe('POST /admin/claim-requests/:id/reject', () => {
    it('rejects a pending request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/claim-requests/${requestId}/reject`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { notes: 'Not the real organizer' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { success: boolean; message: string } };
      expect(body.data.success).toBe(true);

      // Verify request status updated
      const updated = await db.query.groupClaimRequests.findFirst({
        where: eq(schema.groupClaimRequests.id, requestId),
      });
      expect(updated!.status).toBe('rejected');
      expect(updated!.reviewedBy).toBe(admin.id);
      expect(updated!.reviewedAt).toBeTruthy();
    });

    it('accepts optional notes on rejection', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'pending',
        notes: 'Original notes',
        createdAt: new Date().toISOString(),
      });

      await appRequest(`/admin/claim-requests/${requestId}/reject`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { notes: 'Rejected: insufficient proof' },
      });

      const updated = await db.query.groupClaimRequests.findFirst({
        where: eq(schema.groupClaimRequests.id, requestId),
      });
      expect(updated!.notes).toBe('Rejected: insufficient proof');
    });

    it('returns 400 if request is not pending', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const group = await createGroup();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupClaimRequests).values({
        id: requestId,
        groupId: group.id,
        userId: user.id,
        status: 'rejected',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/claim-requests/${requestId}/reject`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {},
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/claim-requests/nonexistent-id/reject', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {},
      });
      expect(res.status).toBe(404);
    });
  });
});

// ============== 3. Admin Claim Invite Endpoints ==============

describe('Admin Claim Invites', () => {
  // ── GET /admin/groups/:groupId/claim-invites ─────────────────────

  describe('GET /admin/groups/:groupId/claim-invites', () => {
    it('lists all invites for a group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();
      const db = getDb();

      await db.insert(schema.groupClaimInvites).values([
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          token: 'invite-list-1',
          autoApprove: true,
          createdBy: admin.id,
        },
        {
          id: crypto.randomUUID(),
          groupId: group.id,
          token: 'invite-list-2',
          autoApprove: false,
          createdBy: admin.id,
        },
      ]);

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { token: string; autoApprove: boolean }[] };
      expect(body.data).toHaveLength(2);
      const tokens = body.data.map((i) => i.token);
      expect(tokens).toContain('invite-list-1');
      expect(tokens).toContain('invite-list-2');
    });

    it('returns empty invites for group with none', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toEqual([]);
    });

    it('returns 404 for nonexistent group', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups/nonexistent-group/claim-invites', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /admin/groups/:groupId/claim-invites ────────────────────

  describe('POST /admin/groups/:groupId/claim-invites', () => {
    it('generates a new claim invite token', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { autoApprove: false },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        data: {
          id: string;
          token: string;
          groupId: string;
          autoApprove: boolean;
        };
      };
      expect(body.data.id).toBeTruthy();
      expect(body.data.token).toBeTruthy();
      expect(body.data.token.length).toBeGreaterThan(0);
      expect(body.data.groupId).toBe(group.id);
      expect(body.data.autoApprove).toBe(false);
    });

    it('supports autoApprove parameter', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { autoApprove: true },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { autoApprove: boolean } };
      expect(body.data.autoApprove).toBe(true);
    });

    it('supports expiresAt parameter', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { autoApprove: false, expiresAt },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { expiresAt: string } };
      expect(body.data.expiresAt).toBe(expiresAt);
    });

    it('returns 404 if group does not exist', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/groups/nonexistent-group/claim-invites', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { autoApprove: false },
      });
      expect(res.status).toBe(404);
    });

    it('sets createdBy to the admin user', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();

      const res = await appRequest(`/admin/groups/${group.id}/claim-invites`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { autoApprove: false },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { id: string; createdBy: string } };
      expect(body.data.createdBy).toBe(admin.id);
    });
  });
});

// ============== 4. Group Creation Request Flow ==============

describe('Group Creation Requests', () => {
  // ── POST /groups/request-creation ────────────────────────────────

  describe('POST /groups/request-creation', () => {
    it('submits a creation request when feature flag is enabled', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const db = getDb();

      // Create the feature flag (enabled by default)
      const flagId = crypto.randomUUID();
      await db.insert(schema.featureFlags).values({
        id: flagId,
        name: 'Self-serve Group Creation',
        slug: 'self-serve-group-creation',
        enabledByDefault: true,
      });

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'My New Community', description: 'A Tampa tech community' },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        data: {
          requestId: string;
          status: string;
          message: string;
        };
      };
      expect(body.data.status).toBe('pending');
      expect(body.data.requestId).toBeTruthy();

      // Verify in database
      const request = await db.query.groupCreationRequests.findFirst({
        where: eq(schema.groupCreationRequests.id, body.data.requestId),
      });
      expect(request!.groupName).toBe('My New Community');
      expect(request!.description).toBe('A Tampa tech community');
      expect(request!.userId).toBe(user.id);
    });

    it('returns 403 when feature flag is disabled', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const db = getDb();

      // Create the feature flag (disabled by default)
      await db.insert(schema.featureFlags).values({
        id: crypto.randomUUID(),
        name: 'Self-serve Group Creation',
        slug: 'self-serve-group-creation',
        enabledByDefault: false,
      });

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'Test Group' },
      });
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/not currently available/i);
    });

    it('returns 403 when feature flag does not exist', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'Test Group' },
      });
      expect(res.status).toBe(403);
    });

    it('returns 409 if user already has pending request', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const db = getDb();

      // Enable feature flag
      const flagId = crypto.randomUUID();
      await db.insert(schema.featureFlags).values({
        id: flagId,
        name: 'Self-serve Group Creation',
        slug: 'self-serve-group-creation',
        enabledByDefault: true,
      });

      // Create existing pending request
      await db.insert(schema.groupCreationRequests).values({
        id: crypto.randomUUID(),
        userId: user.id,
        groupName: 'Existing Request',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'Another Group' },
      });
      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already have a pending/i);
    });

    it('platform admin bypasses feature flag check', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      // No feature flag at all

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'Admin Requested Group' },
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { requestId: string; status: string } };
      expect(body.data.status).toBe('pending');
    });

    it('requires groupName in body', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { description: 'Missing groupName' },
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const { env } = createTestEnv();

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        body: { groupName: 'No Auth Group' },
      });
      expect(res.status).toBe(401);
    });

    it('allows request with user-level feature flag override', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const db = getDb();

      // Create the feature flag (disabled by default)
      const flagId = crypto.randomUUID();
      await db.insert(schema.featureFlags).values({
        id: flagId,
        name: 'Self-serve Group Creation',
        slug: 'self-serve-group-creation',
        enabledByDefault: false,
      });

      // Enable for this specific user
      await db.insert(schema.userFeatureFlags).values({
        id: crypto.randomUUID(),
        userId: user.id,
        flagId,
        enabled: true,
      });

      const res = await appRequest('/groups/request-creation', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { groupName: 'Overridden User Group' },
      });
      expect(res.status).toBe(201);
    });
  });

  // ── GET /admin/group-creation-requests ───────────────────────────

  describe('GET /admin/group-creation-requests', () => {
    it('lists creation requests', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      await db.insert(schema.groupCreationRequests).values([
        {
          id: crypto.randomUUID(),
          userId: user.id,
          groupName: 'Group A',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          userId: user.id,
          groupName: 'Group B',
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await appRequest('/admin/group-creation-requests', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { groupName: string; userName: string }[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it('filters by status', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      await db.insert(schema.groupCreationRequests).values([
        {
          id: crypto.randomUUID(),
          userId: user.id,
          groupName: 'Pending Group',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          userId: user.id,
          groupName: 'Approved Group',
          status: 'approved',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await appRequest('/admin/group-creation-requests?status=pending', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { groupName: string; status: string }[];
        pagination: { total: number };
      };
      expect(body.data).toHaveLength(1);
      expect(body.data[0].groupName).toBe('Pending Group');
      expect(body.pagination.total).toBe(1);
    });

    it('includes enriched user info', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser({ name: 'Creation Requester', email: 'requester@test.local' });
      const db = getDb();

      await db.insert(schema.groupCreationRequests).values({
        id: crypto.randomUUID(),
        userId: user.id,
        groupName: 'Enriched Group',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest('/admin/group-creation-requests', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { userName: string; userEmail: string }[];
      };
      expect(body.data[0].userName).toBe('Creation Requester');
      expect(body.data[0].userEmail).toBe('requester@test.local');
    });
  });

  // ── POST /admin/group-creation-requests/:id/approve ──────────────

  describe('POST /admin/group-creation-requests/:id/approve', () => {
    it('creates the group and sets requester as owner', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupCreationRequests).values({
        id: requestId,
        userId: user.id,
        groupName: 'Approved Community',
        description: 'A new community for Tampa devs',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/group-creation-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: {
          success: boolean;
          groupId: string;
          urlname: string;
        };
      };
      expect(body.data.success).toBe(true);
      expect(body.data.groupId).toBeTruthy();
      expect(body.data.urlname).toBeTruthy();

      // Verify group was created
      const group = await db.query.groups.findFirst({
        where: eq(schema.groups.id, body.data.groupId),
      });
      expect(group).toBeTruthy();
      expect(group!.name).toBe('Approved Community');
      expect(group!.platform).toBe('tampa.dev');

      // Verify requester is owner
      const member = await db.query.groupMembers.findFirst({
        where: and(
          eq(schema.groupMembers.groupId, body.data.groupId),
          eq(schema.groupMembers.userId, user.id),
        ),
      });
      expect(member).toBeTruthy();
      expect(member!.role).toBe('owner');
    });

    it('updates request with groupId after approval', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupCreationRequests).values({
        id: requestId,
        userId: user.id,
        groupName: 'Linked Group',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/group-creation-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      const body = (await res.json()) as { data: { groupId: string } };

      // Verify request was updated with groupId
      const updated = await db.query.groupCreationRequests.findFirst({
        where: eq(schema.groupCreationRequests.id, requestId),
      });
      expect(updated!.status).toBe('approved');
      expect(updated!.groupId).toBe(body.data.groupId);
      expect(updated!.reviewedBy).toBe(admin.id);
      expect(updated!.reviewedAt).toBeTruthy();
    });

    it('returns 400 if not pending', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupCreationRequests).values({
        id: requestId,
        userId: user.id,
        groupName: 'Already Approved',
        status: 'approved',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/group-creation-requests/${requestId}/approve`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toMatch(/already approved/i);
    });

    it('returns 404 for nonexistent request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/group-creation-requests/nonexistent/approve', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /admin/group-creation-requests/:id/reject ───────────────

  describe('POST /admin/group-creation-requests/:id/reject', () => {
    it('rejects the request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupCreationRequests).values({
        id: requestId,
        userId: user.id,
        groupName: 'Rejected Group',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/group-creation-requests/${requestId}/reject`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { success: boolean; message: string } };
      expect(body.data.success).toBe(true);

      // Verify status
      const updated = await db.query.groupCreationRequests.findFirst({
        where: eq(schema.groupCreationRequests.id, requestId),
      });
      expect(updated!.status).toBe('rejected');
      expect(updated!.reviewedBy).toBe(admin.id);
    });

    it('returns 400 if not pending', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const user = await createUser();
      const db = getDb();

      const requestId = crypto.randomUUID();
      await db.insert(schema.groupCreationRequests).values({
        id: requestId,
        userId: user.id,
        groupName: 'Already Rejected',
        status: 'rejected',
        createdAt: new Date().toISOString(),
      });

      const res = await appRequest(`/admin/group-creation-requests/${requestId}/reject`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent request', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/group-creation-requests/nonexistent/reject', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });
});
