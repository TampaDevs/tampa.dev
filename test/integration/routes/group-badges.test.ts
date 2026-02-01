import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  createBadge,
  awardBadge,
  addGroupMember,
  getDb,
  appRequest,
} from '../helpers';
import * as schema from '../../../src/db/schema';
import { eq, and } from 'drizzle-orm';

// ============== Helpers ==============

/**
 * Enable the dev.tampa.group.badge_issuer feature flag for a group.
 */
async function enableBadgeIssuerFlag(groupId: string) {
  const db = getDb();
  const flagId = crypto.randomUUID();
  await db.insert(schema.featureFlags).values({
    id: flagId,
    name: 'Group Badge Issuer',
    slug: 'dev.tampa.group.badge_issuer',
    enabledByDefault: false,
  });
  await db.insert(schema.groupFeatureFlags).values({
    id: crypto.randomUUID(),
    groupId,
    flagId,
    enabled: true,
  });
}

/**
 * Create a badge scoped to a specific group directly in the database.
 */
async function createGroupBadge(groupId: string, overrides?: Partial<schema.NewBadge>) {
  return createBadge({ groupId, ...overrides });
}

// ============== 1. List Group Badges ==============

describe('List Group Badges (GET /groups/manage/:groupId/badges)', () => {
  it('returns 401 without auth', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}/badges`, { env });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-members', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(403);
  });

  it('returns badges for volunteer+', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');

    const badge1 = await createGroupBadge(group.id, { slug: 'vol-badge-1', name: 'Badge 1' });
    const badge2 = await createGroupBadge(group.id, { slug: 'vol-badge-2', name: 'Badge 2' });

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: {
        badges: { id: string; name: string; userCount: number }[];
        limits: { maxBadges: number; maxBadgePoints: number; currentBadgeCount: number };
      };
    };
    expect(json.data.badges).toHaveLength(2);
    const ids = json.data.badges.map((b) => b.id);
    expect(ids).toContain(badge1.id);
    expect(ids).toContain(badge2.id);
  });

  it('returns badge count limits', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');
    await createGroupBadge(group.id, { slug: 'limits-badge-1' });

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: {
        limits: { maxBadges: number; maxBadgePoints: number; currentBadgeCount: number };
      };
    };
    expect(json.data.limits.maxBadges).toBe(10);
    expect(json.data.limits.maxBadgePoints).toBe(50);
    expect(json.data.limits.currentBadgeCount).toBe(1);
  });

  it('returns empty list for group with no badges', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { badges: unknown[]; limits: { currentBadgeCount: number } } };
    expect(json.data.badges).toEqual([]);
    expect(json.data.limits.currentBadgeCount).toBe(0);
  });
});

// ============== 2. Create Group Badge ==============

describe('Create Group Badge (POST /groups/manage/:groupId/badges)', () => {
  it('returns 401 without auth', async () => {
    const { env } = createTestEnv();
    const group = await createGroup();

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      body: { name: 'Badge', slug: 'badge', icon: 'star', color: '#E5574F', points: 10 },
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for members (not manager+)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'member');
    await enableBadgeIssuerFlag(group.id);

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'Badge', slug: 'member-badge', icon: 'star', color: '#E5574F', points: 10 },
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 when badge_issuer flag is not enabled', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    // Not enabling the badge issuer flag

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'Badge', slug: 'no-flag-badge', icon: 'star', color: '#E5574F', points: 10 },
    });
    expect(res.status).toBe(403);
  });

  it('creates badge successfully with valid data (manager+)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    await enableBadgeIssuerFlag(group.id);

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'First Badge', slug: 'first-badge', icon: 'star', color: '#FF0000', points: 25 },
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      data: {
        id: string;
        name: string;
        slug: string;
        icon: string;
        color: string;
        points: number;
        groupId: string;
      };
    };
    expect(json.data.name).toBe('First Badge');
    expect(json.data.slug).toBe('first-badge');
    expect(json.data.icon).toBe('star');
    expect(json.data.color).toBe('#FF0000');
    expect(json.data.points).toBe(25);
    expect(json.data.groupId).toBe(group.id);
  });

  it('returns 409 when slug already exists', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    await enableBadgeIssuerFlag(group.id);

    // Create a badge with this slug first
    await createBadge({ slug: 'duplicate-slug', name: 'Existing Badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'New Badge', slug: 'duplicate-slug', icon: 'star', color: '#E5574F', points: 5 },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/slug already exists/i);
  });

  it('returns 409 when maxBadges limit reached (default 10)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    await enableBadgeIssuerFlag(group.id);

    // Create 10 badges (the default max)
    for (let i = 0; i < 10; i++) {
      await createGroupBadge(group.id, { slug: `maxbadge-${i}-${Date.now()}`, name: `Max Badge ${i}` });
    }

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'One Too Many', slug: 'one-too-many', icon: 'star', color: '#E5574F', points: 5 },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/maximum/i);
  });

  it('returns 400 when points exceed maxBadgePoints (default 50)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    await enableBadgeIssuerFlag(group.id);

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'Too Many Points', slug: 'too-many-points', icon: 'star', color: '#E5574F', points: 100 },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/cannot exceed/i);
  });

  it('platform admin still needs badge_issuer flag enabled for the group', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    // NOT enabling the badge issuer flag

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'Admin Badge', slug: 'admin-no-flag-badge', icon: 'star', color: '#E5574F', points: 10 },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not enabled/i);
  });

  it('platform admin can create badges when flag is enabled (bypasses role check)', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    await enableBadgeIssuerFlag(group.id);
    // Admin is NOT a member of the group but should bypass role checks

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: { name: 'Admin Badge', slug: 'admin-badge-with-flag', icon: 'star', color: '#E5574F', points: 10 },
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { name: string; groupId: string } };
    expect(json.data.name).toBe('Admin Badge');
    expect(json.data.groupId).toBe(group.id);
  });
});

// ============== 3. Update Group Badge ==============

describe('Update Group Badge (PATCH /groups/manage/:groupId/badges/:badgeId)', () => {
  it('updates badge fields successfully', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'update-test-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'PATCH',
      headers: { Cookie: cookieHeader },
      body: { name: 'Updated Name', icon: 'rocket', color: '#00FF00', points: 20 },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { name: string; icon: string; color: string; points: number } };
    expect(json.data.name).toBe('Updated Name');
    expect(json.data.icon).toBe('rocket');
    expect(json.data.color).toBe('#00FF00');
    expect(json.data.points).toBe(20);
  });

  it('returns 404 for badge not in this group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');

    // Create badge in a different group
    const otherGroup = await createGroup();
    const otherBadge = await createGroupBadge(otherGroup.id, { slug: 'other-group-update-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${otherBadge.id}`, {
      env,
      method: 'PATCH',
      headers: { Cookie: cookieHeader },
      body: { name: 'Stolen Badge' },
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when updating points above maxBadgePoints', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'update-points-badge', points: 10 });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'PATCH',
      headers: { Cookie: cookieHeader },
      body: { points: 999 },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/cannot exceed/i);
  });

  it('returns 403 for volunteer (not manager+)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'volunteer');
    const badge = await createGroupBadge(group.id, { slug: 'vol-update-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'PATCH',
      headers: { Cookie: cookieHeader },
      body: { name: 'Updated' },
    });
    expect(res.status).toBe(403);
  });
});

