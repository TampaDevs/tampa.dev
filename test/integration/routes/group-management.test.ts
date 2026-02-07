import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  addGroupMember,
  grantEntitlement,
  appRequest,
  getDb,
} from '../helpers';
import { hasMinRole, ROLE_HIERARCHY, isPlatformAdmin } from '../../../src/lib/auth';

// ============== Unit: auth helpers ==============

describe('Auth Helpers: hasMinRole', () => {
  it('owner has all roles', () => {
    expect(hasMinRole('owner', 'owner')).toBe(true);
    expect(hasMinRole('owner', 'manager')).toBe(true);
    expect(hasMinRole('owner', 'volunteer')).toBe(true);
    expect(hasMinRole('owner', 'member')).toBe(true);
  });

  it('manager has manager and below', () => {
    expect(hasMinRole('manager', 'owner')).toBe(false);
    expect(hasMinRole('manager', 'manager')).toBe(true);
    expect(hasMinRole('manager', 'volunteer')).toBe(true);
    expect(hasMinRole('manager', 'member')).toBe(true);
  });

  it('volunteer has volunteer and below', () => {
    expect(hasMinRole('volunteer', 'owner')).toBe(false);
    expect(hasMinRole('volunteer', 'manager')).toBe(false);
    expect(hasMinRole('volunteer', 'volunteer')).toBe(true);
    expect(hasMinRole('volunteer', 'member')).toBe(true);
  });

  it('member only has member', () => {
    expect(hasMinRole('member', 'owner')).toBe(false);
    expect(hasMinRole('member', 'manager')).toBe(false);
    expect(hasMinRole('member', 'volunteer')).toBe(false);
    expect(hasMinRole('member', 'member')).toBe(true);
  });

  it('returns false for unknown roles', () => {
    expect(hasMinRole('unknown', 'member')).toBe(false);
    expect(hasMinRole('member', 'unknown')).toBe(false);
  });
});

describe('Auth Helpers: isPlatformAdmin', () => {
  it('admin and superadmin are platform admins', () => {
    expect(isPlatformAdmin({ role: 'admin' })).toBe(true);
    expect(isPlatformAdmin({ role: 'superadmin' })).toBe(true);
  });

  it('regular user is not a platform admin', () => {
    expect(isPlatformAdmin({ role: 'user' })).toBe(false);
  });
});

describe('Auth Helpers: ROLE_HIERARCHY', () => {
  it('has correct order', () => {
    expect(ROLE_HIERARCHY).toEqual(['owner', 'manager', 'volunteer', 'member']);
  });
});

// ============== Integration: Group Creation ==============

describe('Group Creation (POST /groups/create)', () => {
  it('creates a native group with entitlement', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    await grantEntitlement(user.id, 'dev.tampa.group.create');

    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {
        urlname: 'my-new-group',
        name: 'My New Group',
        description: 'A test native group',
      },
    });

    expect(res.status).toBe(201);
    const json = await res.json() as { data: { id: string; platform: string; urlname: string; name: string } };
    expect(json.data.platform).toBe('tampa.dev');
    expect(json.data.urlname).toBe('my-new-group');
    expect(json.data.name).toBe('My New Group');
  });

  it('consumes the entitlement on creation', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    await grantEntitlement(user.id, 'dev.tampa.group.create');

    // First creation should succeed
    const res1 = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'group-one', name: 'Group One' },
    });
    expect(res1.status).toBe(201);

    // Second creation should fail (entitlement consumed)
    const res2 = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'group-two', name: 'Group Two' },
    });
    expect(res2.status).toBe(403);
  });

  it('platform admin can create without entitlement', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'admin-group', name: 'Admin Group' },
    });
    expect(res.status).toBe(201);
  });

  it('rejects creation without entitlement', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'no-ent-group', name: 'No Entitlement' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate urlname', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'duplicate-group', name: 'First' },
    });

    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'duplicate-group', name: 'Second' },
    });
    expect(res.status).toBe(409);
  });

  it('creates owner membership on group creation', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'owner-test', name: 'Owner Test' },
    });
    expect(res.status).toBe(201);
    const json = await res.json() as { data: { id: string } };
    const group = json.data;

    // Verify membership
    const db = getDb();
    const member = await db.query.groupMembers.findFirst({
      where: (m, { and, eq }) => and(
        eq(m.groupId, group.id),
        eq(m.userId, admin.id),
      ),
    });
    expect(member).toBeTruthy();
    expect(member!.role).toBe('owner');
  });

  it('returns 401 for unauthenticated requests', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/groups/create', {
      env,
      method: 'POST',
      body: { urlname: 'no-auth', name: 'No Auth' },
    });
    expect(res.status).toBe(401);
  });
});

