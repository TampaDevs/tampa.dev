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
  getDb,
} from '../helpers';
import { oauthGrants } from '../../../src/db/schema';

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

    it('stores client secrets as SHA-256 hashes in KV (not plaintext)', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Create a confidential app
      const res = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          name: 'Hash Test App',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      expect(res.status).toBe(201);
      const { clientId, clientSecret } = await res.json() as { clientId: string; clientSecret: string };

      // Verify plaintext secret returned to user
      expect(clientSecret).toMatch(/^tds_/);

      // Verify stored secret is a 64-char hex hash (SHA-256), NOT plaintext
      let stored = await env.OAUTH_KV.get(`client:${clientId}`, 'json') as { clientSecret: string } | null;
      expect(stored).not.toBeNull();
      expect(stored!.clientSecret).toMatch(/^[a-f0-9]{64}$/);
      expect(stored!.clientSecret).not.toMatch(/^tds_/);
      expect(stored!.clientSecret).not.toBe(clientSecret);

      // Regenerate secret and verify it's also hashed
      const regenRes = await appRequest(`/developer/apps/${clientId}/regenerate-secret`, {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });

      expect(regenRes.status).toBe(200);
      const { clientSecret: newSecret } = await regenRes.json() as { clientSecret: string };

      // Verify plaintext secret returned to user
      expect(newSecret).toMatch(/^tds_/);
      expect(newSecret).not.toBe(clientSecret);

      // Verify regenerated secret is also stored as a hash
      stored = await env.OAUTH_KV.get(`client:${clientId}`, 'json') as { clientSecret: string } | null;
      expect(stored).not.toBeNull();
      expect(stored!.clientSecret).toMatch(/^[a-f0-9]{64}$/);
      expect(stored!.clientSecret).not.toBe(newSecret);
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

  describe('App deletion', () => {
    it('deletes grants and tokens when an app is deleted', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const user2 = await createUser(); // Second user who also authorized the app
      const { cookieHeader } = await createSession(user.id);
      const db = getDb();

      // Use unique IP to avoid rate limit collisions with other tests
      const uniqueIp = `10.0.0.${Math.floor(Math.random() * 255)}`;

      // Create an app
      const createRes = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader, 'X-Forwarded-For': uniqueIp },
        body: {
          name: 'App To Delete',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      expect(createRes.status).toBe(201);
      const { clientId } = await createRes.json() as { clientId: string };

      // Simulate grants from two different users who authorized this app
      // (Each user can have only one grant per client in D1)
      const grantKey1 = `grant:${user.id}:grant1`;
      const grantKey2 = `grant:${user2.id}:grant2`;
      const grantKeyOther = `grant:other-user:grant3`;
      const tokenKey1 = `token:${user.id}:grant1:token1`;
      const tokenKey2 = `token:${user2.id}:grant2:token2`;
      const tokenKeyOther = `token:other-user:grant3:token3`;

      // Insert grants into D1 (the authoritative source for deletion)
      // Each grant is from a different user, satisfying the unique (userId, clientId) constraint
      await db.insert(oauthGrants).values([
        {
          grantId: 'grant1',
          userId: user.id,
          clientId,
          grantKey: grantKey1,
          scopes: JSON.stringify(['read:user']),
        },
        {
          grantId: 'grant2',
          userId: user2.id,
          clientId,
          grantKey: grantKey2,
          scopes: JSON.stringify(['read:events']),
        },
      ]);

      // Grants for our app in KV
      await env.OAUTH_KV.put(grantKey1, JSON.stringify({ clientId, scope: ['read:user'] }));
      await env.OAUTH_KV.put(grantKey2, JSON.stringify({ clientId, scope: ['read:events'] }));
      // Grant for different app (should NOT be deleted)
      await env.OAUTH_KV.put(grantKeyOther, JSON.stringify({ clientId: 'other_client', scope: ['read:user'] }));

      // Tokens for our app
      await env.OAUTH_KV.put(tokenKey1, JSON.stringify({ clientId, scope: ['read:user'] }));
      await env.OAUTH_KV.put(tokenKey2, JSON.stringify({ clientId, scope: ['read:events'] }));
      // Token for different app (should NOT be deleted)
      await env.OAUTH_KV.put(tokenKeyOther, JSON.stringify({ clientId: 'other_client', scope: ['read:user'] }));

      // Delete the app
      const deleteRes = await appRequest(`/developer/apps/${clientId}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });

      expect(deleteRes.status).toBe(200);
      const deleteBody = await deleteRes.json() as { deleted: boolean; deletedGrants: number; deletedTokens: number };
      expect(deleteBody.deleted).toBe(true);
      expect(deleteBody.deletedGrants).toBe(2);
      expect(deleteBody.deletedTokens).toBe(2);

      // Verify our grants/tokens are deleted from KV
      expect(await env.OAUTH_KV.get(grantKey1)).toBeNull();
      expect(await env.OAUTH_KV.get(grantKey2)).toBeNull();
      expect(await env.OAUTH_KV.get(tokenKey1)).toBeNull();
      expect(await env.OAUTH_KV.get(tokenKey2)).toBeNull();

      // Verify grants are deleted from D1
      const remainingGrants = await db.query.oauthGrants.findMany({
        where: (g, { eq }) => eq(g.clientId, clientId),
      });
      expect(remainingGrants).toHaveLength(0);

      // Verify other app's grants/tokens are NOT deleted
      expect(await env.OAUTH_KV.get(grantKeyOther)).not.toBeNull();
      expect(await env.OAUTH_KV.get(tokenKeyOther)).not.toBeNull();

      // Verify client is deleted
      expect(await env.OAUTH_KV.get(`client:${clientId}`)).toBeNull();
    });

    it('handles app deletion when no grants/tokens exist', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      // Use unique IP to avoid rate limit collisions with other tests
      const uniqueIp = `10.0.1.${Math.floor(Math.random() * 255)}`;

      // Create an app
      const createRes = await appRequest('/developer/apps', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader, 'X-Forwarded-For': uniqueIp },
        body: {
          name: 'App With No Grants',
          redirectUris: ['https://example.com/callback'],
          isPublicClient: false,
        },
      });

      expect(createRes.status).toBe(201);
      const { clientId } = await createRes.json() as { clientId: string };

      // Delete immediately (no grants/tokens)
      const deleteRes = await appRequest(`/developer/apps/${clientId}`, {
        env,
        method: 'DELETE',
        headers: { Cookie: cookieHeader },
      });

      expect(deleteRes.status).toBe(200);
      const deleteBody = await deleteRes.json() as { deleted: boolean; deletedGrants: number; deletedTokens: number };
      expect(deleteBody.deleted).toBe(true);
      expect(deleteBody.deletedGrants).toBe(0);
      expect(deleteBody.deletedTokens).toBe(0);
    });
  });
});
