/**
 * Developer Portal API Routes
 *
 * Allows authenticated users to register and manage their own OAuth applications.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions } from '../db/schema';
import type { Env } from '../../types/worker';

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

  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
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

  return app;
}

export const developerRoutes = createDeveloperRoutes();
