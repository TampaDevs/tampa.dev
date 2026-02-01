/**
 * OAuth Internal Routes
 *
 * These routes are called by the web app (tampa.dev) via service binding
 * to complete OAuth authorization flows. They should NOT be called directly
 * by external clients.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, userIdentities, sessions } from '../db/schema.js';
import { filterScopesForUser } from '../lib/scopes.js';
import { getAuthUser } from '../middleware/auth.js';
import type { Env } from '../../types/worker.js';

// Schema for completing authorization
const completeAuthSchema = z.object({
  // The original OAuth request (from parseAuthRequest)
  oauthRequest: z.object({
    responseType: z.string(),
    clientId: z.string(),
    redirectUri: z.string(),
    scope: z.array(z.string()).optional(),
    state: z.string().optional(),
    codeChallenge: z.string().optional(),
    codeChallengeMethod: z.string().optional(),
  }),
  // The authenticated user's ID
  userId: z.string(),
  // Approved scopes
  approvedScopes: z.array(z.string()),
});

// Schema for parsing auth request
const parseAuthRequestSchema = z.object({
  url: z.string().url(),
});

export function createOAuthInternalRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * Parse an OAuth authorization request
   * POST /oauth/internal/parse-request
   *
   * Called by web app to parse OAuth params from the authorization URL
   */
  app.post('/parse-request', zValidator('json', parseAuthRequestSchema), async (c) => {
    const { url } = c.req.valid('json');

    try {
      // Create a mock request to parse
      const request = new Request(url);
      const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(request);

      // Look up client info
      const clientInfo = await c.env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);

      return c.json({
        success: true,
        oauthRequest: oauthReqInfo,
        client: clientInfo,
      });
    } catch (error) {
      console.error('Failed to parse OAuth request:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse request',
      }, 400);
    }
  });

  /**
   * Complete an OAuth authorization
   * POST /oauth/internal/complete
   *
   * Called by web app after user approves the authorization
   */
  app.post('/complete', zValidator('json', completeAuthSchema), async (c) => {
    const { oauthRequest, userId, approvedScopes } = c.req.valid('json');

    // Defense-in-depth: validate the caller's session matches the userId
    // in the request body. These routes are meant to be internal-only (called
    // by the web app via service binding), but if they're ever exposed
    // externally, this prevents unauthenticated callers and stops users
    // from completing OAuth flows on behalf of other users.
    const sessionUser = await getAuthUser(c);
    if (!sessionUser) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    if (sessionUser.id !== userId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const db = createDatabase(c.env.DB);

    // Verify user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Get user's GitHub identity for additional profile info
    const githubIdentity = await db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, userId),
        eq(userIdentities.provider, 'github')
      ),
    });

    try {
      // Filter scopes: strip role-gated scopes the user isn't eligible for.
      // This is the security boundary — non-admin users cannot mint tokens
      // with the 'admin' scope, even if the client requested it.
      const filteredScopes = filterScopesForUser(approvedScopes, user);

      // Complete the authorization via OAuthProvider
      const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthRequest,
        userId: user.id,
        metadata: {
          email: user.email,
          name: user.name,
          approvedAt: new Date().toISOString(),
        },
        scope: filteredScopes,
        // Props passed to API handlers when this token is used
        props: {
          userId: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          githubUsername: githubIdentity?.providerUsername,
          scopes: filteredScopes,
        },
      });

      return c.json({
        success: true,
        redirectTo,
      });
    } catch (error) {
      console.error('Failed to complete authorization:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete authorization',
      }, 500);
    }
  });

  /**
   * Look up a client by ID
   * GET /oauth/internal/client/:clientId
   */
  app.get('/client/:clientId', async (c) => {
    const clientId = c.req.param('clientId');

    try {
      const clientInfo = await c.env.OAUTH_PROVIDER.lookupClient(clientId);

      if (!clientInfo) {
        return c.json({ success: false, error: 'Client not found' }, 404);
      }

      return c.json({
        success: true,
        client: clientInfo,
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to look up client',
      }, 500);
    }
  });

  /**
   * List user's OAuth grants (for account settings)
   * GET /oauth/internal/grants/:userId
   */
  app.get('/grants/:userId', async (c) => {
    const userId = c.req.param('userId');

    const sessionUser = await getAuthUser(c);
    if (!sessionUser) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    if (sessionUser.id !== userId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    try {
      const grants = await c.env.OAUTH_PROVIDER.listUserGrants(userId);

      // Map GrantSummary to the shape the frontend expects (OAuthGrant)
      const mappedGrants = await Promise.allSettled(
        grants.items.map(async (grant) => {
          const client = await c.env.OAUTH_PROVIDER.lookupClient(grant.clientId);
          return {
            grantId: grant.id,
            clientId: grant.clientId,
            clientName: client?.clientName || grant.clientId,
            clientUri: client?.clientUri,
            logoUri: client?.logoUri,
            scopes: grant.scope,
            grantedAt: new Date(grant.createdAt * 1000).toISOString(),
          };
        })
      );

      return c.json({
        success: true,
        grants: mappedGrants
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<unknown>).value),
        cursor: grants.cursor,
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list grants',
      }, 500);
    }
  });

  /**
   * Revoke an OAuth grant
   * DELETE /oauth/internal/grants/:userId/:grantId
   */
  app.delete('/grants/:userId/:grantId', async (c) => {
    const userId = c.req.param('userId');
    const grantId = c.req.param('grantId');

    const sessionUser = await getAuthUser(c);
    if (!sessionUser) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    if (sessionUser.id !== userId) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    try {
      await c.env.OAUTH_PROVIDER.revokeGrant(grantId, userId);

      return c.json({ success: true });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke grant',
      }, 500);
    }
  });

  return app;
}

export const oauthInternalRoutes = createOAuthInternalRoutes();
