/**
 * Developer Portal API Routes
 *
 * Allows authenticated users to register and manage their own OAuth applications.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, webhooks, webhookDeliveries } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';

// ============== Validation Schemas ==============

const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url()).min(1).max(10),
  website: z.string().url().optional(),
  logoUri: z.string().url().optional(),
  policyUri: z.string().url().optional(),
  tosUri: z.string().url().optional(),
});

const updateAppSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url()).min(1).max(10).optional(),
  website: z.string().url().optional(),
  logoUri: z.string().url().optional(),
  policyUri: z.string().url().optional(),
  tosUri: z.string().url().optional(),
});

const createWebhookSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.string().min(1)).min(1).default(['*']),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  eventTypes: z.array(z.string().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
});

// ============== Types ==============

interface OAuthClient {
  clientId: string;
  clientSecret?: string;
  clientName: string;
  clientUri?: string;
  logoUri?: string;
  redirectUris: string[];
  registrationDate: string;
  policyUri?: string;
  tosUri?: string;
  scope?: string;
  description?: string;
  // Ownership tracking
  ownerId?: string;
}

// ============== Helper Functions ==============

/**
 * Get current user from session cookie
 */
async function getCurrentUser(c: { env: Env; req: { raw: Request } }) {
  const cookieHeader = c.req.raw.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(c.env);
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionToken = sessionMatch?.[1];
  if (!sessionToken) return null;

  const db = createDatabase(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
}

/**
 * Generate a secure client ID
 */
function generateClientId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'td_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure client secret
 */
function generateClientSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'tds_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============== Routes ==============

export function createDeveloperRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/developer/apps - List user's registered apps
   */
  app.get('/apps', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    // List all clients and filter by owner
    const clientList = await kv.list({ prefix: 'client:' });
    const apps: Array<{
      clientId: string;
      name: string;
      description?: string;
      website?: string;
      logoUri?: string;
      redirectUris: string[];
      createdAt: string;
    }> = [];

    for (const key of clientList.keys) {
      const clientData = await kv.get(key.name, 'json') as OAuthClient | null;
      if (clientData?.ownerId === user.id) {
        apps.push({
          clientId: clientData.clientId,
          name: clientData.clientName,
          description: clientData.description,
          website: clientData.clientUri,
          logoUri: clientData.logoUri,
          redirectUris: clientData.redirectUris || [],
          createdAt: clientData.registrationDate,
        });
      }
    }

    return c.json({ apps });
  });

  /**
   * POST /api/developer/apps - Register a new OAuth app
   */
  app.post('/apps', zValidator('json', createAppSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    const data = c.req.valid('json');

    // Generate credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    // Create client data
    const clientData: OAuthClient = {
      clientId,
      clientSecret, // Stored hashed in production
      clientName: data.name,
      clientUri: data.website,
      logoUri: data.logoUri,
      redirectUris: data.redirectUris,
      registrationDate: new Date().toISOString(),
      policyUri: data.policyUri,
      tosUri: data.tosUri,
      description: data.description,
      ownerId: user.id,
    };

    // Store in KV
    await kv.put(`client:${clientId}`, JSON.stringify(clientData));

    // Return credentials (secret shown only once!)
    return c.json({
      clientId,
      clientSecret, // Only shown on creation!
      name: data.name,
      redirectUris: data.redirectUris,
      createdAt: clientData.registrationDate,
    }, 201);
  });

  /**
   * GET /api/developer/apps/:clientId - Get app details
   */
  app.get('/apps/:clientId', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('clientId');

    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    const clientData = await kv.get(`client:${clientId}`, 'json') as OAuthClient | null;

    if (!clientData) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Verify ownership
    if (clientData.ownerId !== user.id) {
      return c.json({ error: 'Not authorized to access this app' }, 403);
    }

    // Get usage stats
    const grantList = await kv.list({ prefix: 'grant:' });
    let activeUsers = 0;

    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) {
        activeUsers++;
      }
    }

    return c.json({
      clientId: clientData.clientId,
      name: clientData.clientName,
      description: clientData.description,
      website: clientData.clientUri,
      logoUri: clientData.logoUri,
      redirectUris: clientData.redirectUris || [],
      policyUri: clientData.policyUri,
      tosUri: clientData.tosUri,
      createdAt: clientData.registrationDate,
      activeUsers,
    });
  });

  /**
   * PATCH /api/developer/apps/:clientId - Update app settings
   */
  app.patch('/apps/:clientId', zValidator('json', updateAppSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('clientId');

    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    const clientData = await kv.get(`client:${clientId}`, 'json') as OAuthClient | null;

    if (!clientData) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Verify ownership
    if (clientData.ownerId !== user.id) {
      return c.json({ error: 'Not authorized to modify this app' }, 403);
    }

    const updates = c.req.valid('json');

    // Update fields
    const updatedClient: OAuthClient = {
      ...clientData,
      clientName: updates.name ?? clientData.clientName,
      description: updates.description ?? clientData.description,
      clientUri: updates.website ?? clientData.clientUri,
      logoUri: updates.logoUri ?? clientData.logoUri,
      redirectUris: updates.redirectUris ?? clientData.redirectUris,
      policyUri: updates.policyUri ?? clientData.policyUri,
      tosUri: updates.tosUri ?? clientData.tosUri,
    };

    await kv.put(`client:${clientId}`, JSON.stringify(updatedClient));

    return c.json({
      clientId: updatedClient.clientId,
      name: updatedClient.clientName,
      description: updatedClient.description,
      website: updatedClient.clientUri,
      redirectUris: updatedClient.redirectUris,
      updatedAt: new Date().toISOString(),
    });
  });

  /**
   * POST /api/developer/apps/:clientId/regenerate-secret - Generate new client secret
   */
  app.post('/apps/:clientId/regenerate-secret', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('clientId');

    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    const clientData = await kv.get(`client:${clientId}`, 'json') as OAuthClient | null;

    if (!clientData) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Verify ownership
    if (clientData.ownerId !== user.id) {
      return c.json({ error: 'Not authorized to modify this app' }, 403);
    }

    // Generate new secret
    const newSecret = generateClientSecret();

    // Update client
    const updatedClient: OAuthClient = {
      ...clientData,
      clientSecret: newSecret,
    };

    await kv.put(`client:${clientId}`, JSON.stringify(updatedClient));

    return c.json({
      clientId,
      clientSecret: newSecret, // Only shown on regeneration!
      message: 'Client secret has been regenerated. Save it now - it won\'t be shown again.',
    });
  });

  /**
   * DELETE /api/developer/apps/:clientId - Delete an app
   */
  app.delete('/apps/:clientId', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const kv = c.env.OAUTH_KV;
    const clientId = c.req.param('clientId');

    if (!kv) {
      return c.json({ error: 'OAuth not configured' }, 500);
    }

    const clientData = await kv.get(`client:${clientId}`, 'json') as OAuthClient | null;

    if (!clientData) {
      return c.json({ error: 'App not found' }, 404);
    }

    // Verify ownership
    if (clientData.ownerId !== user.id) {
      return c.json({ error: 'Not authorized to delete this app' }, 403);
    }

    // Delete all grants for this app
    const grantList = await kv.list({ prefix: 'grant:' });
    let deletedGrants = 0;

    for (const key of grantList.keys) {
      const grantData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (grantData?.clientId === clientId) {
        await kv.delete(key.name);
        deletedGrants++;
      }
    }

    // Delete all tokens for this app
    const tokenList = await kv.list({ prefix: 'token:' });
    let deletedTokens = 0;

    for (const key of tokenList.keys) {
      const tokenData = await kv.get(key.name, 'json') as { clientId?: string } | null;
      if (tokenData?.clientId === clientId) {
        await kv.delete(key.name);
        deletedTokens++;
      }
    }

    // Delete the client
    await kv.delete(`client:${clientId}`);

    return c.json({
      deleted: true,
      deletedGrants,
      deletedTokens,
    });
  });

  // ============== Webhook Routes ==============

  /**
   * GET /api/developer/webhooks - List user's webhooks
   */
  app.get('/webhooks', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);
    const userWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.userId, user.id),
    });

    return c.json({
      webhooks: userWebhooks.map((wh) => ({
        id: wh.id,
        url: wh.url,
        eventTypes: JSON.parse(wh.eventTypes),
        isActive: wh.isActive,
        createdAt: wh.createdAt,
        updatedAt: wh.updatedAt,
      })),
    });
  });

  /**
   * POST /api/developer/webhooks - Create a new webhook
   */
  app.post('/webhooks', zValidator('json', createWebhookSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    const id = crypto.randomUUID();
    const secret = generateWebhookSecret();

    await db.insert(webhooks).values({
      id,
      userId: user.id,
      url: data.url,
      secret,
      eventTypes: JSON.stringify(data.eventTypes),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return c.json({
      id,
      url: data.url,
      secret, // Only shown on creation!
      eventTypes: data.eventTypes,
      isActive: true,
      createdAt: new Date().toISOString(),
    }, 201);
  });

  /**
   * PATCH /api/developer/webhooks/:id - Update a webhook
   */
  app.patch('/webhooks/:id', zValidator('json', updateWebhookSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const webhookId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, user.id)),
    });

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    const updates = c.req.valid('json');
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.url !== undefined) updateValues.url = updates.url;
    if (updates.eventTypes !== undefined) updateValues.eventTypes = JSON.stringify(updates.eventTypes);
    if (updates.isActive !== undefined) updateValues.isActive = updates.isActive;

    await db.update(webhooks).set(updateValues).where(eq(webhooks.id, webhookId));

    return c.json({
      id: webhookId,
      url: updates.url ?? webhook.url,
      eventTypes: updates.eventTypes ?? JSON.parse(webhook.eventTypes),
      isActive: updates.isActive ?? webhook.isActive,
      updatedAt: updateValues.updatedAt,
    });
  });

  /**
   * DELETE /api/developer/webhooks/:id - Delete a webhook
   */
  app.delete('/webhooks/:id', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const webhookId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, user.id)),
    });

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    await db.delete(webhooks).where(eq(webhooks.id, webhookId));
    return c.json({ deleted: true });
  });

  /**
   * GET /api/developer/webhooks/:id/deliveries - Get recent deliveries
   */
  app.get('/webhooks/:id/deliveries', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const webhookId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    // Verify ownership
    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, user.id)),
    });

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    const deliveries = await db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, webhookId),
      orderBy: [desc(webhookDeliveries.deliveredAt)],
      limit: 50,
    });

    return c.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        eventType: d.eventType,
        statusCode: d.statusCode,
        attempt: d.attempt,
        deliveredAt: d.deliveredAt,
        responseBody: d.responseBody,
      })),
    });
  });

  /**
   * POST /api/developer/webhooks/:id/test - Send a test event
   */
  app.post('/webhooks/:id/test', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const webhookId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    const webhook = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, webhookId), eq(webhooks.userId, user.id)),
    });

    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404);
    }

    // Build a test payload
    const deliveryId = crypto.randomUUID();
    const testPayload = JSON.stringify({
      id: deliveryId,
      type: 'test.ping',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from Tampa Devs.',
      },
    });

    // Sign the payload
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhook.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(testPayload));
    const signature = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    let statusCode: number | null = null;
    let responseBody: string | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Event-Type': 'test.ping',
          'X-Delivery-ID': deliveryId,
          'User-Agent': 'TampaDevs-Webhooks/1.0',
        },
        body: testPayload,
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);
      if (responseBody && responseBody.length > 4096) {
        responseBody = responseBody.slice(0, 4096) + '... (truncated)';
      }
    } catch (err) {
      statusCode = 0;
      responseBody = err instanceof Error ? err.message : 'Network error';
    }

    // Log the delivery
    await db.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      eventType: 'test.ping',
      payload: testPayload,
      statusCode,
      responseBody,
      attempt: 1,
      deliveredAt: new Date().toISOString(),
    });

    return c.json({
      deliveryId,
      statusCode,
      success: statusCode !== null && statusCode >= 200 && statusCode < 300,
      responseBody,
    });
  });

  return app;
}

export const developerRoutes = createDeveloperRoutes();
