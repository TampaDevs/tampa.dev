/**
 * Developer Portal Apps Integration Tests
 *
 * Verifies that:
 * - Users can create confidential OAuth apps (with client secrets)
 * - Users can create public OAuth apps (PKCE-only, no secrets)
 * - Public apps cannot regenerate secrets (they don't have any)
 * - App listings correctly indicate public vs confidential type
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  appRequest,
} from '../helpers';

describe('Developer Portal - App Creation', () => {
  describe('Confidential clients (default)', () => {
    it('creates a confidential client with a client secret by default', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Confidential App',
          redirectUris: ['https://example.com/callback'],
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json() as { clientId: string; clientSecret?: string; isPublicClient?: boolean };

      expect(body.clientId).toBeDefined();
      expect(body.clientSecret).toBeDefined();
      expect(body.clientSecret).toMatch(/^tds_/); // Secret prefix
      expect(body.isPublicClient).toBe(false);
    });

    it('creates a confidential client when isPublicClient is false', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Explicit Confidential App',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json() as { clientId: string; clientSecret?: string; isPublicClient?: boolean };

      expect(body.clientSecret).toBeDefined();
      expect(body.isPublicClient).toBe(false);
    });

    it('allows regenerating secret for confidential clients', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Create a confidential app
      const createRes = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'App with Regeneratable Secret',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      expect(createRes.status).toBe(201);
      const { clientId, clientSecret: originalSecret } = await createRes.json() as { clientId: string; clientSecret: string };

      // Regenerate secret
      const regenRes = await appRequest(`/developer/apps/${clientId}/regenerate-secret`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      expect(regenRes.status).toBe(200);
      const { clientSecret: newSecret } = await regenRes.json() as { clientSecret: string };

      expect(newSecret).toBeDefined();
      expect(newSecret).toMatch(/^tds_/);
      expect(newSecret).not.toBe(originalSecret);
    });
  });

  describe('Public clients (SPAs/mobile apps)', () => {
    it('creates a public client without a client secret', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Public SPA',
          redirectUris: ['https://spa.example.com/callback'],
          isPublicClient: true,
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json() as { clientId: string; clientSecret?: string; isPublicClient?: boolean };

      expect(body.clientId).toBeDefined();
      expect(body.clientSecret).toBeUndefined();
      expect(body.isPublicClient).toBe(true);
    });

    it('stores tokenEndpointAuthMethod as none for public clients', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Public Mobile App',
          redirectUris: ['myapp://callback'],
          isPublicClient: true,
        },
      });

      expect(res.status).toBe(201);
      const { clientId } = await res.json() as { clientId: string };

      // Verify the stored client data in KV uses camelCase (for workers-oauth-provider compatibility)
      const clientData = await env.OAUTH_KV.get(`client:${clientId}`, 'json') as { tokenEndpointAuthMethod?: string } | null;
      expect(clientData).not.toBeNull();
      expect(clientData!.tokenEndpointAuthMethod).toBe('none');
    });

    it('rejects secret regeneration for public clients', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Create a public app
      const createRes = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Public App No Secret',
          redirectUris: ['https://spa.example.com/callback'],
          isPublicClient: true,
        },
      });

      expect(createRes.status).toBe(201);
      const { clientId } = await createRes.json() as { clientId: string };

      // Try to regenerate secret - should fail
      const regenRes = await appRequest(`/developer/apps/${clientId}/regenerate-secret`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      expect(regenRes.status).toBe(400);
      const body = await regenRes.json() as { error: string };
      expect(body.error).toContain('Public clients do not have a client secret');
    });
  });

  describe('App listing', () => {
    it('returns isPublicClient flag in app list', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Create one of each type
      await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Confidential for List',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Public for List',
          redirectUris: ['https://spa.example.com/callback'],
          isPublicClient: true,
        },
      });

      // List apps
      const listRes = await appRequest('/developer/apps', {
        env,
        method: 'GET',
        headers: { Cookie: cookieHeader },
      });

      expect(listRes.status).toBe(200);
      const { apps } = await listRes.json() as { apps: Array<{ name: string; isPublicClient: boolean }> };

      expect(apps).toHaveLength(2);

      const confidentialApp = apps.find(a => a.name === 'Confidential for List');
      const publicApp = apps.find(a => a.name === 'Public for List');

      expect(confidentialApp).toBeDefined();
      expect(confidentialApp!.isPublicClient).toBe(false);

      expect(publicApp).toBeDefined();
      expect(publicApp!.isPublicClient).toBe(true);
    });

    it('returns isPublicClient flag in app details', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Create a public app
      const createRes = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Public App Details',
          redirectUris: ['https://spa.example.com/callback'],
          isPublicClient: true,
        },
      });

      const { clientId } = await createRes.json() as { clientId: string };

      // Get app details
      const detailsRes = await appRequest(`/developer/apps/${clientId}`, {
        env,
        method: 'GET',
        headers: { Cookie: cookieHeader },
      });

      expect(detailsRes.status).toBe(200);
      const details = await detailsRes.json() as { isPublicClient: boolean };
      expect(details.isPublicClient).toBe(true);
    });
  });

  describe('Legacy clients (pre-public-client feature)', () => {
    it('treats clients without token_endpoint_auth_method as confidential', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Manually create a legacy client in KV (simulating pre-feature client)
      const legacyClientId = 'td_legacy_client_123';
      const legacyClient = {
        clientId: legacyClientId,
        clientSecret: 'tds_legacy_secret',
        clientName: 'Legacy App',
        redirectUris: ['https://legacy.example.com/callback'],
        registrationDate: new Date().toISOString(),
        ownerId: user.id,
        // No token_endpoint_auth_method field - simulating legacy client
      };
      await env.OAUTH_KV.put(`client:${legacyClientId}`, JSON.stringify(legacyClient));

      // List apps - should show as confidential (isPublicClient: false)
      const listRes = await appRequest('/developer/apps', {
        env,
        method: 'GET',
        headers: { Cookie: cookieHeader },
      });

      expect(listRes.status).toBe(200);
      const { apps } = await listRes.json() as { apps: Array<{ clientId: string; isPublicClient: boolean }> };
      const legacyApp = apps.find(a => a.clientId === legacyClientId);

      expect(legacyApp).toBeDefined();
      expect(legacyApp!.isPublicClient).toBe(false);
    });

    it('allows secret regeneration for legacy clients', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Manually create a legacy client in KV
      const legacyClientId = 'td_legacy_regen_123';
      const legacyClient = {
        clientId: legacyClientId,
        clientSecret: 'tds_old_secret',
        clientName: 'Legacy Regen App',
        redirectUris: ['https://legacy.example.com/callback'],
        registrationDate: new Date().toISOString(),
        ownerId: user.id,
        // No token_endpoint_auth_method field
      };
      await env.OAUTH_KV.put(`client:${legacyClientId}`, JSON.stringify(legacyClient));

      // Regenerate secret - should succeed
      const regenRes = await appRequest(`/developer/apps/${legacyClientId}/regenerate-secret`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      expect(regenRes.status).toBe(200);
      const { clientSecret } = await regenRes.json() as { clientSecret: string };
      expect(clientSecret).toBeDefined();
      expect(clientSecret).toMatch(/^tds_/);
      expect(clientSecret).not.toBe('tds_old_secret');
    });
  });
});