// ============== 4. Delete Group Badge ==============

describe('Delete Group Badge (DELETE /groups/manage/:groupId/badges/:badgeId)', () => {
  it('deletes badge successfully (owner)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'owner');
    const badge = await createGroupBadge(group.id, { slug: 'delete-test-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { success: boolean; message: string } };
    expect(json.data.success).toBe(true);

    // Verify badge is gone
    const db = getDb();
    const deleted = await db.query.badges.findFirst({
      where: eq(schema.badges.id, badge.id),
    });
    expect(deleted).toBeUndefined();
  });

  it('returns 403 for manager (requires owner)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'mgr-delete-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 for badge not in this group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup();
    await addGroupMember(group.id, user.id, 'owner');

    const otherGroup = await createGroup();
    const otherBadge = await createGroupBadge(otherGroup.id, { slug: 'other-group-delete-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${otherBadge.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('cascades deletion of user_badges and claim_links', async () => {
    const { env } = createTestEnv();
    const owner = await createUser();
    const { cookieHeader } = await createSession(owner.id);
    const group = await createGroup();
    await addGroupMember(group.id, owner.id, 'owner');
    const badge = await createGroupBadge(group.id, { slug: 'cascade-delete-badge' });

    // Award the badge to a user
    const recipient = await createUser();
    await awardBadge(recipient.id, badge.id);

    // Create a claim link for the badge
    const db = getDb();
    const claimLinkId = crypto.randomUUID();
    await db.insert(schema.badgeClaimLinks).values({
      id: claimLinkId,
      badgeId: badge.id,
      code: 'test-claim-code',
      createdBy: owner.id,
    });

    // Delete the badge
    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // Verify user_badges deleted
    const userBadge = await db.query.userBadges.findFirst({
      where: eq(schema.userBadges.badgeId, badge.id),
    });
    expect(userBadge).toBeUndefined();

    // Verify claim_links deleted
    const claimLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(schema.badgeClaimLinks.id, claimLinkId),
    });
    expect(claimLink).toBeUndefined();
  });
});

