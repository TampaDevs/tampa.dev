/**
 * MCP Route Handler
 *
 * Hono route for the Model Context Protocol endpoint at POST /mcp.
 * Authenticates requests via getCurrentUser() (tri-auth) and dispatches
 * to the MCP server for JSON-RPC processing.
 */

import { Hono } from 'hono';
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

export function createMcpRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * POST /mcp -- MCP Streamable HTTP endpoint
   *
   * Accepts JSON-RPC 2.0 requests for MCP protocol methods:
   * - initialize: Capability negotiation
   * - tools/list: List available tools (filtered by token scopes)
   * - tools/call: Execute a tool
   * - resources/list: List available resources
   * - resources/read: Read a resource
   * - prompts/list: List available prompts
   * - prompts/get: Get a prompt template
   * - ping: Health check
   */
  app.post('/', async (c) => {
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

  /**
   * GET /mcp -- SSE endpoint for server-initiated messages
   *
   * Not implemented in initial version. MCP clients that need
   * server-initiated messages should poll tools/list for changes.
   */
  app.get('/', async (c) => {
    return c.json({ error: 'SSE not supported. Use POST for MCP requests.', code: 'bad_request' }, 400);
  });

  /**
   * DELETE /mcp -- Session termination
   *
   * Sessions are stateless on the server side, so this is a no-op.
   */
  app.delete('/', async (c) => {
    return c.body(null, 204);
  });

  return app;
}

export const mcpRoutes = createMcpRoutes();
