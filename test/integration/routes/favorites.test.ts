import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
  appRequest,
} from '../helpers';

describe('Favorites API', () => {
  describe('GET /favorites', () => {
    it('returns 401 without session cookie', async () => {
      const { env } = createTestEnv();
      const res = await appRequest('/favorites', { env });
      expect(res.status).toBe(401);
    });

    it('returns empty favorites for new user', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/favorites', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: unknown[] };
      expect(body.data).toEqual([]);
    });
  });

  describe('POST /favorites/:groupSlug', () => {
    it('returns 401 without session', async () => {
      const { env } = createTestEnv();
      const res = await appRequest('/favorites/some-group', {
        env,
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent group', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/favorites/nonexistent', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });

    it('adds a favorite and emits domain event', async () => {
      const { env, mockQueue } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup({ urlname: 'test-fav-group' });

      const res = await appRequest(`/favorites/${group.urlname}`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { success: boolean } };
      expect(body.data.success).toBe(true);

      // Verify domain event was emitted
      expect(mockQueue.messages.length).toBeGreaterThanOrEqual(1);
      const event = mockQueue.messages.find(
        (m) => (m.body as { type: string }).type === 'dev.tampa.user.favorite_added',
      );
      expect(event).toBeDefined();
      expect((event!.body as { payload: { userId: string } }).payload.userId).toBe(user.id);

      // Verify favorite now appears in GET /favorites
      const getRes = await appRequest('/favorites', {
        env,
        headers: { Cookie: cookieHeader },
      });
      const getBody = await getRes.json() as { data: { groupSlug: string }[] };
      expect(getBody.data).toHaveLength(1);
      expect(getBody.data[0].groupSlug).toBe(group.urlname);
    });

    it('is idempotent for duplicate favorite', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup({ urlname: 'dup-group' });

      await appRequest(`/favorites/${group.urlname}`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      // Second add should succeed without error
      const res = await appRequest(`/favorites/${group.urlname}`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { success: boolean; message?: string } };
      expect(body.data.success).toBe(true);
    });
  });

  describe('DELETE /favorites/:groupSlug', () => {
    it('removes a favorite', async () => {
      const { env, mockQueue } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);
      const group = await createGroup({ urlname: 'del-group' });

      // Add first
      await appRequest(`/favorites/${group.urlname}`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      // Clear queue messages to isolate delete event
      mockQueue.messages.length = 0;

      // Delete
      const res = await appRequest(`/favorites/${group.urlname}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);

      // Verify removed event emitted
      const event = mockQueue.messages.find(
        (m) => (m.body as { type: string }).type === 'dev.tampa.user.favorite_removed',
      );
      expect(event).toBeDefined();

      // Verify no longer in favorites
      const getRes = await appRequest('/favorites', {
        env,
        headers: { Cookie: cookieHeader },
      });
      const getBody = await getRes.json() as { data: unknown[] };
      expect(getBody.data).toEqual([]);
    });

    it('returns 404 for non-existent group', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/favorites/ghost', {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(404);
    });
  });
});