// ============== 5. Award Badge ==============

describe('Award Badge (POST /groups/manage/:groupId/badges/:badgeId/award/:userId)', () => {
  it('awards badge successfully', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'award-test-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/award/${recipient.id}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { message: string } };
    expect(json.data.message).toBeTruthy();

    // Verify in database
    const db = getDb();
    const userBadge = await db.query.userBadges.findFirst({
      where: and(
        eq(schema.userBadges.userId, recipient.id),
        eq(schema.userBadges.badgeId, badge.id),
      ),
    });
    expect(userBadge).toBeTruthy();
  });

  it('returns 409 when already awarded', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'already-awarded-badge' });
    const recipient = await createUser();

    // Award once
    await awardBadge(recipient.id, badge.id);

    // Try to award again
    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/award/${recipient.id}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/already awarded/i);
  });

  it('returns 404 for badge not in this group', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');

    const otherGroup = await createGroup();
    const otherBadge = await createGroupBadge(otherGroup.id, { slug: 'other-group-award-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${otherBadge.id}/award/${recipient.id}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent user', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'award-nonexist-user-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/award/nonexistent-user-id`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for volunteer (not manager+)', async () => {
    const { env } = createTestEnv();
    const volunteer = await createUser();
    const { cookieHeader } = await createSession(volunteer.id);
    const group = await createGroup();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const badge = await createGroupBadge(group.id, { slug: 'vol-award-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/award/${recipient.id}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(403);
  });
});

// ============== 6. Revoke Badge ==============

describe('Revoke Badge (DELETE /groups/manage/:groupId/badges/:badgeId/revoke/:userId)', () => {
  it('revokes badge successfully', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'revoke-test-badge' });
    const recipient = await createUser();

    // Award first
    await awardBadge(recipient.id, badge.id);

    // Revoke
    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/revoke/${recipient.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { success: boolean; message: string } };
    expect(json.data.success).toBe(true);

    // Verify in database
    const db = getDb();
    const userBadge = await db.query.userBadges.findFirst({
      where: and(
        eq(schema.userBadges.userId, recipient.id),
        eq(schema.userBadges.badgeId, badge.id),
      ),
    });
    expect(userBadge).toBeUndefined();
  });

  it('returns 404 when user does not have badge', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'revoke-not-awarded-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/revoke/${recipient.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/does not have/i);
  });

  it('returns 404 for badge not in this group', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');

    const otherGroup = await createGroup();
    const otherBadge = await createGroupBadge(otherGroup.id, { slug: 'other-group-revoke-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${otherBadge.id}/revoke/${recipient.id}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(404);
  });
});

