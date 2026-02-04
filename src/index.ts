/**
 * Tampa.dev Events API
 *
 * This worker is wrapped by OAuthProvider to enable "Sign in with Tampa.dev"
 * for third-party applications in the Tampa Bay tech community.
 */

import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { createApp, addOpenAPIRoutes } from './app.js';
import { resolveExternalToken } from './lib/auth.js';
import { createDatabase } from './db/index.js';
import { oauthClientRegistry } from './db/schema.js';
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

// Register queue event handlers
registerWebhookHandler();
registerAchievementHandler();
registerNotificationHandler();
import type { Env } from '../types/worker.js';

// Create Hono app (becomes the defaultHandler for non-OAuth requests)
const app = createApp();

// Mount group management API (session-based auth, role-gated)
// Must be mounted before registerGroupRoutes so /groups/manage and /groups/create
// don't get caught by /groups/:slug
import { groupManagementRoutes } from './routes/group-management.js';
app.route('/groups', groupManagementRoutes);

// Mount group claim routes (before registerGroupRoutes so /groups/claim/:token
// and /groups/:groupId/claim don't get caught by /groups/:slug)
import { groupClaimRoutes } from './routes/group-claims.js';
app.route('/groups', groupClaimRoutes);

// Register all route modules
registerEventRoutes(app);
registerGroupRoutes(app);
registerSchemaRoutes(app);
registerFeedRoutes(app);
registerWidgetRoutes(app);
registerPageRoutes(app);
registerAdminRoutes(app);

// Mount RSVP routes (session-based auth for POST/DELETE, mixed for GET)
import { rsvpRoutes } from './routes/rsvp.js';
app.route('/events', rsvpRoutes);

// Mount public checkin routes (GET no auth, POST auth required)
import { checkinPublicRoutes } from './routes/checkin.js';
app.route('/checkin', checkinPublicRoutes);

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
import { leaderboardRoutes, groupLeaderboardRoutes } from './routes/leaderboard.js';
app.route('/leaderboard', leaderboardRoutes);

// Mount emoji name-to-URL mapping (no auth required)
import { emojiRoutes } from './routes/emojis.js';
app.route('/emojis', emojiRoutes);

// Mount static brand assets (no auth required)
import { assetsRoutes } from './routes/assets.js';
app.route('/assets', assetsRoutes);

// Mount group leaderboard (no auth required, public)
app.route('/groups/:slug/leaderboard', groupLeaderboardRoutes);

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

// Mount MCP server (Streamable HTTP, tri-auth: PAT, OAuth, session)
import { mcpRoutes } from './routes/mcp.js';
app.route('/mcp', mcpRoutes);

// Mount /v1/ authenticated API (tri-auth: PAT, OAuth, session)
import { v1Routes } from './routes/v1.js';
app.route('/v1', v1Routes);

// Mount /v1/admin/ platform admin API (tri-auth with admin scope)
import { v1AdminRoutes } from './routes/v1-admin.js';
app.route('/v1/admin', v1AdminRoutes);

// Mount /v1/manage/ group management API (tri-auth with manage:* scopes)
import { v1ManageRoutes } from './routes/v1-manage.js';
app.route('/v1/manage', v1ManageRoutes);

// Add OpenAPI documentation routes
addOpenAPIRoutes(app);

// Root path redirects to API documentation
app.get('/', (c) => c.redirect('/docs'));