// ============== Integration: List Managed Groups ==============

describe('List Managed Groups (GET /groups/manage)', () => {
  it('returns groups where user is owner/manager/volunteer', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const group1 = await createGroup({ platform: 'tampa.dev', platformId: 'native-1' });
    const group2 = await createGroup({ platform: 'tampa.dev', platformId: 'native-2' });
    const group3 = await createGroup({ platform: 'tampa.dev', platformId: 'native-3' });

    await addGroupMember(group1.id, user.id, 'owner');
    await addGroupMember(group2.id, user.id, 'manager');
    await addGroupMember(group3.id, user.id, 'member'); // Not volunteer+, won't be listed

    const res = await appRequest('/groups/manage', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { id: string; userRole: string }[] };
    expect(json.data).toHaveLength(2); // Only owner and manager
    const ids = json.data.map((g) => g.id);
    expect(ids).toContain(group1.id);
    expect(ids).toContain(group2.id);
  });

  it('platform admin sees all groups', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    await createGroup();
    await createGroup();

    const res = await appRequest('/groups/manage', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { userRole: string }[] };
    expect(json.data.length).toBeGreaterThanOrEqual(2);
    expect(json.data[0].userRole).toBe('admin');
  });

  it('returns empty for user with no management roles', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/groups/manage', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: unknown[] };
    expect(json.data).toEqual([]);
  });
});

// ============== Integration: Group Detail ==============

describe('Group Detail (GET /groups/manage/:groupId)', () => {
  it('returns group details with user role and permissions', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'native-detail' });
    await addGroupMember(group.id, user.id, 'owner');

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as {
      data: {
        id: string;
        userRole: string;
        memberCount: number;
        permissions: Record<string, boolean>;
      };
    };
    expect(json.data.id).toBe(group.id);
    expect(json.data.userRole).toBe('owner');
    expect(json.data.memberCount).toBe(1);
    expect(json.data.permissions.canEditSettings).toBe(true);
    expect(json.data.permissions.canManageMembers).toBe(true);
  });

  it('returns 403 for member (not volunteer+)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'member');

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest('/groups/manage/nonexistent', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('platform admin can view any group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { userRole: string } };
    expect(json.data.userRole).toBe('admin');
  });
});

// ============== Integration: Update Group ==============

describe('Update Group (PUT /groups/manage/:groupId)', () => {
  it('owner can update group settings', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ platform: 'tampa.dev', platformId: 'update-test' });
    await addGroupMember(group.id, user.id, 'owner');

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { name: 'Updated Name', description: 'Updated description' },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { name: string; description: string } };
    expect(json.data.name).toBe('Updated Name');
    expect(json.data.description).toBe('Updated description');
  });

  it('volunteer cannot update group settings', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { name: 'Updated Name' },
    });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate urlname on update', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group1 = await createGroup({ urlname: 'existing-url' });
    const group2 = await createGroup();
    await addGroupMember(group2.id, user.id, 'owner');

    const res = await appRequest(`/groups/manage/${group2.id}`, {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'existing-url' },
    });
    expect(res.status).toBe(409);
  });
});

// ============== Integration: My Role ==============

