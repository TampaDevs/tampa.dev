/**
 * Session-Only Auth Mode Tests
 *
 * Verifies that routes using getSessionUser() (session-only mode)
 * correctly reject PAT and OAuth tokens, accepting only session cookies.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createPatToken,
  appRequest,
} from '../helpers';

// ============================================================
// Session-Only Routes Should Reject Tokens
// ============================================================

describe('Session-Only Auth Enforcement', () => {
  describe('/favorites (session-only)', () => {
    it('accepts session cookie authentication', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/favorites', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('rejects PAT token authentication', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['read:user', 'write:favorites']);

      const res = await appRequest('/favorites', {
        env,
        headers: { Authorization: authHeader },
      });
      // Should return 401 because PAT tokens are not accepted
      expect(res.status).toBe(401);
    });

    it('rejects PAT token even with all scopes', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user', 'read:user', 'write:favorites']);

      const res = await appRequest('/favorites/some-group', {
        env,
        method: 'POST',
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('/profile (session-only)', () => {
    it('accepts session cookie for GET /profile', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/profile', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('rejects PAT token for GET /profile', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user', 'read:user']);

      const res = await appRequest('/profile', {
        env,
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });

    it('rejects PAT token for GET /profile/entitlements', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user', 'read:user']);

      const res = await appRequest('/profile/entitlements', {
        env,
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('/developer (session-only)', () => {
    it('accepts session cookie for GET /developer/apps', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/developer/apps', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('rejects PAT token for GET /developer/apps', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user']);

      const res = await appRequest('/developer/apps', {
        env,
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('/me/linked-accounts (session-only)', () => {
    it('accepts session cookie', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/me/linked-accounts', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('rejects PAT token', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user', 'read:user']);

      const res = await appRequest('/me/linked-accounts', {
        env,
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('/me/onboarding (session-only)', () => {
    it('accepts session cookie', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/me/onboarding', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
    });

    it('rejects PAT token', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { authHeader } = await createPatToken(user.id, ['user']);

      const res = await appRequest('/me/onboarding', {
        env,
        headers: { Authorization: authHeader },
      });
      expect(res.status).toBe(401);
    });
  });
});

// ============================================================
// Contrast: /v1/ Routes Should Accept Tokens
// ============================================================

describe('/v1/ Tri-Auth (contrast)', () => {
  it('/v1/me accepts PAT token', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/me', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
  });

  it('/v1/me accepts session cookie', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/v1/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
  });

  it('/v1/profile accepts PAT token with read:user scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { authHeader } = await createPatToken(user.id, ['read:user']);

    const res = await appRequest('/v1/profile', {
      env,
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
  });
});
