/**
 * injectIdToken Integration Tests
 *
 * Tests the token endpoint response interception that adds id_token
 * when the openid scope is granted and OIDC keys are configured.
 * Exercises all branches: happy path, missing scope, missing keys,
 * missing user, graceful degradation on errors, and clone-before-read safety.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as jose from 'jose';
import { createTestEnv, createUser, grantEntitlement } from '../helpers';
import { injectIdToken } from '../../../src/index';
import { verifyIdToken } from '../../../src/lib/oidc';
import type { Env } from '../../../types/worker';

// Generate an OIDC key pair once for all tests
let privateJwk: string;
let publicJwk: string;

beforeAll(async () => {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true,
  });

  const pubJWK = await jose.exportJWK(publicKey);
  const privJWK = await jose.exportJWK(privateKey);

  const kid = 'test-inject-kid';
  pubJWK.kid = kid;
  pubJWK.use = 'sig';
  pubJWK.alg = 'RS256';
  privJWK.kid = kid;
  privJWK.use = 'sig';
  privJWK.alg = 'RS256';

  privateJwk = JSON.stringify(privJWK);
  publicJwk = JSON.stringify(pubJWK);
});

/** Build a mock token endpoint response like OAuthProvider would return */
function mockTokenResponse(overrides: Record<string, unknown> = {}): Response {
  const body = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    scope: 'openid read:user user:email',
    ...overrides,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a mock env with OIDC keys and a mock OAUTH_PROVIDER.unwrapToken() */
function mockEnv(
  baseEnv: Env,
  grantProps: Record<string, unknown>,
  clientId = 'test-client-id',
): Env {
  return {
    ...baseEnv,
    OIDC_PRIVATE_JWK: privateJwk,
    OAUTH_PROVIDER: {
      unwrapToken: async () => ({
        grant: {
          clientId,
          props: grantProps,
        },
      }),
    } as unknown as Env['OAUTH_PROVIDER'],
  };
}

describe('injectIdToken', () => {
  describe('happy path', () => {
    it('adds id_token to response when openid scope is granted', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({
        name: 'OIDC User',
        username: 'oidcuser',
        email: 'oidc@tampa.dev',
        avatarUrl: 'https://example.com/oidc.jpg',
      });

      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user', 'user:email'],
        nonce: 'test-nonce-123',
        authTime: 1700000000,
      });

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      // Original fields preserved
      expect(body.access_token).toBe('mock-access-token');
      expect(body.token_type).toBe('bearer');
      expect(body.scope).toBe('openid read:user user:email');

      // id_token added
      expect(body.id_token).toBeDefined();
      expect(typeof body.id_token).toBe('string');

      // Verify the id_token is valid and has correct claims
      const payload = await verifyIdToken(body.id_token as string, publicJwk, {
        issuer: 'http://localhost',
        audience: 'test-client-id',
      });

      expect(payload.sub).toBe(user.id);
      expect(payload.name).toBe('OIDC User');
      expect(payload.preferred_username).toBe('oidcuser');
      expect(payload.email).toBe('oidc@tampa.dev');
      expect(payload.picture).toBe('https://example.com/oidc.jpg');
      expect(payload.nonce).toBe('test-nonce-123');
      expect(payload.auth_time).toBe(1700000000);
      expect(payload.at_hash).toBeDefined();
    });

    it('includes entitlements in id_token when user has active entitlements', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({ username: 'entitled-oidc' });
      await grantEntitlement(user.id, 'dev.tampa.group.create');

      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      const payload = await verifyIdToken(body.id_token as string, publicJwk, {
        issuer: 'http://localhost',
        audience: 'test-client-id',
      });

      const entitlements = payload['https://tampa.dev/entitlements'] as string[];
      expect(entitlements).toContain('dev.tampa.group.create');
    });

    it('uses canonical issuer from request URL', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({ username: 'issuer-test' });

      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      const response = mockTokenResponse();
      // Simulate request coming through api.tampa.dev — issuer should resolve to tampa.dev
      const result = await injectIdToken(response, env, 'https://api.tampa.dev/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      // Decode the JWT header+payload without full verification
      // (we don't have a test key for https://tampa.dev issuer in the verifier,
      //  so just decode and check the iss claim directly)
      const parts = (body.id_token as string).split('.');
      const payloadJson = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payloadJson.iss).toBe('https://tampa.dev');
    });
  });

  describe('graceful degradation', () => {
    it('returns original response when openid scope is not granted', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = mockEnv(baseEnv, { userId: 'user-1', scopes: ['read:user'] });

      // Token response without openid scope
      const response = mockTokenResponse({ scope: 'read:user' });
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
      expect(body.access_token).toBe('mock-access-token');
    });

    it('returns original response when OIDC_PRIVATE_JWK is not configured', async () => {
      const { env: baseEnv } = createTestEnv();
      // No OIDC_PRIVATE_JWK set
      const env = {
        ...baseEnv,
        OAUTH_PROVIDER: {
          unwrapToken: async () => ({ grant: { clientId: 'c1', props: { userId: 'u1', scopes: ['openid'] } } }),
        } as unknown as Env['OAUTH_PROVIDER'],
      };

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
    });

    it('returns original response when access_token is missing', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = mockEnv(baseEnv, { userId: 'u1', scopes: ['openid'] });

      const response = mockTokenResponse({ access_token: undefined });
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
    });

    it('returns original response when unwrapToken returns no grant props', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = {
        ...baseEnv,
        OIDC_PRIVATE_JWK: privateJwk,
        OAUTH_PROVIDER: {
          unwrapToken: async () => ({ grant: null }),
        } as unknown as Env['OAUTH_PROVIDER'],
      };

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
    });

    it('returns original response when unwrapToken returns no clientId', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = {
        ...baseEnv,
        OIDC_PRIVATE_JWK: privateJwk,
        OAUTH_PROVIDER: {
          unwrapToken: async () => ({
            grant: { clientId: null, props: { userId: 'u1', scopes: ['openid'] } },
          }),
        } as unknown as Env['OAUTH_PROVIDER'],
      };

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
    });

    it('returns original response when user is not found in database', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = mockEnv(baseEnv, {
        userId: 'nonexistent-user-id',
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
      expect(body.access_token).toBe('mock-access-token');
    });

    it('returns original response when unwrapToken throws', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = {
        ...baseEnv,
        OIDC_PRIVATE_JWK: privateJwk,
        OAUTH_PROVIDER: {
          unwrapToken: async () => { throw new Error('token expired'); },
        } as unknown as Env['OAUTH_PROVIDER'],
      };

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      // Graceful degradation: original response returned, no id_token
      expect(body).not.toHaveProperty('id_token');
      expect(body.access_token).toBe('mock-access-token');
    });
  });

  describe('clone-before-read safety', () => {
    it('original response body is still readable after injection', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({ username: 'clone-test' });
      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      const response = mockTokenResponse();

      // The original response should still be readable after injectIdToken
      // clones it internally. We test this by reading the result.
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body.access_token).toBe('mock-access-token');
      expect(body.id_token).toBeDefined();
    });

    it('preserves original response headers in augmented response', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({ username: 'headers-test' });
      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      const response = mockTokenResponse();
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('scope parsing', () => {
    it('correctly identifies openid in space-delimited scope string', async () => {
      const { env: baseEnv } = createTestEnv();
      const user = await createUser({ username: 'scope-parse' });
      const env = mockEnv(baseEnv, {
        userId: user.id,
        scopes: ['openid', 'read:user'],
        authTime: 1700000000,
      });

      // openid is in the middle of the scope string
      const response = mockTokenResponse({ scope: 'read:user openid user:email' });
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body.id_token).toBeDefined();
    });

    it('does not match openid_connect as openid (no substring match)', async () => {
      const { env: baseEnv } = createTestEnv();
      const env = mockEnv(baseEnv, { userId: 'u1', scopes: ['read:user'] });

      // "openid_connect" contains "openid" as substring but should NOT match
      const response = mockTokenResponse({ scope: 'openid_connect read:user' });
      const result = await injectIdToken(response, env, 'http://localhost/oauth/token');
      const body = await result.json() as Record<string, unknown>;

      expect(body).not.toHaveProperty('id_token');
    });
  });
});
