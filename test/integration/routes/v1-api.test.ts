/**
 * /v1/ API Integration Tests
 *
 * Tests the authenticated /v1/ API surface including:
 * - PAT-based authentication and scope enforcement
 * - Standardized error envelope format (code + WWW-Authenticate)
 * - profileVisibility privacy on follower/following endpoints
 * - Basic endpoint functionality
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  createGroup,
  createEvent,
  createPatToken,
  createFollow,
  appRequest,
} from '../helpers';

// ============================================================
// PAT Authentication
// ============================================================

describe('/v1/ PAT Authentication', () => {
  it('returns 401 without any auth credentials', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/v1/me', { env });
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.error).toBeDefined();
    expect(body.code).toBe('unauthorized');
  });

  it('returns 401 with invalid PAT token', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/v1/me', {
      env,
      headers: { Authorization: 'Bearer td_pat_invalidtoken123' },
    });
    expect(res.status).toBe(401);
  });

  it('authenticates with valid PAT token', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/me', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.id).toBe(user.id);
    expect(body.data.username).toBe(user.username);
  });

  it('includes email only when user:email scope is granted', async () => {
    const { env } = createTestEnv();
    const user = await createUser();

    // Token without user:email
    const { authHeader: noEmailAuth } = await createPatToken(user.id, ['read:user']);
    const res1 = await appRequest('/v1/me', {
      env,
      headers: { Authorization: noEmailAuth },
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json() as any;
    expect(body1.data.email).toBeUndefined();

    // Token with user:email
    const { authHeader: withEmailAuth } = await createPatToken(user.id, ['read:user', 'user:email']);
    const res2 = await appRequest('/v1/me', {
      env,
      headers: { Authorization: withEmailAuth },
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as any;
    expect(body2.data.email).toBe(user.email);
  });

  it('session auth includes email (scopes bypassed)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/v1/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.email).toBe(user.email);
  });
});

// ============================================================
// Scope Enforcement
// ============================================================

describe('/v1/ Scope Enforcement', () => {
  it('returns standardized scope error with code and WWW-Authenticate (H-01)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:groups']); // Wrong scope

    const res = await appRequest('/v1/me', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.code).toBe('insufficient_scope');
    expect(body.error).toContain('read:user');
    expect(res.headers.get('WWW-Authenticate')).toContain('insufficient_scope');
    expect(res.headers.get('WWW-Authenticate')).toContain('read:user');
  });

  it('rejects token without read:events for /v1/events', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.code).toBe('insufficient_scope');
  });

  it('allows token with correct scope for /v1/events', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  it('allows parent scope via hierarchy (write:events implies read:events)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:events']);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
  });

  it('session auth bypasses scope enforcement', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
  });

  it('rejects token without read:groups for /v1/groups', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/groups', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.code).toBe('insufficient_scope');
  });

  it('rejects token without write:events for RSVP creation', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);

    const res = await appRequest('/v1/events/fake-event/rsvp', {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
  });
});

// ============================================================
// Profile Endpoints
// ============================================================

describe('/v1/ Profile', () => {
  it('GET /v1/profile returns full profile data', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ bio: 'Test bio', location: 'Tampa' });
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/profile', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.bio).toBe('Test bio');
    expect(body.data.location).toBe('Tampa');
    expect(body.data.profileVisibility).toBeDefined();
  });
});

// ============================================================
// Events Endpoints
// ============================================================

describe('/v1/ Events', () => {
  it('GET /v1/events returns upcoming events with group info', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);
    const group = await createGroup();
    await createEvent(group.id);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].group).toBeDefined();
    expect(body.data[0].group.name).toBe(group.name);
    expect(body.pagination).toBeDefined();
  });

  it('respects pagination params', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);
    const group = await createGroup();
    await createEvent(group.id);
    await createEvent(group.id);
    await createEvent(group.id);

    const res = await appRequest('/v1/events?limit=2&offset=0', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(2);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.offset).toBe(0);
    expect(body.pagination.hasMore).toBe(true);
  });
});

// ============================================================
// Groups Endpoints
// ============================================================

describe('/v1/ Groups', () => {
  it('GET /v1/groups returns displayOnSite groups', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:groups']);
    await createGroup({ displayOnSite: true });
    await createGroup({ displayOnSite: false });

    const res = await appRequest('/v1/groups', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // Only displayOnSite groups should be returned
    expect(body.data.length).toBe(1);
  });

  it('GET /v1/groups/:slug returns group details', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:groups']);
    const group = await createGroup();

    const res = await appRequest(`/v1/groups/${group.urlname}`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.name).toBe(group.name);
    expect(body.data.upcomingEvents).toBeInstanceOf(Array);
  });

  it('GET /v1/groups/:slug returns 404 for non-existent group', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:groups']);

    const res = await appRequest('/v1/groups/nonexistent-slug', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.code).toBe('not_found');
  });
});

// ============================================================
// Follows - profileVisibility (M-01)
// ============================================================

describe('/v1/ Follows - profileVisibility', () => {
  it('returns 404 for followers of private profile (non-owner)', async () => {
    const { env } = createTestEnv();
    const privateUser = await createUser({ profileVisibility: 'private', username: 'privateone' });
    const requester = await createUser();
    const { authHeader } = await createPatToken(requester.id, ['read:user']);

    const res = await appRequest(`/v1/users/${privateUser.username}/followers`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 for following of private profile (non-owner)', async () => {
    const { env } = createTestEnv();
    const privateUser = await createUser({ profileVisibility: 'private', username: 'privatetwo' });
    const requester = await createUser();
    const { authHeader } = await createPatToken(requester.id, ['read:user']);

    const res = await appRequest(`/v1/users/${privateUser.username}/following`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
  });

  it('owner can view their own private profile followers', async () => {
    const { env } = createTestEnv();
    const privateUser = await createUser({ profileVisibility: 'private', username: 'privatethree' });
    const follower = await createUser({ username: 'followeruser' });
    await createFollow(follower.id, privateUser.id);
    const { authHeader } = await createPatToken(privateUser.id, ['read:user']);

    const res = await appRequest(`/v1/users/${privateUser.username}/followers`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(1);
  });

  it('admin can view private profile followers', async () => {
    const { env } = createTestEnv();
    const privateUser = await createUser({ profileVisibility: 'private', username: 'privatefour' });
    const follower = await createUser({ username: 'followeruser2' });
    await createFollow(follower.id, privateUser.id);
    const admin = await createAdminUser({ username: 'adminviewer' });
    const { cookieHeader } = await createSession(admin.id);

    const res = await appRequest(`/v1/users/${privateUser.username}/followers`, {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
  });

  it('filters private users from follower lists', async () => {
    const { env } = createTestEnv();
    const target = await createUser({ username: 'targetuser' });
    const publicFollower = await createUser({ username: 'publicfollower', profileVisibility: 'public' });
    const privateFollower = await createUser({ username: 'privatefollower', profileVisibility: 'private' });
    await createFollow(publicFollower.id, target.id);
    await createFollow(privateFollower.id, target.id);

    const requester = await createUser({ username: 'requser' });
    const { authHeader } = await createPatToken(requester.id, ['read:user']);

    const res = await appRequest(`/v1/users/${target.username}/followers`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    // Only the public follower should appear
    const usernames = body.data.map((f: any) => f.username);
    expect(usernames).toContain('publicfollower');
    expect(usernames).not.toContain('privatefollower');
  });

  it('filters private users from following lists', async () => {
    const { env } = createTestEnv();
    const target = await createUser({ username: 'followtarget' });
    const publicUser = await createUser({ username: 'publicfollowed', profileVisibility: 'public' });
    const privateUser = await createUser({ username: 'privatefollowed', profileVisibility: 'private' });
    await createFollow(target.id, publicUser.id);
    await createFollow(target.id, privateUser.id);

    const requester = await createUser({ username: 'requser2' });
    const { authHeader } = await createPatToken(requester.id, ['read:user']);

    const res = await appRequest(`/v1/users/${target.username}/following`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    const usernames = body.data.map((f: any) => f.username);
    expect(usernames).toContain('publicfollowed');
    expect(usernames).not.toContain('privatefollowed');
  });

  it('public profiles return followers normally', async () => {
    const { env } = createTestEnv();
    const target = await createUser({ username: 'publictarget', profileVisibility: 'public' });
    const follower = await createUser({ username: 'normalfollower' });
    await createFollow(follower.id, target.id);
    const { authHeader } = await createPatToken(follower.id, ['read:user']);

    const res = await appRequest(`/v1/users/${target.username}/followers`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.length).toBe(1);
    expect(body.data[0].username).toBe('normalfollower');
  });
});

// ============================================================
// Follow/Unfollow Actions
// ============================================================

describe('/v1/ Follow/Unfollow', () => {
  it('POST /v1/users/:username/follow creates a follow', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const target = await createUser({ username: 'followtargetaction' });
    const { authHeader } = await createPatToken(user.id, ['user']);

    const res = await appRequest(`/v1/users/${target.username}/follow`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.data.following).toBe(true);
  });

  it('returns 200 when already following', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const target = await createUser({ username: 'alreadyfollowed' });
    await createFollow(user.id, target.id);
    const { authHeader } = await createPatToken(user.id, ['user']);

    const res = await appRequest(`/v1/users/${target.username}/follow`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.alreadyFollowing).toBe(true);
  });

  it('returns 400 when trying to follow yourself', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ username: 'selffollow' });
    const { authHeader } = await createPatToken(user.id, ['user']);

    const res = await appRequest(`/v1/users/${user.username}/follow`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /v1/users/:username/follow unfollows', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const target = await createUser({ username: 'unfollowme' });
    await createFollow(user.id, target.id);
    const { authHeader } = await createPatToken(user.id, ['user']);

    const res = await appRequest(`/v1/users/${target.username}/follow`, {
      env,
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(204);
  });

  it('rejects follow without user scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const target = await createUser({ username: 'cantfollow' });
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest(`/v1/users/${target.username}/follow`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
    const body = await res.json() as any;
    expect(body.code).toBe('insufficient_scope');
  });
});

// ============================================================
// Scopes Discovery (public, no auth)
// ============================================================

describe('/v1/ Scopes Discovery', () => {
  it('GET /v1/scopes returns scopes without auth', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/v1/scopes', { env });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThan(0);
    // Verify scope shape
    const userScope = body.data.find((s: any) => s.name === 'user');
    expect(userScope).toBeDefined();
    expect(userScope.description).toBeDefined();
    expect(userScope.implies).toBeInstanceOf(Array);
  });
});

// ============================================================
// Response Envelope Format
// ============================================================

describe('/v1/ Response Envelope Format', () => {
  it('success responses wrap data in { data: ... }', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/me', {
      env,
      headers: { Authorization: authHeader },
    });
    const body = await res.json() as any;
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
  });

  it('list responses include pagination', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);

    const res = await appRequest('/v1/events', {
      env,
      headers: { Authorization: authHeader },
    });
    const body = await res.json() as any;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('offset');
    expect(body.pagination).toHaveProperty('hasMore');
  });

  it('error responses include code field', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/v1/me', { env });
    const body = await res.json() as any;
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
  });

  it('404 responses include not_found code', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:groups']);

    const res = await appRequest('/v1/groups/nonexistent', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.code).toBe('not_found');
  });
});

// ============================================================
// RSVP via /v1/
// ============================================================

describe('/v1/ RSVP', () => {
  it('POST /v1/events/:eventId/rsvp creates RSVP with write:events scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:events']);
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.data.eventId).toBe(event.id);
    expect(body.data.status).toBe('confirmed');
  });

  it('GET /v1/events/:eventId/rsvp returns status with read:events scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const group = await createGroup();
    const event = await createEvent(group.id);

    // First create an RSVP via write scope
    const { authHeader: writeAuth } = await createPatToken(user.id, ['write:events']);
    await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Authorization: writeAuth },
    });

    // Then read it with read scope
    const { authHeader: readAuth } = await createPatToken(user.id, ['read:events']);
    const res = await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      headers: { Authorization: readAuth },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.rsvp).toBeDefined();
    expect(body.data.rsvp.status).toBe('confirmed');
  });

  it('DELETE /v1/events/:eventId/rsvp cancels RSVP', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:events']);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // Create RSVP
    await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    // Cancel it
    const res = await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data.success).toBe(true);
  });

  it('returns 404 for RSVP on non-existent event', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:events']);

    const res = await appRequest('/v1/events/nonexistent/rsvp', {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 for duplicate RSVP', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:events']);
    const group = await createGroup();
    const event = await createEvent(group.id);

    // First RSVP
    await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    // Second RSVP
    const res = await appRequest(`/v1/events/${event.id}/rsvp`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(409);
  });

  it('GET /v1/events/:eventId/rsvp-summary returns counts', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:events']);
    const group = await createGroup();
    const event = await createEvent(group.id);

    const res = await appRequest(`/v1/events/${event.id}/rsvp-summary`, {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.data).toHaveProperty('confirmed');
    expect(body.data).toHaveProperty('waitlisted');
    expect(body.data).toHaveProperty('capacity');
  });
});

// ============================================================
// Favorites via /v1/
// ============================================================

describe('/v1/ Favorites', () => {
  it('POST /v1/favorites/:slug adds a favorite', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['write:favorites']);
    const group = await createGroup();

    const res = await appRequest(`/v1/favorites/${group.urlname}`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(201);
  });

  it('rejects without write:favorites scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:favorites']);
    const group = await createGroup();

    const res = await appRequest(`/v1/favorites/${group.urlname}`, {
      env,
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(403);
  });
});
