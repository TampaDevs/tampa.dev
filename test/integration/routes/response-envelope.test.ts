/**
 * Response Envelope Contract Tests
 *
 * These tests verify that backend API endpoints return responses in the
 * exact envelope format the frontend expects. This prevents a class of
 * bugs where the frontend parses `response.json()` with the wrong shape
 * (e.g., missing `.data` unwrap, expecting `{ followers: [] }` when
 * the API returns `{ data: [], pagination: {} }`).
 *
 * Each test documents the contract between a specific backend endpoint
 * and the frontend code that consumes it. If a backend change breaks
 * the envelope shape, these tests will catch it.
 */

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
  createFollow,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';

// ============================================================
// Helper: Verify standard ok() envelope { data: T }
// ============================================================
function expectOkEnvelope(body: unknown): asserts body is { data: unknown } {
  expect(body).toHaveProperty('data');
  expect(body).not.toHaveProperty('pagination');
}

// ============================================================
// Helper: Verify standard list() envelope { data: T[], pagination }
// ============================================================
function expectListEnvelope(body: unknown): asserts body is {
  data: unknown[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
} {
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('pagination');
  const b = body as Record<string, unknown>;
  expect(Array.isArray(b.data)).toBe(true);
  expect(b.pagination).toHaveProperty('total');
  expect(b.pagination).toHaveProperty('limit');
  expect(b.pagination).toHaveProperty('offset');
  expect(b.pagination).toHaveProperty('hasMore');
}

// ============================================================
// GET /auth/me — Used by root layout, leaderboard, many loaders
// Returns { user: {...} | null } (NOT wrapped in data envelope)
// ============================================================
describe('GET /auth/me — envelope contract', () => {
  it('returns { user: { id, username, ... } } when authenticated', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'envelopeuser' });
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // Must have 'user' at top level — NOT wrapped in 'data'
    expect(body).toHaveProperty('user');
    expect(body).not.toHaveProperty('data');

    const u = body.user as Record<string, unknown>;
    expect(u).toHaveProperty('id');
    expect(u).toHaveProperty('username');
    expect(u).toHaveProperty('email');
    expect(u).toHaveProperty('name');
    expect(u).toHaveProperty('avatarUrl');
    expect(u).toHaveProperty('role');
  });

  it('returns { user: null } when not authenticated', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/auth/me', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body).toHaveProperty('user');
    expect(body.user).toBeNull();
    expect(body).not.toHaveProperty('data');
  });
});

// ============================================================
// GET /users/:username — Used by profile page loader
// Returns ok() envelope: { data: { username, name, bio, ... } }
// ============================================================
describe('GET /users/:username — envelope contract', () => {
  it('returns { data: { username, name, bio, badges, ... } }', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'profileenvtest', bio: 'Test bio' });

    const res = await appRequest(`/users/${user.username}`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);

    const profile = body.data as Record<string, unknown>;
    expect(profile).toHaveProperty('username', 'profileenvtest');
    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('bio');
    expect(profile).toHaveProperty('avatarUrl');
    expect(profile).toHaveProperty('memberSince');
    expect(profile).toHaveProperty('favoriteGroups');
  });
});

// ============================================================
// GET /users/:username/followers — Used by profile page + followers page
// Returns list() envelope: { data: [...], pagination: { total, ... } }
// ============================================================
describe('GET /users/:username/followers — envelope contract', () => {
  it('returns { data: [...], pagination: { total, limit, offset, hasMore } }', async () => {
    const { env } = createTestEnv();
    const target = await createUser({ username: 'followtargetenv' });
    const follower = await createUser({ username: 'followerenv' });
    await createFollow(follower.id, target.id);

    const res = await appRequest(`/users/${target.username}/followers?limit=5`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectListEnvelope(body);

    // Verify pagination.total reflects actual follower count
    const pagination = (body as { pagination: { total: number } }).pagination;
    expect(pagination.total).toBe(1);

    // Verify items have the expected shape
    const items = (body as { data: Record<string, unknown>[] }).data;
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty('username', 'followerenv');
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('avatarUrl');
    expect(items[0]).toHaveProperty('followedAt');
  });

  it('returns empty data array and total=0 with no followers', async () => {
    const { env } = createTestEnv();
    const target = await createUser({ username: 'nofollowersenv' });

    const res = await appRequest(`/users/${target.username}/followers`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectListEnvelope(body);
    expect((body as { data: unknown[] }).data).toHaveLength(0);
    expect((body as { pagination: { total: number } }).pagination.total).toBe(0);
  });
});

// ============================================================
// GET /users/:username/following — Used by profile page + following page
// Returns list() envelope: { data: [...], pagination: { total, ... } }
// ============================================================
describe('GET /users/:username/following — envelope contract', () => {
  it('returns { data: [...], pagination: { total, limit, offset, hasMore } }', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'followinguserenv' });
    const target = await createUser({ username: 'followedenv' });
    await createFollow(user.id, target.id);

    const res = await appRequest(`/users/${user.username}/following?limit=5`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectListEnvelope(body);

    const pagination = (body as { pagination: { total: number } }).pagination;
    expect(pagination.total).toBe(1);

    const items = (body as { data: Record<string, unknown>[] }).data;
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty('username', 'followedenv');
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('avatarUrl');
    expect(items[0]).toHaveProperty('followedAt');
  });
});