describe('My Role (GET /groups/manage/:groupId/my-role)', () => {
  it('returns user role and permissions', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');

    const res = await appRequest(`/groups/manage/${group.id}/my-role`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string; permissions: Record<string, boolean> } };
    expect(json.data.role).toBe('volunteer');
    expect(json.data.permissions.canCheckIn).toBe(true);
    expect(json.data.permissions.canEditSettings).toBe(false);
  });

  it('returns null role for non-member', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}/my-role`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string | null; permissions: Record<string, boolean> } };
    expect(json.data.role).toBeNull();
    expect(json.data.permissions.canEditSettings).toBe(false);
  });
});

// ============== Integration: Member Management ==============

describe('Member Management', () => {
  describe('GET /groups/manage/:groupId/members', () => {
    it('lists members with user details', async () => {
      const { env } = createTestEnv();
      const owner = await createUser();
      const { cookieHeader } = await createSession(owner.id);
      const group = await createGroup();
      await addGroupMember(group.id, owner.id, 'owner');

      const member = await createUser();
      await addGroupMember(group.id, member.id, 'member');

      const res = await appRequest(`/groups/manage/${group.id}/members`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { userId: string; role: string; user: { name: string } }[] };
      expect(json.data).toHaveLength(2);
    });

    it('returns 403 for regular member', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup();
      await addGroupMember(group.id, user.id, 'member');

      const res = await appRequest(`/groups/manage/${group.id}/members`, {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /groups/manage/:groupId/members', () => {
    it('manager can add a member', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      await addGroupMember(group.id, manager.id, 'manager');

      const newUser = await createUser();

      const res = await appRequest(`/groups/manage/${group.id}/members`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { userId: newUser.id, role: 'member' },
      });
      expect(res.status).toBe(201);
    });

    it('rejects duplicate member', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      await addGroupMember(group.id, manager.id, 'manager');

      const existingUser = await createUser();
      await addGroupMember(group.id, existingUser.id, 'member');

      const res = await appRequest(`/groups/manage/${group.id}/members`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { userId: existingUser.id },
      });
      expect(res.status).toBe(409);
    });

    it('returns 404 for non-existent user', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      await addGroupMember(group.id, manager.id, 'manager');

      const res = await appRequest(`/groups/manage/${group.id}/members`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: { userId: 'nonexistent-user' },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /groups/manage/:groupId/members/:memberId', () => {
    it('owner can change role to any level', async () => {
      const { env } = createTestEnv();
      const owner = await createUser();
      const { cookieHeader } = await createSession(owner.id);
      const group = await createGroup();
      await addGroupMember(group.id, owner.id, 'owner');

      const user = await createUser();
      const membership = await addGroupMember(group.id, user.id, 'member');

      const res = await appRequest(`/groups/manage/${group.id}/members/${membership.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { role: 'manager' },
      });
      expect(res.status).toBe(200);
      const json = await res.json() as { data: { role: string } };
      expect(json.data.role).toBe('manager');
    });

    it('manager can only assign volunteer or member', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      await addGroupMember(group.id, manager.id, 'manager');

      const user = await createUser();
      const membership = await addGroupMember(group.id, user.id, 'member');

      // Should succeed: member -> volunteer
      const res1 = await appRequest(`/groups/manage/${group.id}/members/${membership.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { role: 'volunteer' },
      });
      expect(res1.status).toBe(200);

      // Should fail: volunteer -> owner
      const res2 = await appRequest(`/groups/manage/${group.id}/members/${membership.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { role: 'owner' },
      });
      expect(res2.status).toBe(403);
    });

    it('manager cannot change owner or manager role', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      const owner = await createUser();
      const ownerMembership = await addGroupMember(group.id, owner.id, 'owner');
      await addGroupMember(group.id, manager.id, 'manager');

      const res = await appRequest(`/groups/manage/${group.id}/members/${ownerMembership.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { role: 'member' },
      });
      expect(res.status).toBe(403);
    });

    it('prevents demoting last owner', async () => {
      const { env } = createTestEnv();
      const owner = await createUser();
      const { cookieHeader } = await createSession(owner.id);
      const group = await createGroup();
      const membership = await addGroupMember(group.id, owner.id, 'owner');

      const res = await appRequest(`/groups/manage/${group.id}/members/${membership.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { role: 'manager' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /groups/manage/:groupId/members/:memberId', () => {
    it('owner can remove a member', async () => {
      const { env } = createTestEnv();
      const owner = await createUser();
      const { cookieHeader } = await createSession(owner.id);
      const group = await createGroup();
      await addGroupMember(group.id, owner.id, 'owner');

      const user = await createUser();
      const membership = await addGroupMember(group.id, user.id, 'member');

      const res = await appRequest(`/groups/manage/${group.id}/members/${membership.id}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('manager cannot remove owner', async () => {
      const { env } = createTestEnv();
      const manager = await createUser();
      const { cookieHeader } = await createSession(manager.id);
      const group = await createGroup();
      const owner = await createUser();
      const ownerMembership = await addGroupMember(group.id, owner.id, 'owner');
      await addGroupMember(group.id, manager.id, 'manager');

      const res = await appRequest(`/groups/manage/${group.id}/members/${ownerMembership.id}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(403);
    });

    it('cannot remove last owner', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);
      const group = await createGroup();
      const owner = await createUser();
      const ownerMembership = await addGroupMember(group.id, owner.id, 'owner');

      const res = await appRequest(`/groups/manage/${group.id}/members/${ownerMembership.id}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(400);
    });
  });
});

// ============== Integration: Leave Group ==============

describe('Leave Group (POST /groups/manage/:groupId/leave)', () => {
  it('member can leave a group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'member');

    const res = await appRequest(`/groups/manage/${group.id}/leave`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify membership is gone
    const db = getDb();
    const member = await db.query.groupMembers.findFirst({
      where: (m, { and, eq }) => and(
        eq(m.groupId, group.id),
        eq(m.userId, user.id),
      ),
    });
    expect(member).toBeUndefined();
  });

  it('last owner cannot leave', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'owner');

    const res = await appRequest(`/groups/manage/${group.id}/leave`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(400);
  });

  it('owner can leave when other owners exist', async () => {
    const { env } = createTestEnv();
    const user1 = await createUser();
    const user2 = await createUser();
    const { cookieHeader } = await createSession(user1.id);
    const group = await createGroup();
    await addGroupMember(group.id, user1.id, 'owner');
    await addGroupMember(group.id, user2.id, 'owner');

    const res = await appRequest(`/groups/manage/${group.id}/leave`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
  });

  it('returns 400 for non-member', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}/leave`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(400);
  });
});

// ============== Integration: Platform Admin Bypass ==============

describe('Platform Admin Bypass', () => {
  it('platform admin can update any group without membership', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}`, {
      env,
      method: 'PUT',
      headers: { Cookie: cookieHeader },
      body: { name: 'Admin Updated' },
    });
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { name: string } };
    expect(json.data.name).toBe('Admin Updated');
  });

  it('platform admin can manage members of any group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    const user = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/members`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { userId: user.id, role: 'member' },
    });
    expect(res.status).toBe(201);
  });
});

// ============== Integration: Entitlement Consumption ==============

describe('Entitlement Consumption', () => {
  it('consumeEntitlement deletes the record', async () => {
    const db = getDb();
    const user = await createUser();
    await grantEntitlement(user.id, 'dev.tampa.group.create');

    // Verify it exists
    const before = await db.query.userEntitlements.findFirst({
      where: (e, { and, eq }) => and(
        eq(e.userId, user.id),
        eq(e.entitlement, 'dev.tampa.group.create'),
      ),
    });
    expect(before).toBeTruthy();

    // Consume it via the API (creating a group)
    const { env } = createTestEnv();
    const { cookieHeader } = await createSession(user.id);
    await appRequest('/groups/create', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { urlname: 'consume-test', name: 'Consume Test' },
    });

    // Verify it's gone
    const after = await db.query.userEntitlements.findFirst({
      where: (e, { and, eq }) => and(
        eq(e.userId, user.id),
        eq(e.entitlement, 'dev.tampa.group.create'),
      ),
    });
    expect(after).toBeUndefined();
  });
});
