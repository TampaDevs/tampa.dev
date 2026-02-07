/**
 * OIDC UserInfo Endpoint
 *
 * Returns user claims from a valid access token per OIDC Core 5.3.
 * Supports both GET and POST as required by OIDC Core 5.3.1.
 *
 * https://openid.net/specs/openid-connect-core-1_0.html#UserInfo
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCurrentUser } from '../lib/auth.js';
import { buildUserClaims } from '../lib/oidc-claims.js';
import { getActiveEntitlements } from '../lib/entitlements.js';
import { createDatabase } from '../db/index.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { Env } from '../../types/worker.js';

export function createUserinfoRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  const handler = async (c: Context<{ Bindings: Env }>) => {
    const auth = await getCurrentUser(c);
    if (!auth) {
      // OIDC Core 5.3.3: MUST return WWW-Authenticate header on error
      return c.json(
        { error: 'invalid_token', error_description: 'The access token is invalid or expired' },
        401,
        { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
      );
    }

    // Fetch active entitlements for the custom claim
    const db = createDatabase(c.env.DB);
    const entitlements = await getActiveEntitlements(db, auth.user.id);

    const claims = buildUserClaims(auth.user, auth.scopes, { entitlements });

    return c.json(claims, 200, {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    });
  };

  // Rate limit: 60 req/min per IP (returns PII)
  const limiter = rateLimit({ prefix: 'userinfo', maxRequests: 60, windowSeconds: 60 });

  // OIDC Core 5.3.1: MUST support GET and POST
  app.get('/', limiter, handler);
  app.post('/', limiter, handler);

  return app;
}

export const userinfoRoutes = createUserinfoRoutes();
