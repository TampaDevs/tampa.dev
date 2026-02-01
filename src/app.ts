import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

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
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
      title: 'Tampa Devs Platform API',
      version: '2026-01-25',
      description:
        'The Tampa Devs Platform API provides authenticated access to community data including user profiles, events, groups, badges, and more. ' +
        'Authenticate with Personal Access Tokens (PATs) or OAuth 2.0 bearer tokens. ' +
        'All authenticated endpoints are under `/v1/`.',
      contact: {
        name: 'Tampa Devs',
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
