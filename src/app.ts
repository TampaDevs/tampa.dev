import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { SCOPES } from './lib/scopes.js';
import { getCanonicalIssuer } from './lib/oidc.js';

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  kv: KVNamespace;
  CF_VERSION_METADATA: {
    id: string;
    tag: string;
    timestamp: string;
  };
  // Secrets for event aggregation (set via `wrangler secret put`)
  MEETUP_CLIENT_KEY?: string;
  MEETUP_SIGNING_KEY?: string;
  MEETUP_MEMBER_ID?: string;
}

/**
 * Create and configure the Hono application
 */
export function createApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  // Security headers
  app.use('*', async (c, next) => {
    await next();
    if (c.res.status === 101) return; // Skip WebSocket upgrades
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Widget embeds must be frameable; all other routes deny framing
    if (c.req.path.startsWith('/widget/')) {
      c.res.headers.delete('X-Frame-Options');
    } else {
      c.res.headers.set('X-Frame-Options', 'DENY');
    }
  });

  // Add CORS middleware
  app.use('*', async (c, next) => {
    await next();

    // WebSocket upgrade responses (101) have immutable headers in CF Workers
    if (c.res.status === 101) return;

    const origin = c.req.header('Origin');
    // Allow requests from *.tampa.dev subdomains and localhost for development
    if (origin && (/^https?:\/\/([a-z0-9-]+\.)*tampa\.dev$/.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      c.res.headers.set('Access-Control-Allow-Origin', '*');
    }
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  });

  // Handle OPTIONS requests
  app.options('*', (c) => c.body(null, 204));

  // Favicon handler
  app.get('/favicon.ico', (c) => c.text('', 404));

  // OpenID Connect Discovery (fallback for clients that check openid-configuration
  // instead of RFC 8414 oauth-authorization-server served by OAuthProvider)
  app.get('/.well-known/openid-configuration', (c) => {
    // Use canonical issuer: tampa.dev in production, staging.tampa.dev in staging,
    // request origin for localhost. All OIDC endpoints are mounted on tampa.dev
    // via wrangler.toml routes, so URLs must be consistent regardless of which
    // hostname the worker receives the request on.
    const base = getCanonicalIssuer(c.req.url);

    return c.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      userinfo_endpoint: `${base}/oauth/userinfo`,
      jwks_uri: `${base}/.well-known/jwks.json`,
      registration_endpoint: `${base}/oauth/register`,

      scopes_supported: [
        'openid',                 // OIDC protocol flag (NOT in SCOPES object -- no duplication)
        ...Object.keys(SCOPES),   // All data scopes from scopes.ts
        'offline_access',         // Refresh token hint
        // OIDC standard aliases (resolved via LEGACY_SCOPE_ALIASES in scopes.ts)
        'profile',
        'email',
      ],

      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],

      id_token_signing_alg_values_supported: ['RS256'],
      subject_types_supported: ['public'],

      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'auth_time',
        'nonce',
        'at_hash',
        'name',
        'preferred_username',
        'picture',
        'profile',
        'email',
        'email_verified',
        'updated_at',
        'https://tampa.dev/entitlements',
      ],

      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    }, 200, { 'Cache-Control': 'public, max-age=3600' });
  });

  // JWKS endpoint for id_token verification
  app.get('/.well-known/jwks.json', async (c) => {
    if (!c.env.OIDC_PUBLIC_JWK) {
      return c.json({ keys: [] }, 200, { 'Cache-Control': 'public, max-age=3600' });
    }

    try {
      const parsed = JSON.parse(c.env.OIDC_PUBLIC_JWK);

      // Support both formats:
      //   Single JWK:  {"kty":"RSA","kid":"...","n":"...","e":"AQAB",...}
      //   Full JWKS:   {"keys":[{"kty":"RSA",...},{"kty":"RSA",...}]}
      // The full JWKS format is used during key rotation to serve both old and new keys.
      const jwks = Array.isArray(parsed.keys) ? parsed : { keys: [parsed] };

      return c.json(jwks, 200, { 'Cache-Control': 'public, max-age=86400' });
    } catch {
      return c.json({ keys: [] }, 200, { 'Cache-Control': 'public, max-age=3600' });
    }
  });

  // MCP Server Discovery (RFC well-known endpoint)
  app.get('/.well-known/mcp-configuration', (c) => {
    return c.json({
      mcp_version: '2025-03-26',
      server_name: 'Tampa.dev',
      server_description: 'Tampa Bay tech community platform - events, groups, badges, and more',
      server_url: 'https://api.tampa.dev/mcp',
      transport: 'streamable-http',
      authentication: {
        type: 'oauth2',
        oauth_metadata_url: 'https://api.tampa.dev/.well-known/oauth-authorization-server',
      },
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
      },
    }, 200, { 'Cache-Control': 'public, max-age=3600' });
  });

  return app;
}

/**
 * Add OpenAPI documentation routes
 */
export function addOpenAPIRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // OpenAPI spec endpoint
  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Tampa.dev Platform API',
      version: '2026-01-25',
      description:
        'The Tampa.dev Platform API provides authenticated access to community data including user profiles, events, groups, badges, and more. ' +
        'Authenticate with Personal Access Tokens (PATs) or OAuth 2.0 bearer tokens. ' +
        'All authenticated endpoints are under `/v1/`.',
      contact: {
        name: 'Tampa.dev',
        url: 'https://tampa.dev',
      },
    },
    servers: [
      {
        url: 'https://api.tampa.dev',
        description: 'Production',
      },
      {
        url: 'https://events.api.tampa.dev',
        description: 'Production (legacy)',
      },
      {
        url: 'http://localhost:8787',
        description: 'Development',
      },
    ],
    security: [{ BearerToken: [] }],
    tags: [
      { name: 'User', description: 'User identity and profile management' },
      { name: 'Events', description: 'Event discovery, RSVP, and check-in' },
      { name: 'Groups', description: 'Group discovery and favorites' },
      { name: 'Follows', description: 'User follow relationships' },
      { name: 'Claims', description: 'Badge claim links' },
      { name: 'Scopes', description: 'OAuth scope discovery' },
      { name: 'Admin', description: 'Platform administration (admin role required)' },
      { name: 'Management', description: 'Group management (group role required)' },
      { name: 'Public', description: 'Public endpoints (no authentication required)' },
      { name: 'MCP', description: 'Model Context Protocol (JSON-RPC 2.0) endpoint for AI agents and automation tools' },
    ],
  });

  // Register security scheme
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerToken', {
    type: 'http',
    scheme: 'bearer',
    description:
      'Personal Access Token (td_pat_...) or OAuth 2.0 access token. ' +
      'Create PATs at https://tampa.dev/developer. ' +
      'OAuth tokens are obtained via the /oauth/authorize flow.',
  });

  // Swagger UI
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));
}
