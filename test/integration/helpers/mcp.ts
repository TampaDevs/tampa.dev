/**
 * MCP Test Helpers
 *
 * Utilities for testing the MCP server endpoint.
 * Handles JSON-RPC request construction and response parsing.
 */

import { appRequest } from './request';
import type { Env } from '../../../types/worker';

interface McpRequestOptions {
  env: Env;
  headers?: Record<string, string>;
}

/**
 * Send a raw JSON-RPC request to the MCP endpoint.
 */
export async function mcpRequest(
  method: string,
  params: unknown,
  options: McpRequestOptions,
): Promise<Response> {
  return appRequest('/mcp', {
    env: options.env,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params: params ?? {},
    }),
  });
}

/**
 * Send an initialize request and return parsed result.
 */
export async function mcpInitialize(
  options: McpRequestOptions,
): Promise<{ protocolVersion: string; capabilities: Record<string, unknown>; serverInfo: Record<string, unknown> }> {
  const res = await mcpRequest('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  }, options);
  const body = await res.json() as Record<string, unknown>;
  return body.result as { protocolVersion: string; capabilities: Record<string, unknown>; serverInfo: Record<string, unknown> };
}

/**
 * Call an MCP tool and return the parsed result.
 */
export async function mcpToolCall(
  toolName: string,
  args: Record<string, unknown>,
  options: McpRequestOptions,
): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
  const res = await mcpRequest('tools/call', {
    name: toolName,
    arguments: args,
  }, options);
  const body = await res.json() as Record<string, unknown>;
  if (body.error) {
    throw new Error(`JSON-RPC error: ${JSON.stringify(body.error)}`);
  }
  return body.result as { content: Array<{ type: string; text?: string }>; isError?: boolean };
}

/**
 * List available MCP tools and return the parsed list.
 */
export async function mcpListTools(
  options: McpRequestOptions,
): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> {
  const res = await mcpRequest('tools/list', {}, options);
  const body = await res.json() as Record<string, unknown>;
  const result = body.result as { tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> };
  return result.tools;
}

/**
 * List available MCP resources.
 */
export async function mcpListResources(
  options: McpRequestOptions,
): Promise<Array<{ uri: string; name: string; description?: string; mimeType?: string }>> {
  const res = await mcpRequest('resources/list', {}, options);
  const body = await res.json() as Record<string, unknown>;
  const result = body.result as { resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> };
  return result.resources;
}

/**
 * Read an MCP resource.
 */
export async function mcpReadResource(
  uri: string,
  options: McpRequestOptions,
): Promise<{ contents: Array<{ uri: string; text?: string; mimeType?: string }> }> {
  const res = await mcpRequest('resources/read', { uri }, options);
  const body = await res.json() as Record<string, unknown>;
  return body.result as { contents: Array<{ uri: string; text?: string; mimeType?: string }> };
}
