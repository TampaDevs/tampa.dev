/**
 * OAuth PKCE Enforcement Integration Tests
 *
 * Verifies that public clients (token_endpoint_auth_method === 'none')
 * are required to use PKCE (code_challenge) in the authorization flow.
 * Confidential clients are not subject to this restriction.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
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

/** Creates a mock client representing a public client (SPA/mobile) */
function publicClient(overrides?: Record<string, unknown>) {
  return {
    clientId: 'test-client-id',
    clientName: 'Test Public App',
    redirectUris: ['https://example.com/callback'],
    token_endpoint_auth_method: 'none',
    ...overrides,
  };
}

/** Creates a mock client representing a confidential client (server-side) */
function confidentialClient(overrides?: Record<string, unknown>) {
  return {
    clientId: 'test-client-id',
    clientName: 'Test Confidential App',
    clientSecret: 'tds_secret',
    redirectUris: ['https://example.com/callback'],
    token_endpoint_auth_method: 'client_secret_post',
    ...overrides,
  };
}

/** Creates a mock client registered via developer portal (no explicit auth method) */
function devPortalClient(overrides?: Record<string, unknown>) {
  return {
    clientId: 'test-client-id',
    clientName: 'Dev Portal App',
    clientSecret: 'tds_secret',
    redirectUris: ['https://example.com/callback'],
    // No token_endpoint_auth_method — developer portal doesn't set it
    ...overrides,
  };
}

/** Creates a test env with mocked OAUTH_PROVIDER supporting parseAuthRequest and lookupClient */
function createEnvWithOAuthMocks(clientData: Record<string, unknown> | null) {
  let capturedScope: string[] | undefined;
  let capturedProps: Record<string, unknown> | undefined;

  const { env, mockQueue } = createTestEnv({
    OAUTH_PROVIDER: {
      parseAuthRequest: async (request: Request) => {
        const url = new URL(request.url);
        return {
          responseType: url.searchParams.get('response_type') || 'code',
          clientId: url.searchParams.get('client_id') || 'test-client-id',
          redirectUri: url.searchParams.get('redirect_uri') || 'https://example.com/callback',
          scope: url.searchParams.get('scope')?.split(' '),
          state: url.searchParams.get('state'),
          codeChallenge: url.searchParams.get('code_challenge') || undefined,
          codeChallengeMethod: url.searchParams.get('code_challenge_method') || undefined,
        };
      },
      lookupClient: async (_clientId: string) => clientData,
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

describe('OAuth PKCE Enforcement - /oauth/internal/parse-request', () => {
  describe('public clients', () => {
    it('rejects public client without code_challenge', async () => {
      const { env } = createEnvWithOAuthMocks(publicClient());

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=test-client-id&redirect_uri=https://example.com/callback&scope=user';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('code_challenge');
      expect(body.error).toContain('PKCE');
    });

    it('accepts public client with code_challenge', async () => {
      const { env } = createEnvWithOAuthMocks(publicClient());

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=test-client-id&redirect_uri=https://example.com/callback&scope=user&code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&code_challenge_method=S256';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; oauthRequest: { codeChallenge: string } };
      expect(body.success).toBe(true);
      expect(body.oauthRequest.codeChallenge).toBe('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    });
  });

  describe('confidential clients', () => {
    it('accepts confidential client without code_challenge', async () => {
      const { env } = createEnvWithOAuthMocks(confidentialClient());

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=test-client-id&redirect_uri=https://example.com/callback&scope=user';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('accepts confidential client with code_challenge', async () => {
      const { env } = createEnvWithOAuthMocks(confidentialClient());

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=test-client-id&redirect_uri=https://example.com/callback&scope=user&code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&code_challenge_method=S256';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe('developer portal clients (no explicit auth method)', () => {
    it('accepts developer portal client without code_challenge', async () => {
      const { env } = createEnvWithOAuthMocks(devPortalClient());

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=test-client-id&redirect_uri=https://example.com/callback&scope=user';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe('unknown client', () => {
    it('skips PKCE check when client is not found', async () => {
      const { env } = createEnvWithOAuthMocks(null);

      const authUrl = 'https://tampa.dev/oauth/authorize?response_type=code&client_id=unknown-client&redirect_uri=https://example.com/callback&scope=user';

      const res = await appRequest('/oauth/internal/parse-request', {
        env,
        method: 'POST',
        body: { url: authUrl },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});

describe('OAuth PKCE Enforcement - /oauth/internal/complete (defense-in-depth)', () => {
  describe('public clients', () => {
    it('rejects public client without code_challenge at completion', async () => {
      const { env } = createEnvWithOAuthMocks(publicClient());
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('code_challenge');
      expect(body.error).toContain('PKCE');
    });

    it('accepts public client with code_challenge at completion', async () => {
      const { env } = createEnvWithOAuthMocks(publicClient());
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest({
            codeChallenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
            codeChallengeMethod: 'S256',
          }),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe('confidential clients', () => {
    it('accepts confidential client without code_challenge at completion', async () => {
      const { env } = createEnvWithOAuthMocks(confidentialClient());
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe('client lookup failure', () => {
    it('fails closed when lookupClient throws and no code_challenge present', async () => {
      const { env } = createTestEnv({
        OAUTH_PROVIDER: {
          lookupClient: async () => { throw new Error('KV unavailable'); },
          completeAuthorization: async () => {
            return { redirectTo: 'https://example.com/callback?code=test' };
          },
        } as unknown as Env['OAUTH_PROVIDER'],
      });
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest(),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      // Fail closed: require PKCE when client type is unknown
      expect(res.status).toBe(400);
      const body = await res.json() as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('code_challenge');
    });

    it('proceeds when lookupClient throws but code_challenge is present', async () => {
      const { env } = createTestEnv({
        OAUTH_PROVIDER: {
          lookupClient: async () => { throw new Error('KV unavailable'); },
          completeAuthorization: async () => {
            return { redirectTo: 'https://example.com/callback?code=test' };
          },
        } as unknown as Env['OAUTH_PROVIDER'],
      });
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/oauth/internal/complete', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          oauthRequest: makeOAuthRequest({
            codeChallenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
            codeChallengeMethod: 'S256',
          }),
          userId: user.id,
          approvedScopes: ['user'],
        },
      });

      // Should proceed: PKCE is present regardless of client type
      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});
