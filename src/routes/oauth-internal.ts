/**
 * OAuth Internal Routes
 *
 * These routes are called by the web app (tampa.dev) via service binding
 * to complete OAuth authorization flows. They should NOT be called directly
 * by external clients.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, userIdentities, sessions, oauthClientRegistry } from '../db/schema.js';
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

/** Check if an OAuth client is a public client (no client secret, uses PKCE only) */
function isPublicOAuthClient(clientInfo: unknown): boolean {
  const info = clientInfo as Record<string, unknown>;
  // The library type uses camelCase (tokenEndpointAuthMethod), but DCR-registered
  // clients may store the RFC snake_case form (token_endpoint_auth_method).
  return info.tokenEndpointAuthMethod === 'none' || info.token_endpoint_auth_method === 'none';
}

export function createOAuthInternalRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * Parse an OAuth authorization request
   * POST /oauth/internal/parse-request
   *
   * Called by web app to parse OAuth params from the authorization URL
   */
  app.post('/parse-request', async (c) => {
    const body = await c.req.json();
    const parsed = parseAuthRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request: url is required and must be a valid URL' }, 400);
    }
    const { url } = parsed.data;

    try {
      // Create a mock request to parse
      const request = new Request(url);
      const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(request);

      // Look up client info
      const clientInfo = await c.env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);

      // Enforce PKCE for public clients (OAuth 2.1 requirement).
      // Public clients (token_endpoint_auth_method === 'none') cannot securely
      // store a client secret, so PKCE is the only protection against
      // authorization code interception attacks.
      if (clientInfo && isPublicOAuthClient(clientInfo) && !oauthReqInfo.codeChallenge) {
        return c.json({
          success: false,
          error: 'code_challenge is required for public clients (PKCE)',
        }, 400);
      }

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
  app.post('/complete', async (c) => {
    const body = await c.req.json();
    const parsed = completeAuthSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid request' }, 400);
    }
    const { oauthRequest, userId, approvedScopes } = parsed.data;

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
      // Defense-in-depth: enforce PKCE for public clients at the completion step.
      // The primary check is in parse-request, but this guards against callers
      // that bypass parse-request or tamper with the oauthRequest object.
      try {
        const clientInfo = await c.env.OAUTH_PROVIDER.lookupClient(oauthRequest.clientId);
        if (clientInfo && isPublicOAuthClient(clientInfo) && !oauthRequest.codeChallenge) {
          return c.json({
            success: false,
            error: 'code_challenge is required for public clients (PKCE)',
          }, 400);
        }
      } catch {
        // Fail closed: if we can't determine the client type, require PKCE.
        // This prevents a transient lookup failure from bypassing PKCE
        // enforcement for public clients. Confidential clients that hit this
        // path would need to include PKCE, which is best practice anyway.
        if (!oauthRequest.codeChallenge) {
          return c.json({
            success: false,
            error: 'code_challenge is required (unable to verify client type)',
          }, 400);
        }
      }

      // Filter scopes: strip role-gated scopes the user isn't eligible for.
      // This is the security boundary — non-admin users cannot mint tokens
      // with the 'admin' scope, even if the client requested it.
      const filteredScopes = filterScopesForUser(approvedScopes, user);

      // Complete the authorization via OAuthProvider
      // The oauthRequest was originally returned by parseAuthRequest() (which produces
      // a full AuthRequest), then round-tripped through JSON by the web frontend.
      // Optional fields in our Zod schema default to undefined after deserialization,
      // but the library handles this at runtime.
      const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthRequest as Parameters<typeof c.env.OAUTH_PROVIDER.completeAuthorization>[0]['request'],
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

      // Track grant creation for OAuth client lifecycle management.
      // Fire-and-forget: a failure here doesn't affect the OAuth flow.
      c.executionCtx.waitUntil(
        db.update(oauthClientRegistry)
          .set({ lastGrantAt: new Date().toISOString() })
          .where(eq(oauthClientRegistry.clientId, oauthRequest.clientId))
          .catch((e: unknown) => console.error('Failed to update lastGrantAt:', e))
      );

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
