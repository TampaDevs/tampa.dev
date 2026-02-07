/**
 * OIDC UserInfo Endpoint Integration Tests
 *
 * Tests /oauth/userinfo (GET + POST) per OIDC Core 5.3.
 */

import { describe, it, expect } from 'vitest';
import { createTestEnv, createUser, createSession, createAdminUser, grantEntitlement } from '../helpers';
import { appRequest } from '../helpers/request';

describe('/oauth/userinfo', () => {
  describe('authentication', () => {
    it('returns 401 without credentials', async () => {
      const { env } = createTestEnv();
      const res = await appRequest('/oauth/userinfo', { env });

      expect(res.status).toBe(401);
      const body = await res.json() as Record<string, unknown>;
      expect(body.error).toBe('invalid_token');
      expect(body.error_description).toBe('The access token is invalid or expired');
    });

    it('returns WWW-Authenticate header on 401', async () => {
      const { env } = createTestEnv();
      const res = await appRequest('/oauth/userinfo', { env });

      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toBe('Bearer error="invalid_token"');
    });
  });

  describe('GET', () => {
    it('returns claims for session-authenticated user', async () => {
      const { env } = createTestEnv();
      const user = await createUser({
        name: 'Test User',
        username: 'testuser',
        email: 'test@tampa.dev',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;

      // Session auth (scopes === null) gets all claims
      expect(body.sub).toBe(user.id);
      expect(body.name).toBe('Test User');
      expect(body.preferred_username).toBe('testuser');
      expect(body.email).toBe('test@tampa.dev');
      expect(body.email_verified).toBe(true);
      expect(body.picture).toBe('https://example.com/avatar.jpg');
      expect(body.profile).toBe('https://tampa.dev/users/testuser');
    });

    it('returns Cache-Control: no-store header', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns Pragma: no-cache header', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Pragma')).toBe('no-cache');
    });
  });

  describe('POST', () => {
    it('returns claims for session-authenticated user (POST)', async () => {
      const { env } = createTestEnv();
      const user = await createUser({
        name: 'POST User',
        username: 'postuser',
        email: 'post@tampa.dev',
      });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.sub).toBe(user.id);
      expect(body.name).toBe('POST User');
      expect(body.email).toBe('post@tampa.dev');
    });
  });

  describe('claims based on profile', () => {
    it('omits name when user has no name', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ name: null, username: 'noname' });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.sub).toBe(user.id);
      expect(body).not.toHaveProperty('name');
      expect(body.preferred_username).toBe('noname');
    });

    it('omits picture when user has no avatarUrl', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ avatarUrl: null, username: 'nopic' });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).not.toHaveProperty('picture');
    });

    it('returns claims for private profile user (consent overrides visibility)', async () => {
      const { env } = createTestEnv();
      const user = await createUser({
        profileVisibility: 'private',
        name: 'Private User',
        username: 'privateuser',
        email: 'private@tampa.dev',
      });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.name).toBe('Private User');
      expect(body.email).toBe('private@tampa.dev');
    });
  });

  describe('entitlements claim', () => {
    it('includes entitlements when user has active entitlements', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ username: 'entitled' });
      await grantEntitlement(user.id, 'dev.tampa.group.create');
      await grantEntitlement(user.id, 'dev.tampa.feature.beta');
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      const entitlements = body['https://tampa.dev/entitlements'] as string[];
      expect(entitlements).toContain('dev.tampa.group.create');
      expect(entitlements).toContain('dev.tampa.feature.beta');
    });

    it('omits entitlements claim when user has no entitlements', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ username: 'noentitlements' });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).not.toHaveProperty('https://tampa.dev/entitlements');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 after threshold', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ username: 'ratelimited' });
      const { cookieHeader } = await createSession(user.id);

      // Make 60 requests (the limit)
      for (let i = 0; i < 60; i++) {
        await appRequest('/oauth/userinfo', {
          env,
          headers: { Cookie: cookieHeader },
        });
      }

      // 61st should be rate limited
      const res = await appRequest('/oauth/userinfo', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(429);
    });
  });
});
