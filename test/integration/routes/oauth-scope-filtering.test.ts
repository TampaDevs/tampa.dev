/**
 * OAuth Scope Filtering Integration Tests
 *
 * Verifies that role-based scope filtering correctly strips
 * scopes users aren't eligible to grant during the OAuth
 * authorization flow, and that session validation prevents
 * unauthenticated or cross-user access.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createAdminUser,
  createSession,
  appRequest,
} from '../helpers';
import type { Env } from '../../../types/worker';

/** Minimal OAuth request object matching the completeAuthSchema */
function makeOAuthRequest(overrides?: Record<string, unknown>) {
  return {
    responseType: 'code',
    clientId: 'test-client-id',
    redirectUri: 'https://example.com/callback',
    state: 'test-state',
    ...overrides,
  };
}

/** Creates a test env with a mock OAUTH_PROVIDER that captures completeAuthorization args */
function createEnvWithOAuthCapture() {
  let capturedScope: string[] | undefined;
  let capturedProps: Record<string, unknown> | undefined;

  const { env, mockQueue } = createTestEnv({
    OAUTH_PROVIDER: {
      completeAuthorization: async (opts: {
        scope: string[];
        props: Record<string, unknown>;
      }) => {
        capturedScope = opts.scope;
        capturedProps = opts.props;
        return { redirectTo: 'https://example.com/callback?code=test' };
      },
    } as unknown as Env['OAUTH_PROVIDER'],
  });

  return {
    env,
    mockQueue,
    getCapturedScope: () => capturedScope,
    getCapturedProps: () => capturedProps,
  };
}

describe('OAuth Scope Filtering - /oauth/internal/complete', () => {
  describe('session validation (defense-in-depth)', () => {
    it('returns 401 without a session cookie', async () => {
      const { env } = createEnvWithOAuthCapture();
      const user = await createUser();

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 when session user does not match userId in body', async () => {
      const { env } = createEnvWithOAuthCapture();
      const caller = await createUser();
      const target = await createUser();
      const { cookieHeader } = await createSession(caller.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: target.id,
          approvedScopes: ['user'],
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('non-admin user', () => {
    it('strips admin scope from approvedScopes', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user', 'read:events', 'admin'],
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);

      const scope = getCapturedScope();
      expect(scope).toBeDefined();
      expect(scope).toContain('user');
      expect(scope).toContain('read:events');
      expect(scope).not.toContain('admin');
    });

    it('preserves all non-admin scopes', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const allNonAdmin = [
        'user', 'read:user', 'user:email',
        'read:events', 'write:events',
        'read:groups', 'read:favorites', 'write:favorites',
        'read:portfolio', 'write:portfolio',
        'manage:groups', 'manage:events', 'manage:checkins', 'manage:badges',
      ];

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: [...allNonAdmin, 'admin'],
        },
      });

      expect(res.status).toBe(200);

      const scope = getCapturedScope();
      for (const s of allNonAdmin) {
        expect(scope).toContain(s);
      }
      expect(scope).not.toContain('admin');
    });

    it('preserves manage:* scopes for non-admin users', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const manageScopes = ['manage:groups', 'manage:events', 'manage:checkins', 'manage:badges'];

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: manageScopes,
        },
      });

      expect(res.status).toBe(200);

      const scope = getCapturedScope();
      for (const s of manageScopes) {
        expect(scope).toContain(s);
      }
    });

    it('filters admin from props.scopes as well', async () => {
      const { env, getCapturedProps } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user', 'admin'],
        },
      });

      expect(res.status).toBe(200);

      const props = getCapturedProps();
      expect(props).toBeDefined();
      const propsScopes = props!.scopes as string[];
      expect(propsScopes).toContain('user');
      expect(propsScopes).not.toContain('admin');
    });
  });

  describe('admin user', () => {
    it('preserves admin scope for admin users', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: admin.id,
          approvedScopes: ['user', 'read:events', 'admin'],
        },
      });

      expect(res.status).toBe(200);

      const scope = getCapturedScope();
      expect(scope).toContain('user');
      expect(scope).toContain('read:events');
      expect(scope).toContain('admin');
    });

    it('preserves admin scope for superadmin users', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const superadmin = await createUser({ role: 'superadmin' });
      const { cookieHeader } = await createSession(superadmin.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: superadmin.id,
          approvedScopes: ['user', 'admin'],
        },
      });

      expect(res.status).toBe(200);

      const scope = getCapturedScope();
      expect(scope).toContain('user');
      expect(scope).toContain('admin');
    });
  });

  describe('edge cases', () => {
    it('handles empty scopes array', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: [],
        },
      });

      expect(res.status).toBe(200);
      expect(getCapturedScope()).toEqual([]);
    });

    it('results in empty scopes when non-admin approves only admin', async () => {
      const { env, getCapturedScope } = createEnvWithOAuthCapture();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['admin'],
        },
      });

      expect(res.status).toBe(200);
      expect(getCapturedScope()).toEqual([]);
    });

    it('returns 401 for non-existent user (no valid session)', async () => {
      const { env } = createEnvWithOAuthCapture();

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: 'nonexistent-user-id',
          approvedScopes: ['user'],
        },
      });

      // No session cookie → 401 before we even reach the user lookup
      expect(res.status).toBe(401);
    });
  });
});