// Machine-readable API discovery for LLMs and AI agents
app.get('/llms.txt', (c) => {
  const text = `# Tampa.dev Platform API
> The Tampa.dev Platform API provides authenticated access to community data including user profiles, events, groups, badges, and more.

## Base URL
https://api.tampa.dev

## Authentication
- Personal Access Tokens: Authorization: Bearer td_pat_...
- OAuth 2.0: Authorization: Bearer <access_token>
- Create PATs at https://tampa.dev/developer
- OAuth authorize: https://tampa.dev/oauth/authorize

## OpenAPI Spec
Full machine-readable spec: https://api.tampa.dev/openapi.json
Interactive docs: https://api.tampa.dev/docs

## Scopes
- user: Read/write access to profile info (includes user:email and read:user)
- read:user: Read your public profile data
- user:email: Read your email address
- read:events: Read events and event details
- write:events: RSVP to events and check in
- read:groups: Read groups and group details
- read:favorites: Read your favorite groups
- write:favorites: Manage your favorite groups
- read:portfolio: Read your portfolio items
- write:portfolio: Manage your portfolio items
- manage:groups: Manage groups you own or co-manage
- manage:events: Create and manage events in your groups
- manage:checkins: Manage checkin codes and view attendees
- manage:badges: Create, award, and manage group badges
- admin: Full admin access

## Endpoint Categories

### User (scope: read:user, user)
- GET /v1/me - Basic identity
- GET /v1/profile - Full profile
- PATCH /v1/profile - Update profile
- GET /v1/profile/email - Email address
- GET /v1/profile/entitlements - Active entitlements
- GET /v1/profile/achievements - Achievement progress
- GET /v1/me/linked-accounts - Connected OAuth providers

### Portfolio (scope: read:portfolio, write:portfolio)
- GET /v1/profile/portfolio - List portfolio items
- POST /v1/profile/portfolio - Create portfolio item
- PATCH /v1/profile/portfolio/:id - Update portfolio item
- DELETE /v1/profile/portfolio/:id - Delete portfolio item

### Tokens (scope: user)
- GET /v1/profile/tokens - List PATs
- POST /v1/profile/tokens - Create PAT
- DELETE /v1/profile/tokens/:id - Revoke PAT

### Events (scope: read:events, write:events)
- GET /v1/events - List upcoming events
- GET /v1/events/:id - Event details
- GET /v1/events/:eventId/rsvp - Your RSVP status
- GET /v1/events/:eventId/rsvp-summary - RSVP counts
- POST /v1/events/:eventId/rsvp - RSVP to event
- DELETE /v1/events/:eventId/rsvp - Cancel RSVP
- POST /v1/checkin/:code - Check in to event

### Groups (scope: read:groups, read:favorites, write:favorites)
- GET /v1/groups - List groups
- GET /v1/groups/:slug - Group details
- GET /v1/favorites - Favorite groups
- POST /v1/favorites/:groupSlug - Add favorite
- DELETE /v1/favorites/:groupSlug - Remove favorite

### Follows (scope: user)
- POST /v1/users/:username/follow - Follow user
- DELETE /v1/users/:username/follow - Unfollow user
- GET /v1/users/:username/followers - List followers
- GET /v1/users/:username/following - List following

### Claims
- GET /v1/claim/:code - Claim link info (no auth)
- POST /v1/claim/:code - Claim badge (scope: read:user)

### Scopes Discovery
- GET /v1/scopes - List available scopes (no auth)

### Management (scope: manage:groups, manage:events, manage:badges, manage:checkins)
- GET /v1/manage/groups - List managed groups
- PUT /v1/manage/groups/:groupId - Update group
- GET /v1/manage/groups/:groupId/members - List members
- POST /v1/manage/groups/:groupId/events - Create event
- POST /v1/manage/groups/:groupId/badges - Create badge
- POST /v1/manage/groups/:groupId/badges/:badgeId/award/:userId - Award badge

### Admin (scope: admin)
- GET /v1/admin/users - List users
- GET /v1/admin/groups - List groups
- GET /v1/admin/events - List events

## Response Format
Success: { "data": { ... } }
List: { "data": [...], "pagination": { "total", "limit", "offset", "hasMore" } }
Action: { "data": { "success": true } }
Error: { "error": "message", "code": "machine_code" }
`;
  return c.text(text, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
});

// The defaultHandler object wraps our Hono app
const defaultHandler = {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return app.fetch(request, env as Env, ctx);
  },
};

// Tampa.dev OAuth scopes (includes both new and legacy scopes for backwards compat)
const SCOPES_SUPPORTED = [
  // New GitHub-style scopes
  'user',
  'read:user',
  'user:email',
  'read:events',
  'write:events',
  'read:groups',
  'read:favorites',
  'write:favorites',
  'read:portfolio',
  'write:portfolio',
  'manage:groups',
  'manage:events',
  'manage:checkins',
  'manage:badges',
  'admin',
  // Standard OAuth scope for refresh token issuance (required by clients like ChatGPT)
  'offline_access',
  // OIDC standard aliases (resolved via LEGACY_SCOPE_ALIASES in scopes.ts)
  'profile',
  'email',
  // Legacy scopes (kept for backwards compatibility with existing OAuth tokens)
  'events:read',
  'groups:read',
  'rsvp:read',
  'rsvp:write',
  'favorites:read',
  'favorites:write',
];

