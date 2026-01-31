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
import { handleQueueBatch } from './queue/handler.js';
import { registerWebhookHandler } from './queue/webhook-handler.js';
import { registerAchievementHandler } from './queue/achievement-handler.js';
import { registerNotificationHandler } from './queue/notification-handler.js';
import { OAuthApiHandler } from './handlers/oauth-api.js';
import { createDatabase } from './db/index.js';
import { apiTokens, users } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Register queue event handlers
registerWebhookHandler();
registerAchievementHandler();
registerNotificationHandler();
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
app.route('/admin', adminApiRoutes);

// Mount OAuth internal routes (for web app to complete authorization)
app.route('/oauth/internal', oauthInternalRoutes);

// Mount favorites API (session-based auth)
app.route('/favorites', favoritesRoutes);

// Mount developer portal API (session-based auth)
app.route('/developer', developerRoutes);

// Mount uploads API (session-based auth for upload, public for serving)
app.route('/uploads', uploadRoutes);

// Mount profile API (session-based auth)
app.route('/profile', profileRoutes);

// Mount public user profiles (no auth required)
import { publicUsersRoutes } from './routes/public-users.js';
app.route('/users', publicUsersRoutes);

// Mount leaderboard (no auth required)
import { leaderboardRoutes } from './routes/leaderboard.js';
app.route('/leaderboard', leaderboardRoutes);

// Mount badge claim routes (public for GET, auth for POST)
import { claimRoutes } from './routes/claim.js';
app.route('/claim', claimRoutes);

// Mount public badges API (no auth required)
import { badgesPublicRoutes } from './routes/badges-public.js';
app.route('/badges', badgesPublicRoutes);

// Mount linked accounts API (session-based auth)
import { linkedAccountsRoutes } from './routes/linked-accounts.js';
app.route('/me/linked-accounts', linkedAccountsRoutes);

// Mount follows API (mixed: some auth required, some public)
import { followsRoutes } from './routes/follows.js';
app.route('/', followsRoutes);

// Mount onboarding API (session-based auth)
import { onboardingRoutes } from './routes/onboarding.js';
app.route('/me/onboarding', onboardingRoutes);

// Mount WebSocket upgrade routes (personal + broadcast)
import { wsRoutes } from './routes/ws.js';
app.route('/ws', wsRoutes);

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

// Tampa Devs OAuth scopes (includes both new and legacy scopes for backwards compat)
const SCOPES_SUPPORTED = [
  // New GitHub-style scopes
  'user',
  'read:user',
  'user:email',
  'read:events',
  'read:groups',
  'read:favorites',
  'write:favorites',
  'read:portfolio',
  'write:portfolio',
  'admin',
  // Legacy scopes (kept for backwards compatibility with existing OAuth tokens)
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
  apiRoute: '/v1/',
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

  // Resolve Personal Access Tokens (td_pat_...) that aren't in the OAuth KV store
  async resolveExternalToken({ token, env }: { token: string; request: Request; env: Env }) {
    if (!token.startsWith('td_pat_')) return null;

    const db = createDatabase(env.DB);

    // Hash the token with SHA-256 (matches how PATs are stored)
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const tokenRecord = await db.query.apiTokens.findFirst({
      where: eq(apiTokens.tokenHash, tokenHash),
    });
    if (!tokenRecord) return null;

    // Check expiration
    if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) return null;

    // Look up the user
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenRecord.userId),
    });
    if (!user) return null;

    // Update last_used_at (fire-and-forget)
    db.update(apiTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiTokens.id, tokenRecord.id))
      .then(() => {})
      .catch(() => {});

    return {
      props: {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        githubUsername: null,
        scopes: JSON.parse(tokenRecord.scopes),
      },
    };
  },
});

/**
 * Backward-compatible /api/ prefix strip.
 *
 * Routes no longer have the /api/ prefix (e.g., /admin, /v1/, /users).
 * Legacy callers using /api/admin/... or /api/v1/... still work because
 * we strip the /api prefix before routing.
 *
 * This handles:
 *   events.api.tampa.dev/api/v1/events → /v1/events
 *   tampa.dev/api/admin/...            → /admin/...
 *   api.tampa.dev/api/v1/events        → /v1/events  (already works without /api/ too)
 */
function stripLegacyApiPrefix(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    url.pathname = url.pathname.slice(4); // Remove '/api'
    return new Request(url.toString(), request);
  }
  return request;
}

// Export Durable Object classes (must be named exports from the entry point)
export { UserNotificationDO } from './durable-objects/user-notification.js';
export { BroadcastDO } from './durable-objects/broadcast.js';

// Export combined worker with fetch (OAuth), scheduled, and queue handlers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // WebSocket upgrades bypass OAuthProvider (which can't handle 101 responses)
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return app.fetch(request, env, ctx);
    }
    return oauthProvider.fetch(stripLegacyApiPrefix(request), env, ctx);
  },
  scheduled: handleScheduled,
  queue: handleQueueBatch,
};
