/**
 * OAuth Client Lifecycle Management Tests
 *
 * Verifies that:
 * - Developer portal registrations create D1 tracking records
 * - Developer portal deletions remove D1 tracking records
 * - Authorization completions update lastGrantAt
 * - Scheduled cleanup removes stale DCR clients (>48h, unused)
 * - Scheduled cleanup removes stale dev portal clients (>1y, unused)
 * - Scheduled cleanup preserves active clients
 */

import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  createTestEnv,
  createUser,
  createSession,
  appRequest,
  getDb,
} from '../helpers';
import { oauthClientRegistry } from '../../../src/db/schema';
import { handleScheduled } from '../../../src/scheduled/handler';
import type { Env } from '../../../types/worker';

// ── Developer Portal Tracking ──────────────────────────────────────

describe('OAuth Client Lifecycle - Developer Portal Tracking', () => {
  it('creates a D1 registry entry when an app is registered', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/developer/apps', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {
        name: 'Lifecycle Test App',
        redirectUris: ['https://example.com/callback'],
      },
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { clientId: string };

    // Verify D1 registry entry was created
    const db = getDb();
    const entry = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, body.clientId),
    });

    expect(entry).toBeDefined();
    expect(entry!.source).toBe('developer_portal');
    expect(entry!.ownerId).toBe(user.id);
    expect(entry!.clientName).toBe('Lifecycle Test App');
    expect(entry!.registeredAt).toBeTruthy();
    expect(entry!.lastGrantAt).toBeNull();
  });

  it('removes the D1 registry entry when an app is deleted', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    // Create the app first
    const createRes = await appRequest('/developer/apps', {
      env,
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: {
        name: 'App To Delete',
        redirectUris: ['https://example.com/callback'],
      },
    });

    expect(createRes.status).toBe(201);
    const { clientId } = await createRes.json() as { clientId: string };

    // Verify it exists in D1
    const db = getDb();
    const entryBefore = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, clientId),
    });
    expect(entryBefore).toBeDefined();

    // Delete the app
    const deleteRes = await appRequest(`/developer/apps/${clientId}`, {
      env,
      method: 'DELETE',
      headers: { Cookie: cookieHeader },
    });

    expect(deleteRes.status).toBe(200);

    // Verify it was removed from D1
    const entryAfter = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, clientId),
    });
    expect(entryAfter).toBeUndefined();
  });
});

// ── Grant Tracking (lastGrantAt) ───────────────────────────────────

describe('OAuth Client Lifecycle - Grant Tracking', () => {
  it('updates lastGrantAt when authorization is completed', async () => {
    const db = getDb();

    // Pre-populate a registry entry (as if the client was DCR-registered)
    const clientId = 'test-grant-tracking-client';
    await db.insert(oauthClientRegistry).values({
      clientId,
      source: 'dcr',
      clientName: 'Grant Tracking Test',
    });

    // Verify lastGrantAt is initially null
    const before = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, clientId),
    });
    expect(before!.lastGrantAt).toBeNull();

    // Complete an authorization for this client
    const { env } = createTestEnv({
      OAUTH_PROVIDER: {
        lookupClient: async () => ({
          clientId,
          clientName: 'Grant Tracking Test',
          redirectUris: ['https://example.com/callback'],
          token_endpoint_auth_method: 'client_secret_post',
        }),
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
        oauthRequest: {
          responseType: 'code',
          clientId,
          redirectUri: 'https://example.com/callback',
          state: 'test-state',
          codeChallenge: 'test-challenge',
          codeChallengeMethod: 'S256',
        },
        userId: user.id,
        approvedScopes: ['user'],
      },
    });

    expect(res.status).toBe(200);

    // The lastGrantAt update happens via waitUntil (fire-and-forget).
    // In tests, the promise executes eagerly via .catch() chaining.
    // Allow a short delay for the in-process D1 write to settle.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const after = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, clientId),
    });
    expect(after!.lastGrantAt).toBeTruthy();
  });
});

// ── Scheduled Cleanup ──────────────────────────────────────────────