// Create the OAuthProvider instance
// The OAuthProvider handles OAuth protocol endpoints (/oauth/token, /oauth/register)
// and validates Bearer tokens on apiRoute (/v1/). PATs are resolved via
// resolveExternalToken so they aren't rejected before reaching the Hono app.
const oauthProvider = new OAuthProvider({
  // /v1/ routes require valid Bearer tokens. OAuth tokens are validated
  // internally by the provider; PATs are validated via resolveExternalToken.
  // After validation, the request reaches the Hono app where getCurrentUser()
  // performs the canonical tri-auth resolution in route handlers.
  apiRoute: '/v1/',
  apiHandler: defaultHandler,

  // All other requests also go to the Hono app
  defaultHandler,

  // Resolve PAT tokens (td_pat_...) on /v1/ routes. Without this, the
  // OAuthProvider rejects PATs with 401 before they reach getCurrentUser().
  resolveExternalToken,

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

// One-time warning flag for missing ENCRYPTION_KEY (per cold start)
let encryptionKeyWarningLogged = false;

// Export combined worker with fetch (OAuth), scheduled, and queue handlers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Warn once per cold start if ENCRYPTION_KEY is missing in non-dev environments
    if (!encryptionKeyWarningLogged && !env.ENCRYPTION_KEY && env.ENVIRONMENT !== 'development') {
      console.warn('[SECURITY] ENCRYPTION_KEY is not set. OAuth tokens and webhook secrets will be stored in plaintext. Set ENCRYPTION_KEY via wrangler secret put.');
      encryptionKeyWarningLogged = true;
    }

    // WebSocket upgrades bypass OAuthProvider (which can't handle 101 responses)
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return app.fetch(request, env, ctx);
    }

    const processedRequest = stripLegacyApiPrefix(request);

    // Rate limit dynamic client registration (DCR) before OAuthProvider handles it.
    // OAuthProvider intercepts /oauth/register before the Hono app, so rate
    // limiting must happen here at the worker entry point.
    if (processedRequest.method === 'POST') {
      const reqUrl = new URL(processedRequest.url);
      if (reqUrl.pathname === '/oauth/register' && env.kv) {
        const ip =
          processedRequest.headers.get('CF-Connecting-IP') ||
          processedRequest.headers.get('X-Forwarded-For') ||
          'unknown';
        const key = `rate:${ip}:oauth-register`;

        try {
          const current = await env.kv.get(key);
          const count = current ? parseInt(current, 10) : 0;

          if (count >= 10) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '3600',
              },
            });
          }

          await env.kv.put(key, String(count + 1), { expirationTtl: 3600 });
        } catch {
          // If KV operations fail, allow the request through
        }
      }
    }

    const response = await oauthProvider.fetch(processedRequest, env, ctx);

    // Track successful DCR registrations in D1 for lifecycle management.
    // OAuthProvider handles /oauth/register internally, so we intercept the
    // response to record the client for automated cleanup of unused registrations.
    if (processedRequest.method === 'POST' && response.status === 201) {
      const reqUrl = new URL(processedRequest.url);
      if (reqUrl.pathname === '/oauth/register') {
        const cloned = response.clone();
        ctx.waitUntil((async () => {
          try {
            const body = await cloned.json() as { client_id?: string; client_name?: string };
            if (body.client_id) {
              const db = createDatabase(env.DB);
              await db.insert(oauthClientRegistry).values({
                clientId: body.client_id,
                source: 'dcr',
                clientName: body.client_name || null,
                registeredAt: new Date().toISOString(),
              }).onConflictDoNothing();
            }
          } catch (e) {
            console.error('Failed to track DCR client registration:', e);
          }
        })());
      }
    }

    return response;
  },
  scheduled: handleScheduled,
  queue: handleQueueBatch,
};