// ============================================================
// GET /me/following/:username — Used by profile page loader
// Returns ok() envelope: { data: { following: boolean } }
// ============================================================
describe('GET /me/following/:username — envelope contract', () => {
  it('returns { data: { following: true } } when following', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'checkfollowerenv' });
    const target = await createUser({ username: 'checkfollowedenv' });
    await createFollow(user.id, target.id);
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest(`/me/following/${target.username}`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);
    expect((body as { data: { following: boolean } }).data.following).toBe(true);
  });

  it('returns { data: { following: false } } when not following', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'notfollowingenv' });
    const target = await createUser({ username: 'notfollowedenv' });
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest(`/me/following/${target.username}`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);
    expect((body as { data: { following: boolean } }).data.following).toBe(false);
  });
});

// ============================================================
// GET /claim/:code — Used by badge claim page loader
// Returns ok() envelope: { data: { badge: {...}, claimable, ... } }
// ============================================================
describe('GET /claim/:code — envelope contract', () => {
  it('returns { data: { badge: { name, slug, icon, color, points }, claimable } }', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser({ username: 'claimadminenv' });
    const badge = await createBadge({ name: 'Claim Test Badge', slug: 'claim-test-env', icon: '🎯', color: '#FF0000', points: 25 });

    const db = getDb();
    const claimLinkId = crypto.randomUUID();
    const claimCode = 'testenvcode123';
    await db.insert(schema.badgeClaimLinks).values({
      id: claimLinkId,
      badgeId: badge.id,
      code: claimCode,
      maxUses: 10,
      currentUses: 0,
      createdBy: admin.id,
    });

    const res = await appRequest(`/claim/${claimCode}`, { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // Must be wrapped in { data: ... } envelope
    expectOkEnvelope(body);

    const data = body.data as Record<string, unknown>;
    expect(data).toHaveProperty('badge');
    expect(data).toHaveProperty('claimable', true);

    // Verify badge shape matches what the frontend ClaimInfo interface expects
    const badgeData = data.badge as Record<string, unknown>;
    expect(badgeData).toHaveProperty('name', 'Claim Test Badge');
    expect(badgeData).toHaveProperty('slug', 'claim-test-env');
    expect(badgeData).toHaveProperty('icon', '🎯');
    expect(badgeData).toHaveProperty('color', '#FF0000');
    expect(badgeData).toHaveProperty('points', 25);
    expect(badgeData).toHaveProperty('description');
  });
});

// ============================================================
// GET /leaderboard — Used by leaderboard page loader
// Returns ok() envelope: { data: { entries: [...], total, ... } }
// ============================================================
describe('GET /leaderboard — envelope contract', () => {
  it('returns { data: { entries: [...], total, totalAchievements } }', async () => {
    const { env } = createTestEnv();

    const res = await appRequest('/leaderboard?limit=10', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);

    const data = body.data as Record<string, unknown>;
    expect(data).toHaveProperty('entries');
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('totalAchievements');
  });
});

// ============================================================
// GET /users — Used by members page loader
// Returns list() envelope: { data: [...], pagination: { total, ... } }
// ============================================================
describe('GET /users — envelope contract', () => {
  it('returns { data: [...], pagination: { total, limit, offset, hasMore } }', async () => {
    const { env } = createTestEnv();
    await createUser({ username: 'memberenvuser', profileVisibility: 'public' });

    const res = await appRequest('/users?limit=10', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectListEnvelope(body);

    const items = (body as { data: Record<string, unknown>[] }).data;
    expect(items.length).toBeGreaterThanOrEqual(1);

    // Verify user item shape
    const user = items.find((u) => (u as Record<string, unknown>).username === 'memberenvuser') as Record<string, unknown>;
    expect(user).toBeDefined();
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('avatarUrl');
  });
});

// ============================================================
// POST /claim/:code — Used by badge claim page action
// Returns ok() envelope: { data: { badge: {...} } }
// ============================================================
describe('POST /claim/:code — envelope contract', () => {
  it('returns { data: { badge: { name, slug, ... } } } on successful claim', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'claimeruserenv' });
    const { cookieHeader } = await createSession(user.id);
    const badge = await createBadge({ name: 'Claimable Badge', slug: 'claimable-env', icon: '🌟', color: '#00FF00' });

    const db = getDb();
    const claimCode = 'claimableenvcode';
    await db.insert(schema.badgeClaimLinks).values({
      id: crypto.randomUUID(),
      badgeId: badge.id,
      code: claimCode,
      maxUses: 10,
      currentUses: 0,
      createdBy: user.id,
    });

    const res = await appRequest(`/claim/${claimCode}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);
    const data = body.data as Record<string, unknown>;
    expect(data).toHaveProperty('badge');

    const badgeData = data.badge as Record<string, unknown>;
    expect(badgeData).toHaveProperty('name', 'Claimable Badge');
    expect(badgeData).toHaveProperty('slug', 'claimable-env');
  });
});

// ============================================================
// POST/DELETE /users/:username/follow — Used by follow/unfollow actions
// Returns success() envelope: { data: { success: true } }
// ============================================================
describe('POST /users/:username/follow — envelope contract', () => {
  it('returns { data: { success: true } } on new follow', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'followactionenv' });
    const target = await createUser({ username: 'followtargetactionenv' });
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest(`/users/${target.username}/follow`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);
    expect((body as { data: { success: boolean } }).data.success).toBe(true);
  });
});

describe('DELETE /users/:username/follow — envelope contract', () => {
  it('returns { data: { success: true } } on unfollow', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'unfollowactionenv' });
    const target = await createUser({ username: 'unfollowtargetenv' });
    await createFollow(user.id, target.id);
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest(`/users/${target.username}/follow`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expectOkEnvelope(body);
    expect((body as { data: { success: boolean } }).data.success).toBe(true);
  });
});
