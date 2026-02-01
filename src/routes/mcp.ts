/**
 * MCP Route Handler
 *
 * OpenAPI-documented route for the Model Context Protocol endpoint at /mcp.
 * Authenticates requests via getCurrentUser() (tri-auth) and dispatches
 * to the MCP server for JSON-RPC processing.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env } from '../../types/worker.js';
import { getCurrentUser } from '../lib/auth.js';
import { handleMcpRequest } from '../mcp/server.js';

// Import all tool definitions to register them with the registry
import '../mcp/tools/events.js';
import '../mcp/tools/groups.js';
import '../mcp/tools/favorites.js';
import '../mcp/tools/profile.js';
import '../mcp/tools/portfolio.js';
import '../mcp/tools/badges.js';
import '../mcp/tools/leaderboard.js';
import '../mcp/tools/onboarding.js';
import '../mcp/tools/tokens.js';
import '../mcp/tools/manage-groups.js';
import '../mcp/tools/manage-events.js';
import '../mcp/tools/manage-checkins.js';
import '../mcp/tools/manage-badges.js';
import '../mcp/tools/admin.js';
import '../mcp/resources.js';
import '../mcp/prompts.js';

// ── JSON-RPC 2.0 Schemas (registered as named OpenAPI components for documentation) ──
// NOTE: The MCP server handles its own JSON-RPC parsing and validation with
// protocol-specific error codes, so the request body uses z.any() to bypass
// Zod validation. These schemas exist for OpenAPI spec documentation only.

z.object({
  jsonrpc: z.literal('2.0').openapi({ description: 'JSON-RPC protocol version' }),
  id: z.union([z.string(), z.number()]).optional().openapi({ description: 'Request identifier (omit for notifications)' }),
  method: z.string().openapi({
    description: 'MCP method to invoke. Supported methods: `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `resources/templates/list`, `prompts/list`, `prompts/get`, `ping`',
    example: 'tools/list',
  }),
  params: z.record(z.unknown()).optional().openapi({ description: 'Method-specific parameters' }),
}).openapi('JsonRpcRequest');

z.object({
  code: z.number().openapi({ description: 'JSON-RPC error code (-32700 Parse Error, -32600 Invalid Request, -32601 Method Not Found, -32602 Invalid Params, -32603 Internal Error)' }),
  message: z.string().openapi({ description: 'Human-readable error message' }),
  data: z.unknown().optional().openapi({ description: 'Additional error data' }),
}).openapi('JsonRpcError');

z.object({
  jsonrpc: z.literal('2.0').openapi({ description: 'JSON-RPC protocol version' }),
  id: z.union([z.string(), z.number(), z.null()]).openapi({ description: 'Matches the request id' }),
  result: z.unknown().optional().openapi({ description: 'Method result (present on success)' }),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }).optional().openapi({ description: 'Error object (present on failure)' }),
}).openapi('JsonRpcResponse');

const McpErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
}).openapi('McpError');

// ── Route Definitions ──

const mcpPostRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'MCP JSON-RPC endpoint',
  description:
    'Model Context Protocol (MCP) endpoint using Streamable HTTP transport (spec version `2025-03-26`). ' +
    'Accepts JSON-RPC 2.0 requests for MCP protocol methods. Supports batch requests (up to 10). ' +
    'Notifications (requests without `id`) return 204 No Content.\n\n' +
    '**Supported methods:**\n' +
    '- `initialize` — Capability negotiation and protocol version exchange\n' +
    '- `tools/list` — List available tools (filtered by token scopes)\n' +
    '- `tools/call` — Execute a tool with validated arguments\n' +
    '- `resources/list` — List available resources\n' +
    '- `resources/read` — Read a resource by URI\n' +
    '- `resources/templates/list` — List URI templates for parameterized resources\n' +
    '- `prompts/list` — List available prompt templates\n' +
    '- `prompts/get` — Get a prompt template with arguments\n' +
    '- `ping` — Health check\n\n' +
    '**Headers:** Include `Mcp-Session-Id` to maintain session context (echoed back in response).',
  tags: ['MCP'],
  security: [{ BearerToken: [] }],
  // NOTE: request.body is intentionally omitted. The MCP server reads raw text
  // and handles its own JSON-RPC 2.0 parsing, returning protocol-compliant error
  // codes (e.g., -32700 Parse Error). Adding Zod body validation would intercept
  // malformed requests before the handler. See JsonRpcRequest schema for the format.
  responses: {
    200: {
      description: 'JSON-RPC 2.0 response (single `JsonRpcResponse` object or batch array). Per JSON-RPC 2.0, errors also return 200 with an `error` field.',
      content: {
        'application/json': {
          schema: z.any().openapi({ description: 'JSON-RPC 2.0 response — see JsonRpcResponse schema' }),
        },
      },
    },
    204: {
      description: 'No Content — notification processed (no response body)',
    },
    400: {
      description: 'Bad Request — invalid Content-Type',
      content: {
        'application/json': {
          schema: McpErrorSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized — missing or invalid authentication',
      content: {
        'application/json': {
          schema: McpErrorSchema,
        },
      },
    },
  },
});

const mcpGetRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'MCP SSE endpoint (not supported)',
  description:
    'Server-Sent Events endpoint for server-initiated messages. ' +
    'Not implemented — use `POST /mcp` for all MCP communication.',
  tags: ['MCP'],
  responses: {
    400: {
      description: 'Bad Request — SSE not supported',
      content: {
        'application/json': {
          schema: McpErrorSchema,
        },
      },
    },
  },
});

const mcpDeleteRoute = createRoute({
  method: 'delete',
  path: '/',
  summary: 'MCP session termination',
  description:
    'Terminates an MCP session. Sessions are stateless on the server side, so this is a no-op that always returns 204.',
  tags: ['MCP'],
  security: [{ BearerToken: [] }],
  responses: {
    204: {
      description: 'No Content — session terminated',
    },
  },
});

// ── Route Handlers ──

export function createMcpRoutes() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  app.openapi(mcpPostRoute, async (c: any) => {
    // Authenticate
    const auth = await getCurrentUser(c);
    if (!auth) {
      return c.json(
        { error: 'Unauthorized', code: 'unauthorized' },
        401,
      );
    }

    // Validate content type
    const contentType = c.req.header('Content-Type');
    if (!contentType?.includes('application/json')) {
      return c.json(
        { error: 'Content-Type must be application/json', code: 'bad_request' },
        400,
      );
    }

    // Read body
    const body = await c.req.text();

    // Process MCP request
    const response = await handleMcpRequest(body, auth, c.env, c.executionCtx);

    // Notifications return null (no response needed)
    if (response === null) {
      return c.body(null, 204);
    }

    // Return JSON-RPC response(s)
    // Echo session ID if provided
    const sessionId = c.req.header('Mcp-Session-Id');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }

    return c.json(response, 200, headers);
  });

  app.openapi(mcpGetRoute, async (c: any) => {
    return c.json({ error: 'SSE not supported. Use POST for MCP requests.', code: 'bad_request' }, 400);
  });

  // NOTE: DELETE is a no-op because sessions are stateless on the server side.
  // If server-side session state is ever added, this handler must authenticate
  // via getCurrentUser() and invalidate the session before returning 204.
  app.openapi(mcpDeleteRoute, async (c: any) => {
    return c.body(null, 204);
  });

  return app;
}

export const mcpRoutes = createMcpRoutes();
