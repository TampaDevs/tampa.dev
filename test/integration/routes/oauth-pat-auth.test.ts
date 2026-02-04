/**
 * OAuthProvider PAT Authentication Integration Tests
 *
 * Tests the resolveExternalToken callback and resolvePatToken function
 * that enable PAT authentication through the OAuthProvider layer.
 *
 * The existing v1-api tests use appRequest() which bypasses the OAuthProvider
 * entirely. These tests verify the functions that the OAuthProvider calls
 * to validate PATs, ensuring the full production path works:
 *
 *   Request → OAuthProvider → resolveExternalToken → resolvePatToken → Hono app
 *
 * Note: We cannot instantiate OAuthProvider in tests because it uses
 * cloudflare: protocol imports incompatible with Node.js. Instead, we test
 * the exported resolveExternalToken callback and resolvePatToken function
 * directly, which are the critical code paths the OAuthProvider delegates to.
 */

import { describe, it, expect } from 'vitest';
import { createTestEnv, createUser, createPatToken } from '../helpers';
import { resolvePatToken, resolveExternalToken } from '../../../src/lib/auth';
import type { Env } from '../../../types/worker';

// ============================================================
// resolvePatToken (exported function used by resolveExternalToken)
// ============================================================

describe('resolvePatToken', () => {
  it('resolves a valid PAT to an AuthResult with user and scopes', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user', 'read:events']);

    const result = await resolvePatToken(env, token);

    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(user.id);
    expect(result!.user.username).toBe(user.username);
    expect(result!.scopes).toEqual(['read:user', 'read:events']);
  });

  it('returns null for a non-existent PAT', async () => {
    const { env } = createTestEnv();

    const result = await resolvePatToken(env, 'td_pat_0000000000000000000000000000000000000000');

    expect(result).toBeNull();
  });

  it('returns null for an expired PAT', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user'], {
      expiresAt: '2020-01-01T00:00:00Z',
    });

    const result = await resolvePatToken(env, token);

    expect(result).toBeNull();
  });

  it('returns null when PAT user no longer exists', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user']);

    // Delete the user after creating the PAT
    const { createDatabase } = await import('../../../src/db/index');
    const { users } = await import('../../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    const db = createDatabase(env.DB);
    await db.delete(users).where(eq(users.id, user.id));

    const result = await resolvePatToken(env, token);

    expect(result).toBeNull();
  });

  it('returns correct scopes from the token record', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const scopes = ['read:user', 'user:email', 'read:events', 'read:groups'];
    const { token } = await createPatToken(user.id, scopes);

    const result = await resolvePatToken(env, token);

    expect(result).not.toBeNull();
    expect(result!.scopes).toEqual(scopes);
  });

  it('allows PAT without expiration (expiresAt = null)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user'], {
      expiresAt: null,
    });

    const result = await resolvePatToken(env, token);

    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(user.id);
  });
});

// ============================================================
// resolveExternalToken (OAuthProvider callback)
// ============================================================

describe('resolveExternalToken (OAuthProvider callback)', () => {
  /**
   * Helper to build the input shape that OAuthProvider passes to the callback.
   */
  function buildInput(token: string, env: Env) {
    return {
      token,
      request: new Request('http://localhost/v1/me'),
      env,
    };
  }

  it('resolves a valid PAT and returns props with userId', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user']);

    const result = await resolveExternalToken(buildInput(token, env));

    expect(result).not.toBeNull();
    expect(result!.props).toEqual({ userId: user.id });
  });

  it('returns null for non-PAT tokens (not td_pat_ prefix)', async () => {
    const { env } = createTestEnv();

    // OAuth-style token (not a PAT)
    const result = await resolveExternalToken(buildInput('some-oauth-token-value', env));

    expect(result).toBeNull();
  });

  it('returns null for invalid PAT tokens', async () => {
    const { env } = createTestEnv();

    const result = await resolveExternalToken(
      buildInput('td_pat_0000000000000000000000000000000000000000', env),
    );

    expect(result).toBeNull();
  });

  it('returns null for expired PAT tokens', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user'], {
      expiresAt: '2020-01-01T00:00:00Z',
    });

    const result = await resolveExternalToken(buildInput(token, env));

    expect(result).toBeNull();
  });

  it('does not return scopes in props (scopes enforced by getCurrentUser)', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:user', 'read:events', 'admin']);

    const result = await resolveExternalToken(buildInput(token, env));

    expect(result).not.toBeNull();
    // Only userId in props — scopes are not passed through because
    // getCurrentUser() independently re-resolves them in route handlers
    expect(result!.props).toEqual({ userId: user.id });
    expect((result!.props as any).scopes).toBeUndefined();
  });
});
