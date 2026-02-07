/**
 * OIDC Discovery and JWKS Endpoint Integration Tests
 *
 * Tests the updated /.well-known/openid-configuration and
 * /.well-known/jwks.json endpoints for OIDC compliance.
 */

import { describe, it, expect } from 'vitest';
import { createTestEnv } from '../helpers';
import { appRequest } from '../helpers/request';

describe('OIDC Discovery (/.well-known/openid-configuration)', () => {
  it('includes userinfo_endpoint', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body.userinfo_endpoint).toBe('http://localhost/oauth/userinfo');
  });

  it('includes jwks_uri', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body.jwks_uri).toBe('http://localhost/.well-known/jwks.json');
  });

  it('includes openid in scopes_supported', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const scopes = body.scopes_supported as string[];

    expect(scopes).toContain('openid');
    // Should be first in the list
    expect(scopes[0]).toBe('openid');
  });

  it('advertises RS256 for id_token signing', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body.id_token_signing_alg_values_supported).toEqual(['RS256']);
  });

  it('advertises public subject type', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body.subject_types_supported).toEqual(['public']);
  });

  it('lists all supported claims', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const claims = body.claims_supported as string[];

    // OIDC standard claims
    expect(claims).toContain('sub');
    expect(claims).toContain('iss');
    expect(claims).toContain('aud');
    expect(claims).toContain('exp');
    expect(claims).toContain('iat');
    expect(claims).toContain('auth_time');
    expect(claims).toContain('nonce');
    expect(claims).toContain('at_hash');

    // User claims
    expect(claims).toContain('name');
    expect(claims).toContain('preferred_username');
    expect(claims).toContain('picture');
    expect(claims).toContain('profile');
    expect(claims).toContain('email');
    expect(claims).toContain('email_verified');
    expect(claims).toContain('updated_at');

    // Custom claims
    expect(claims).toContain('https://tampa.dev/entitlements');
  });

  it('does not duplicate openid in scopes_supported', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const scopes = body.scopes_supported as string[];

    const openidCount = scopes.filter((s) => s === 'openid').length;
    expect(openidCount).toBe(1);
  });
});

describe('JWKS Endpoint (/.well-known/jwks.json)', () => {
  it('returns empty keys array when OIDC_PUBLIC_JWK is not configured', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/jwks.json', { env });

    expect(res.status).toBe(200);
    const body = await res.json() as { keys: unknown[] };
    expect(body.keys).toEqual([]);
  });

  it('returns Cache-Control header when unconfigured', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/jwks.json', { env });
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('returns public key when OIDC_PUBLIC_JWK is a single JWK', async () => {
    const jwk = {
      kty: 'RSA',
      kid: 'test-key-1',
      use: 'sig',
      alg: 'RS256',
      n: 'fake-modulus',
      e: 'AQAB',
    };
    const { env } = createTestEnv({ OIDC_PUBLIC_JWK: JSON.stringify(jwk) });
    const res = await appRequest('/.well-known/jwks.json', { env });

    expect(res.status).toBe(200);
    const body = await res.json() as { keys: Array<Record<string, unknown>> };
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].kid).toBe('test-key-1');
    expect(body.keys[0].kty).toBe('RSA');
    expect(body.keys[0].alg).toBe('RS256');
  });

  it('returns 24-hour cache when configured', async () => {
    const jwk = { kty: 'RSA', kid: 'test', n: 'x', e: 'AQAB' };
    const { env } = createTestEnv({ OIDC_PUBLIC_JWK: JSON.stringify(jwk) });
    const res = await appRequest('/.well-known/jwks.json', { env });
    expect(res.headers.get('cache-control')).toBe('public, max-age=86400');
  });

  it('handles full JWKS document format (key rotation)', async () => {
    const jwks = {
      keys: [
        { kty: 'RSA', kid: 'old-key', n: 'old', e: 'AQAB' },
        { kty: 'RSA', kid: 'new-key', n: 'new', e: 'AQAB' },
      ],
    };
    const { env } = createTestEnv({ OIDC_PUBLIC_JWK: JSON.stringify(jwks) });
    const res = await appRequest('/.well-known/jwks.json', { env });

    expect(res.status).toBe(200);
    const body = await res.json() as { keys: Array<Record<string, unknown>> };
    expect(body.keys).toHaveLength(2);
    expect(body.keys[0].kid).toBe('old-key');
    expect(body.keys[1].kid).toBe('new-key');
  });

  it('returns empty keys for invalid JSON in OIDC_PUBLIC_JWK', async () => {
    const { env } = createTestEnv({ OIDC_PUBLIC_JWK: 'not-valid-json' });
    const res = await appRequest('/.well-known/jwks.json', { env });

    expect(res.status).toBe(200);
    const body = await res.json() as { keys: unknown[] };
    expect(body.keys).toEqual([]);
  });
});
