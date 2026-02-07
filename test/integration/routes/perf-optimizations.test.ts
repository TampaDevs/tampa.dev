/**
 * Tests for performance optimizations:
 * - Session JOIN query (resolveSessionWithUser)
 * - Cache-Control header on /auth/me
 * - KV-cached getSyncVersion fallback to D1
 * - Favorites KV cache invalidation on mutation
 */
import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
  appRequest,
  getDb,
} from '../helpers';
import { getSyncVersion } from '../../../src/cache';
import { syncLogs } from '../../../src/db/schema';
import { KV_KEY_SYNC_VERSION, KV_KEY_FAV_COUNTS } from '../../../src/config/cache';

// ============== Session JOIN Query ==============

describe('Session resolution (JOIN optimization)', () => {
  it('returns user data for valid session via single JOIN', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ name: 'Join Test', username: 'jointest' });
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { id: string; name: string } };
    expect(body.user.id).toBe(user.id);
    expect(body.user.name).toBe('Join Test');
  });

  it('rejects expired session via JOIN expiration check', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id, {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('rejects invalid session token via JOIN returning no rows', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: 'session=nonexistent-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('session-authenticated route returns user via resolveSession JOIN', async () => {
    // Test that the shared resolveSessionWithUser path works for
    // routes that go through getCurrentUser -> resolveSession
    const { env } = createTestEnv();
    const user = await createUser({ username: 'sessionjoin' });
    const { cookieHeader } = await createSession(user.id);

    // /favorites uses getSessionUser -> getCurrentUser -> resolveSession
    const res = await appRequest('/favorites', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
  });
});

// ============== Cache-Control on /auth/me ==============

describe('GET /auth/me Cache-Control header', () => {
  it('includes private cache-control with stale-while-revalidate for authenticated users', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    const cc = res.headers.get('Cache-Control');
    expect(cc).toContain('private');
    expect(cc).toContain('max-age=10');
    expect(cc).toContain('stale-while-revalidate=50');
  });

  it('does not include cache-control for unauthenticated requests', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/auth/me', { env });
    expect(res.status).toBe(200);

    // No cache headers for null user response
    const cc = res.headers.get('Cache-Control');
    expect(cc).toBeNull();
  });
});

// ============== KV-cached getSyncVersion ==============

describe('getSyncVersion KV caching', () => {
  it('returns sync version from D1 when KV is unavailable', async () => {
    const { env } = createTestEnv();
    const db = getDb();

    // Insert a successful sync log
    await db.insert(syncLogs).values({
      id: crypto.randomUUID(),
      platform: 'test',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success',
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    // Call without KV — should fall back to D1
    const version = await getSyncVersion(env.DB);
    expect(version).not.toBeNull();
    expect(typeof version).toBe('string');
    expect(version!.length).toBeGreaterThan(0);
  });

  it('returns consistent results across multiple calls', async () => {
    const { env } = createTestEnv();
    const db = getDb();

    // Clean KV state from previous tests
    await env.kv.delete(KV_KEY_SYNC_VERSION);

    await db.insert(syncLogs).values({
      id: crypto.randomUUID(),
      platform: 'test',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success',
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    // Multiple calls should return the same version (from D1 or KV)
    const version1 = await getSyncVersion(env.DB, env.kv);
    const version2 = await getSyncVersion(env.DB, env.kv);
    expect(version1).not.toBeNull();
    expect(version1).toBe(version2);
  });

  it('returns cached version from KV on subsequent calls', async () => {
    const { env } = createTestEnv();

    // Pre-populate KV with a known version
    await env.kv.put(KV_KEY_SYNC_VERSION, 'cached-version', { expirationTtl: 60 });

    // Should return KV cached value without hitting D1
    const version = await getSyncVersion(env.DB, env.kv);
    expect(version).toBe('cached-version');
  });

  it('falls through to D1 when KV get throws', async () => {
    const { env } = createTestEnv();
    const db = getDb();

    await db.insert(syncLogs).values({
      id: crypto.randomUUID(),
      platform: 'test',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'success',
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    // Create a broken KV mock that throws on get
    const brokenKv = {
      get: () => { throw new Error('KV unavailable'); },
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    } as unknown as KVNamespace;

    // Should still return a version from D1 despite KV failure
    const version = await getSyncVersion(env.DB, brokenKv);
    expect(version).not.toBeNull();
    expect(typeof version).toBe('string');
  });
});

// ============== Favorites KV cache invalidation ==============

describe('Favorites KV cache invalidation', () => {
  it('busts favorites cache on POST /favorites/:slug', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ urlname: 'fav-cache-test' });

    // Pre-populate KV with stale favorites counts
    await env.kv.put(KV_KEY_FAV_COUNTS, JSON.stringify([['stale', 99]]), { expirationTtl: 60 });

    // Add a favorite
    const res = await appRequest(`/favorites/${group.urlname}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // KV cache should be busted
    const cached = await env.kv.get(KV_KEY_FAV_COUNTS);
    expect(cached).toBeNull();
  });

  it('busts favorites cache on DELETE /favorites/:slug', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);
    const group = await createGroup({ urlname: 'fav-del-cache' });

    // Add a favorite first
    await appRequest(`/favorites/${group.urlname}`, {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    // Re-populate KV cache
    await env.kv.put(KV_KEY_FAV_COUNTS, JSON.stringify([['stale', 99]]), { expirationTtl: 60 });

    // Remove the favorite
    const res = await appRequest(`/favorites/${group.urlname}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);

    // KV cache should be busted
    const cached = await env.kv.get(KV_KEY_FAV_COUNTS);
    expect(cached).toBeNull();
  });
});
