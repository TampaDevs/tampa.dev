/**
 * Well-Known Endpoint Integration Tests
 *
 * Tests the /.well-known/ discovery endpoints to ensure
 * OAuth and MCP clients can discover server capabilities.
 */

import { describe, it, expect } from 'vitest';
import { createTestEnv } from '../helpers';
import { appRequest } from '../helpers/request';
import { SCOPES } from '../../../src/lib/scopes';

describe('/.well-known/openid-configuration', () => {
  it('returns 200 with JSON content type', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('includes Cache-Control header', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('returns all required OAuth metadata fields', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body).toHaveProperty('issuer');
    expect(body).toHaveProperty('authorization_endpoint');
    expect(body).toHaveProperty('token_endpoint');
    expect(body).toHaveProperty('registration_endpoint');
    expect(body).toHaveProperty('scopes_supported');
    expect(body).toHaveProperty('response_types_supported');
    expect(body).toHaveProperty('grant_types_supported');
    expect(body).toHaveProperty('code_challenge_methods_supported');
    expect(body).toHaveProperty('token_endpoint_auth_methods_supported');
  });

  it('derives issuer and endpoints from request origin', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    // Test app runs on http://localhost
    expect(body.issuer).toBe('http://localhost');
    expect(body.token_endpoint).toBe('http://localhost/oauth/token');
    expect(body.registration_endpoint).toBe('http://localhost/oauth/register');
    // Authorize endpoint is always on the web app (tampa.dev)
    expect(body.authorization_endpoint).toBe('https://tampa.dev/oauth/authorize');
  });

  it('includes all native scopes', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const scopes = body.scopes_supported as string[];

    // Every scope from SCOPES registry should be present
    for (const scope of Object.keys(SCOPES)) {
      expect(scopes).toContain(scope);
    }
  });

  it('includes OIDC standard aliases (profile, email) and offline_access', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const scopes = body.scopes_supported as string[];

    expect(scopes).toContain('offline_access');
    expect(scopes).toContain('profile');
    expect(scopes).toContain('email');
  });

  it('advertises only authorization code grant with PKCE', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;

    expect(body.response_types_supported).toEqual(['code']);
    expect(body.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(body.code_challenge_methods_supported).toEqual(['S256']);
  });

  it('does not advertise implicit or password grants', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/openid-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const grants = body.grant_types_supported as string[];

    expect(grants).not.toContain('implicit');
    expect(grants).not.toContain('password');
    expect(grants).not.toContain('client_credentials');
  });
});

describe('/.well-known/mcp-configuration', () => {
  it('returns 200 with server metadata', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/mcp-configuration', { env });
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body.mcp_version).toBe('2025-03-26');
    expect(body.server_name).toBe('Tampa.dev');
    expect(body.transport).toBe('streamable-http');
  });

  it('references oauth-authorization-server for authentication', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/mcp-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const auth = body.authentication as Record<string, unknown>;

    expect(auth.type).toBe('oauth2');
    expect(auth.oauth_metadata_url).toBe('https://api.tampa.dev/.well-known/oauth-authorization-server');
  });

  it('advertises tools, resources, and prompts capabilities', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/mcp-configuration', { env });
    const body = await res.json() as Record<string, unknown>;
    const capabilities = body.capabilities as Record<string, boolean>;

    expect(capabilities.tools).toBe(true);
    expect(capabilities.resources).toBe(true);
    expect(capabilities.prompts).toBe(true);
  });
});