describe('OAuth Client Lifecycle - Scheduled Cleanup', () => {
  /** Insert a registry entry with controlled timestamps */
  async function insertRegistryEntry(data: {
    clientId: string;
    source: string;
    ownerId?: string;
    clientName?: string;
    registeredAt: string;
    lastGrantAt?: string;
  }) {
    const db = getDb();
    await db.insert(oauthClientRegistry).values({
      clientId: data.clientId,
      source: data.source,
      ownerId: data.ownerId ?? null,
      clientName: data.clientName ?? null,
      registeredAt: data.registeredAt,
      lastGrantAt: data.lastGrantAt ?? null,
    });
  }

  /** Trigger the truncation cron job */
  async function runTruncation(env: Env) {
    const controller = { cron: '0 3 * * *', scheduledTime: Date.now() } as ScheduledController;
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    } as unknown as ExecutionContext;
    await handleScheduled(controller, env, ctx);
  }

  /** Check if a client still exists in D1 */
  async function clientExists(clientId: string): Promise<boolean> {
    const db = getDb();
    const entry = await db.query.oauthClientRegistry.findFirst({
      where: eq(oauthClientRegistry.clientId, clientId),
    });
    return entry !== undefined;
  }

  describe('DCR clients', () => {
    it('removes DCR clients registered >48h ago that were never used', async () => {
      const { env } = createTestEnv();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'stale-dcr-client',
        source: 'dcr',
        registeredAt: threeDaysAgo,
      });

      // Also put the client in KV so cleanup can delete it
      await env.OAUTH_KV.put('client:stale-dcr-client', JSON.stringify({ clientId: 'stale-dcr-client' }));

      await runTruncation(env);

      expect(await clientExists('stale-dcr-client')).toBe(false);
      // Verify KV entry was also deleted
      const kvEntry = await env.OAUTH_KV.get('client:stale-dcr-client');
      expect(kvEntry).toBeNull();
    });

    it('preserves DCR clients registered <48h ago', async () => {
      const { env } = createTestEnv();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'fresh-dcr-client',
        source: 'dcr',
        registeredAt: oneHourAgo,
      });

      await runTruncation(env);

      expect(await clientExists('fresh-dcr-client')).toBe(true);
    });

    it('preserves DCR clients that have been used (has lastGrantAt)', async () => {
      const { env } = createTestEnv();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'used-dcr-client',
        source: 'dcr',
        registeredAt: threeDaysAgo,
        lastGrantAt: oneDayAgo,
      });

      await runTruncation(env);

      expect(await clientExists('used-dcr-client')).toBe(true);
    });
  });

  describe('Developer portal clients', () => {
    it('removes dev portal clients registered >1y ago that were never used', async () => {
      const { env } = createTestEnv();
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'stale-devportal-unused',
        source: 'developer_portal',
        ownerId: 'some-user',
        registeredAt: twoYearsAgo,
      });

      await env.OAUTH_KV.put('client:stale-devportal-unused', JSON.stringify({ clientId: 'stale-devportal-unused' }));

      await runTruncation(env);

      expect(await clientExists('stale-devportal-unused')).toBe(false);
      const kvEntry = await env.OAUTH_KV.get('client:stale-devportal-unused');
      expect(kvEntry).toBeNull();
    });

    it('removes dev portal clients whose last sign-in was >1y ago', async () => {
      const { env } = createTestEnv();
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenMonthsAgo = new Date(Date.now() - 14 * 30 * 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'stale-devportal-old-grant',
        source: 'developer_portal',
        ownerId: 'some-user',
        registeredAt: twoYearsAgo,
        lastGrantAt: fourteenMonthsAgo,
      });

      await env.OAUTH_KV.put('client:stale-devportal-old-grant', JSON.stringify({ clientId: 'stale-devportal-old-grant' }));

      await runTruncation(env);

      expect(await clientExists('stale-devportal-old-grant')).toBe(false);
    });

    it('preserves dev portal clients used within the last year', async () => {
      const { env } = createTestEnv();
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'active-devportal-client',
        source: 'developer_portal',
        ownerId: 'some-user',
        registeredAt: twoYearsAgo,
        lastGrantAt: oneMonthAgo,
      });

      await runTruncation(env);

      expect(await clientExists('active-devportal-client')).toBe(true);
    });

    it('preserves dev portal clients registered <1y ago even if never used', async () => {
      const { env } = createTestEnv();
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

      await insertRegistryEntry({
        clientId: 'recent-devportal-client',
        source: 'developer_portal',
        ownerId: 'some-user',
        registeredAt: sixMonthsAgo,
      });

      await runTruncation(env);

      expect(await clientExists('recent-devportal-client')).toBe(true);
    });
  });
});