// ============== 7. Create Claim Link ==============

describe('Create Claim Link (POST /groups/manage/:groupId/badges/:badgeId/claim-links)', () => {
  it('creates claim link successfully', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'claim-link-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/claim-links`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {},
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      data: {
        id: string;
        badgeId: string;
        code: string;
        createdBy: string;
      };
    };
    expect(json.data.id).toBeTruthy();
    expect(json.data.badgeId).toBe(badge.id);
    expect(json.data.code).toBeTruthy();
    expect(json.data.code.length).toBe(12);
    expect(json.data.createdBy).toBe(manager.id);
  });

  it('returns 404 for badge not in this group', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');

    const otherGroup = await createGroup();
    const otherBadge = await createGroupBadge(otherGroup.id, { slug: 'other-group-claim-link-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${otherBadge.id}/claim-links`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {},
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for volunteer (not manager+)', async () => {
    const { env } = createTestEnv();
    const volunteer = await createUser();
    const { cookieHeader } = await createSession(volunteer.id);
    const group = await createGroup();
    await addGroupMember(group.id, volunteer.id, 'volunteer');
    const badge = await createGroupBadge(group.id, { slug: 'vol-claim-link-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/claim-links`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {},
    });
    expect(res.status).toBe(403);
  });
});

// ============== 8. List Claim Links ==============

describe('List Claim Links (GET /groups/manage/:groupId/badges/:badgeId/claim-links)', () => {
  it('lists claim links for badge', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'list-claim-links-badge' });

    // Create claim links directly in DB
    const db = getDb();
    await db.insert(schema.badgeClaimLinks).values([
      {
        id: crypto.randomUUID(),
        badgeId: badge.id,
        code: 'claim-code-one',
        createdBy: manager.id,
      },
      {
        id: crypto.randomUUID(),
        badgeId: badge.id,
        code: 'claim-code-two',
        maxUses: 5,
        createdBy: manager.id,
      },
    ]);

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/claim-links`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { code: string; maxUses: number | null }[] };
    expect(json.data).toHaveLength(2);
    const codes = json.data.map((l) => l.code);
    expect(codes).toContain('claim-code-one');
    expect(codes).toContain('claim-code-two');
  });

  it('returns empty list when none exist', async () => {
    const { env } = createTestEnv();
    const manager = await createUser();
    const { cookieHeader } = await createSession(manager.id);
    const group = await createGroup();
    await addGroupMember(group.id, manager.id, 'manager');
    const badge = await createGroupBadge(group.id, { slug: 'empty-claim-links-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/claim-links`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: unknown[] };
    expect(json.data).toEqual([]);
  });
});

// ============== 9. Platform Admin Bypass ==============

describe('Platform Admin Bypass', () => {
  it('platform admin can list badges of any group (bypasses role check)', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    // Admin is NOT a member of this group

    const badge = await createGroupBadge(group.id, { slug: 'admin-list-badge' });

    const res = await appRequest(`/groups/manage/${group.id}/badges`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { badges: { id: string }[] } };
    expect(json.data.badges).toHaveLength(1);
    expect(json.data.badges[0].id).toBe(badge.id);
  });

  it('platform admin can award badges (bypasses role check)', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { cookieHeader } = await createSession(admin.id);
    const group = await createGroup();
    // Admin is NOT a member of this group

    const badge = await createGroupBadge(group.id, { slug: 'admin-award-badge' });
    const recipient = await createUser();

    const res = await appRequest(`/groups/manage/${group.id}/badges/${badge.id}/award/${recipient.id}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { message: string } };
    expect(json.data.message).toBeTruthy();

    // Verify in database
    const db = getDb();
    const userBadge = await db.query.userBadges.findFirst({
      where: and(
        eq(schema.userBadges.userId, recipient.id),
        eq(schema.userBadges.badgeId, badge.id),
      ),
    });
    expect(userBadge).toBeTruthy();
  });
});
