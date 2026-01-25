import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { SchemaController } from '../controllers/SchemaController.js';

/**
 * Schema list response
 */
const SchemaListResponseSchema = z.object({
  schemas: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      description: z.string(),
      url: z.string(),
    })
  ),
  version: z.string(),
});

/**
 * GET /2026-01-25/schemas - List all available schemas
 */
const listSchemasRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/schemas',
  summary: 'List all JSON schemas',
  description: 'Returns metadata about all available JSON schemas for the API models',
  tags: ['Schemas'],
  responses: {
    200: {
      description: 'List of available schemas',
      content: {
        'application/json': {
          schema: SchemaListResponseSchema,
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/schemas/{name} - Get specific schema
 */
const getSchemaRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/schemas/{name}',
  summary: 'Get specific JSON schema',
  description: 'Returns the JSON Schema for a specific model type',
  tags: ['Schemas'],
  request: {
    params: z.object({
      name: z.string().openapi({
        param: {
          name: 'name',
          in: 'path',
        },
        description: 'Schema name (event, group, venue, photo, meetup)',
        example: 'event',
      }),
    }),
  },
  responses: {
    200: {
      description: 'JSON Schema',
      content: {
        'application/schema+json': {
          schema: z.any(),
        },
      },
    },
    404: {
      description: 'Schema not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            available: z.array(z.string()),
          }),
        },
      },
    },
  },
});

/**
 * Register schema routes with the app
 */
export function registerSchemaRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // GET /2026-01-25/schemas
  app.openapi(listSchemasRoute, async (c) => {
    const schemaList = SchemaController.getAllSchemas();

    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=86400');

    return c.json({
      schemas: schemaList,
      version: '2026-01-25',
    }, 200);
  });

  // GET /2026-01-25/schemas/{name}
  app.openapi(getSchemaRoute, async (c) => {
    const { name } = c.req.valid('param');
    const schema = SchemaController.getSchemaByName(name);

    if (!schema) {
      const availableSchemas = SchemaController.getSchemaNames();
      return c.json(
        {
          error: 'Schema not found',
          available: availableSchemas,
        },
        404
      );
    }

    c.header('Content-Type', 'application/schema+json');
    c.header('Cache-Control', 'public, max-age=86400');

    return c.json(schema, 200);
  });
}
