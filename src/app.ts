import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  kv: KVNamespace;
}

/**
 * Create and configure the Hono application
 */
export function createApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  // Add CORS middleware
  app.use('*', async (c, next) => {
    await next();
    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  });

  // Handle OPTIONS requests
  app.options('*', (c) => c.text('', 200));

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
      title: 'Tampa Events API',
      version: '2026-01-25',
      description: 'Community events aggregation API for Tampa Bay tech meetups and events',
      contact: {
        name: 'Tampa Devs',
        url: 'https://tampa.dev',
      },
    },
    servers: [
      {
        url: 'https://events.api.tampa.dev',
        description: 'Production',
      },
      {
        url: 'http://localhost:8787',
        description: 'Development',
      },
    ],
  });

  // Swagger UI
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));
}
