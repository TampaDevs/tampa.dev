/**
 * Tampa Devs Events API
 *
 * This worker is wrapped by OAuthProvider to enable "Sign in with Tampa Devs"
 * for third-party applications in the Tampa Bay tech community.
 */

import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { createApp, addOpenAPIRoutes } from './app.js';
import { registerEventRoutes } from './routes/events.js';
import { registerGroupRoutes } from './routes/groups.js';
import { registerSchemaRoutes } from './routes/schemas.js';
import { registerFeedRoutes } from './routes/feeds.js';
import { registerWidgetRoutes } from './routes/widgets.js';
import { registerPageRoutes } from './routes/pages.js';
import { registerAdminRoutes } from './routes/admin.js';
import { adminApiRoutes } from './routes/admin-api.js';
import { authRoutes } from './routes/auth.js';
import { oauthInternalRoutes } from './routes/oauth-internal.js';
import { favoritesRoutes } from './routes/favorites.js';
import { developerRoutes } from './routes/developer.js';
import { uploadRoutes } from './routes/uploads.js';
import { profileRoutes } from './routes/profile.js';
import { handleScheduled } from './scheduled/handler.js';
import { OAuthApiHandler } from './handlers/oauth-api.js';
import type { Env } from '../types/worker.js';

// Create Hono app (becomes the defaultHandler for non-OAuth requests)
const app = createApp();

// Register all route modules
registerEventRoutes(app);
registerGroupRoutes(app);
registerSchemaRoutes(app);
registerFeedRoutes(app);
registerWidgetRoutes(app);
registerPageRoutes(app);
registerAdminRoutes(app);

// Mount auth routes (GitHub OAuth - upstream auth)
app.route('/auth', authRoutes);

// Mount admin API routes (session-based auth)
app.route('/api/admin', adminApiRoutes);

// Mount OAuth internal routes (for web app to complete authorization)
app.route('/oauth/internal', oauthInternalRoutes);

// Mount favorites API (session-based auth)
app.route('/api/favorites', favoritesRoutes);

// Mount developer portal API (session-based auth)
app.route('/api/developer', developerRoutes);

// Mount uploads API (session-based auth for upload, public for serving)
app.route('/api/uploads', uploadRoutes);

// Mount profile API (session-based auth)
app.route('/api/profile', profileRoutes);

// Add OpenAPI documentation routes
addOpenAPIRoutes(app);

// Root path redirects to API documentation
app.get('/', (c) => c.redirect('/docs'));

// The defaultHandler object wraps our Hono app
const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};

// Tampa Devs OAuth scopes
const SCOPES_SUPPORTED = [
  'profile',
  'events:read',
  'groups:read',
  'rsvp:read',
  'rsvp:write',
  'favorites:read',
  'favorites:write',
];

// Create the OAuthProvider instance
const oauthProvider = new OAuthProvider({
  // OAuth-protected API routes (require valid access token)
  // Third-party apps call these with Bearer tokens
  apiRoute: '/api/v1/',
  apiHandler: OAuthApiHandler,

  // All other requests go to the Hono app
  defaultHandler,

  // OAuth endpoints
  // The authorize endpoint is on the web app (tampa.dev) for nice UI
  authorizeEndpoint: 'https://tampa.dev/oauth/authorize',
  tokenEndpoint: '/oauth/token',

  // Dynamic client registration (apps can self-register)
  clientRegistrationEndpoint: '/oauth/register',

  // Supported scopes
  scopesSupported: SCOPES_SUPPORTED,

  // Security settings
  allowImplicitFlow: false, // Only authorization code flow with PKCE
  disallowPublicClientRegistration: false, // Allow SPAs to register

  // Token TTLs
  refreshTokenTTL: 30 * 24 * 60 * 60, // 30 days
});

// Export combined worker with both fetch (OAuth) and scheduled handlers
export default {
  fetch: oauthProvider.fetch.bind(oauthProvider),
  scheduled: handleScheduled,
};
