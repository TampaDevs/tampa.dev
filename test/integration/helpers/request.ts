/**
 * Request Helper
 *
 * Builds the Hono app matching src/index.ts route mounting
 * (without OAuthProvider wrapper) and provides a convenient
 * appRequest() function for HTTP-level testing.
 */

import { createApp, addOpenAPIRoutes } from '../../../src/app';
import { registerEventRoutes } from '../../../src/routes/events';
import { registerGroupRoutes } from '../../../src/routes/groups';
import { registerSchemaRoutes } from '../../../src/routes/schemas';
import { registerFeedRoutes } from '../../../src/routes/feeds';
import { adminApiRoutes } from '../../../src/routes/admin-api';
import { authRoutes } from '../../../src/routes/auth';
import { oauthInternalRoutes } from '../../../src/routes/oauth-internal';
import { favoritesRoutes } from '../../../src/routes/favorites';
import { developerRoutes } from '../../../src/routes/developer';
import { uploadRoutes } from '../../../src/routes/uploads';
import { profileRoutes } from '../../../src/routes/profile';
import { publicUsersRoutes } from '../../../src/routes/public-users';
import { leaderboardRoutes, groupLeaderboardRoutes } from '../../../src/routes/leaderboard';
import { claimRoutes } from '../../../src/routes/claim';
import { badgesPublicRoutes } from '../../../src/routes/badges-public';
import { linkedAccountsRoutes } from '../../../src/routes/linked-accounts';
import { followsRoutes } from '../../../src/routes/follows';
import { onboardingRoutes } from '../../../src/routes/onboarding';
import { groupManagementRoutes } from '../../../src/routes/group-management';
import { groupClaimRoutes } from '../../../src/routes/group-claims';
import { rsvpRoutes } from '../../../src/routes/rsvp';
import { checkinPublicRoutes } from '../../../src/routes/checkin';
import { v1Routes } from '../../../src/routes/v1';
import { v1AdminRoutes } from '../../../src/routes/v1-admin';
import { v1ManageRoutes } from '../../../src/routes/v1-manage';
import { mcpRoutes } from '../../../src/routes/mcp';
import { wsRoutes } from '../../../src/routes/ws';
import type { Env } from '../../../types/worker';

let _app: ReturnType<typeof createApp> | null = null;

export function buildApp() {
  if (_app) return _app;

  const app = createApp();

  // Mount group management before registerGroupRoutes so /groups/manage
  // and /groups/create don't get caught by /groups/:slug
  app.route('/groups', groupManagementRoutes);

  // Mount group claim routes before registerGroupRoutes so /groups/claim/:token
  // and /groups/:groupId/claim don't get caught by /groups/:slug
  app.route('/groups', groupClaimRoutes);

  // Register function-style routes
  registerEventRoutes(app);
  registerGroupRoutes(app);
  registerSchemaRoutes(app);
  registerFeedRoutes(app);
  // Note: registerWidgetRoutes, registerPageRoutes, and registerAdminRoutes
  // are omitted — they use JSX rendering or dynamic require() that don't
  // work in the Node.js test environment. Test the API routes only.

  // Mount RSVP routes
  app.route('/events', rsvpRoutes);

  // Mount public checkin routes
  app.route('/checkin', checkinPublicRoutes);

  // Mount instance-style routes (same as src/index.ts)
  app.route('/auth', authRoutes);
  app.route('/oauth/internal', oauthInternalRoutes);
  app.route('/admin', adminApiRoutes);
  app.route('/favorites', favoritesRoutes);
  app.route('/developer', developerRoutes);
  app.route('/uploads', uploadRoutes);
  app.route('/profile', profileRoutes);
  app.route('/users', publicUsersRoutes);
  app.route('/leaderboard', leaderboardRoutes);
  app.route('/groups/:slug/leaderboard', groupLeaderboardRoutes);
  app.route('/claim', claimRoutes);
  app.route('/badges', badgesPublicRoutes);
  app.route('/me/linked-accounts', linkedAccountsRoutes);
  app.route('/', followsRoutes);
  app.route('/me/onboarding', onboardingRoutes);

  // Mount MCP server
  app.route('/mcp', mcpRoutes);

  // Mount /v1/ authenticated API
  app.route('/v1', v1Routes);

  // Mount /v1/admin/ platform admin API
  app.route('/v1/admin', v1AdminRoutes);

  // Mount /v1/manage/ group management API
  app.route('/v1/manage', v1ManageRoutes);

  // Mount WebSocket routes
  app.route('/ws', wsRoutes);

  addOpenAPIRoutes(app);
  app.get('/', (c) => c.redirect('/docs'));

  _app = app;
  return app;
}

interface RequestOptions {
  env: Env;
  method?: string;
  headers?: Record<string, string>;
  body?: string | object;
}

/**
 * Make a request to the Hono app with the given environment.
 * Handles JSON body serialization automatically.
 */
export async function appRequest(path: string, options: RequestOptions): Promise<Response> {
  const app = buildApp();
  const { env, method = 'GET', headers = {}, body } = options;

  const init: RequestInit = { method, headers: { ...headers } };

  if (body !== undefined) {
    if (typeof body === 'object') {
      init.body = JSON.stringify(body);
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    } else {
      init.body = body;
    }
  }

  const url = `http://localhost${path.startsWith('/') ? path : '/' + path}`;

  // Mock executionCtx with no-op waitUntil
  const executionCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  };

  return app.fetch(new Request(url, init), env, executionCtx as ExecutionContext);
}
