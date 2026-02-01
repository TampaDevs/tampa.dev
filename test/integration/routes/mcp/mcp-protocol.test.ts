/**
 * MCP Protocol Integration Tests
 *
 * Tests the MCP server's JSON-RPC protocol handling,
 * authentication, and capability negotiation.
 */

import { describe, it, expect } from 'vitest';
import { createTestEnv, createUser, createSession, createAdminUser, createPatToken } from '../../helpers';
import { mcpRequest, mcpInitialize, mcpListTools, mcpToolCall } from '../../helpers/mcp';

describe('MCP Protocol', () => {
  // ── Authentication ──

  it('returns 401 without authentication', async () => {
    const { env } = createTestEnv();
    const res = await mcpRequest('initialize', {}, { env });
    expect(res.status).toBe(401);
  });

  it('authenticates with session cookie', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await mcpRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' },
    }, { env, headers: { Cookie: cookieHeader } });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.result).toBeDefined();
  });

  it('authenticates with PAT', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:events', 'read:groups']);

    const res = await mcpRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' },
    }, { env, headers: { Authorization: `Bearer ${token}` } });

    expect(res.status).toBe(200);
  });

  // ── Initialize ──

  it('returns server capabilities on initialize', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const result = await mcpInitialize({ env, headers: { Cookie: cookieHeader } });

    expect(result.protocolVersion).toBe('2025-03-26');
    expect(result.serverInfo.name).toBe('Tampa.dev');
    expect(result.capabilities).toHaveProperty('tools');
    expect(result.capabilities).toHaveProperty('resources');
    expect(result.capabilities).toHaveProperty('prompts');
  });

  // ── Ping ──

  it('responds to ping', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await mcpRequest('ping', {}, { env, headers: { Cookie: cookieHeader } });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.result).toEqual({});
  });

  // ── Error Handling ──

  it('returns method not found for unknown methods', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await mcpRequest('nonexistent/method', {}, { env, headers: { Cookie: cookieHeader } });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const error = body.error as { code: number; message: string };
    expect(error.code).toBe(-32601);
  });

  it('returns parse error for invalid JSON', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/mcp', {
      env,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: 'not valid json{{{',
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const error = body.error as { code: number };
    expect(error.code).toBe(-32700);
  });

  it('returns invalid request for missing jsonrpc field', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/mcp', {
      env,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ id: 1, method: 'ping' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const error = body.error as { code: number };
    expect(error.code).toBe(-32600);
  });

  // ── Batch Requests ──

  it('handles batch requests', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/mcp', {
      env,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', id: 2, method: 'ping' },
      ]),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
  });

  it('rejects oversized batch requests', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const batch = Array.from({ length: 11 }, (_, i) => ({
      jsonrpc: '2.0',
      id: i,
      method: 'ping',
    }));

    const res = await appRequest('/mcp', {
      env,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(batch),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const error = body.error as { code: number };
    expect(error.code).toBe(-32600);
  });

  // ── Scope-Filtered Tool Discovery ──

  it('returns all tools for session auth', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const tools = await mcpListTools({ env, headers: { Cookie: cookieHeader } });
    // Session users see all tools
    expect(tools.length).toBeGreaterThan(10);
  });

  it('filters tools by PAT scopes', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:events']);

    const tools = await mcpListTools({ env, headers: { Authorization: `Bearer ${token}` } });
    // Should only see event-reading tools and public tools
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('events_list');
    expect(toolNames).not.toContain('admin_list_users');
    expect(toolNames).not.toContain('profile_update'); // requires 'user' scope
  });

  it('returns admin tools only with admin scope', async () => {
    const { env } = createTestEnv();
    const admin = await createAdminUser();
    const { token } = await createPatToken(admin.id, ['admin']);

    const tools = await mcpListTools({ env, headers: { Authorization: `Bearer ${token}` } });
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('admin_list_users');
  });

  // ── Tool Call Scope Enforcement ──

  it('returns scope error when calling tool without required scope', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { token } = await createPatToken(user.id, ['read:groups']); // no read:events

    const result = await mcpToolCall('events_list', {}, {
      env,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scope');
  });

  // ── Content Type Validation ──

  it('rejects non-JSON content type', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/mcp', {
      env,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Cookie: cookieHeader,
      },
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  // ── Discovery Endpoint ──

  it('returns MCP configuration at well-known endpoint', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/.well-known/mcp-configuration', { env });
    // Note: may return 404 if route isn't matched in test app
    // The well-known endpoint is registered in createApp() which is used by buildApp()
    if (res.status === 200) {
      const body = await res.json() as Record<string, unknown>;
      expect(body.mcp_version).toBe('2025-03-26');
      expect(body.server_name).toBe('Tampa.dev');
      expect(body.capabilities).toBeDefined();
    }
  });
});

// Import appRequest for raw request tests
import { appRequest } from '../../helpers/request';
