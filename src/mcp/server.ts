/**
 * MCP Server
 *
 * JSON-RPC 2.0 dispatcher for the Model Context Protocol.
 * Handles initialize, tools/list, tools/call, resources/list,
 * resources/read, prompts/list, prompts/get, and ping.
 */

import type { AuthResult } from '../lib/auth.js';
import { hasScope, type Scope } from '../lib/scopes.js';
import {
  getAvailableTools,
  getAvailableResources,
  getAvailableResourceTemplates,
  getAvailablePrompts,
  getTool,
  getResource,
  matchResourceTemplate,
  getPrompt,
} from './registry.js';
import {
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcError,
  type ToolCallParams,
  type ToolContext,
  type ToolResult,
  JSON_RPC_ERRORS,
  MCP_PROTOCOL_VERSION,
} from './types.js';
import type { Env } from '../../types/worker.js';

// ── Configuration ──

const MAX_REQUEST_BODY_SIZE = 1_048_576; // 1MB
const MAX_BATCH_SIZE = 10;

const SERVER_INFO = {
  name: 'Tampa.dev',
  version: '1.0.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
  resources: { subscribe: false, listChanged: false },
  prompts: { listChanged: false },
};

// ── JSON-RPC Helpers ──

function jsonRpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? 0, result };
}

function jsonRpcError(id: string | number | null, error: JsonRpcError): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? 0, error };
}

// ── Request Validation ──

/**
 * Validate a JSON-RPC 2.0 request structure.
 * Returns an error response if invalid, null if valid.
 */
function validateRequest(msg: unknown): JsonRpcError | null {
  if (typeof msg !== 'object' || msg === null) {
    return { code: JSON_RPC_ERRORS.INVALID_REQUEST, message: 'Invalid Request: not an object' };
  }
  const req = msg as Record<string, unknown>;
  if (req.jsonrpc !== '2.0') {
    return { code: JSON_RPC_ERRORS.INVALID_REQUEST, message: 'Invalid Request: jsonrpc must be "2.0"' };
  }
  if (typeof req.method !== 'string') {
    return { code: JSON_RPC_ERRORS.INVALID_REQUEST, message: 'Invalid Request: method must be a string' };
  }
  return null;
}

// ── Method Dispatch ──

/**
 * Handle a single JSON-RPC request and return a response.
 * Notifications (no id) are processed but return no response.
 */
async function handleRequest(
  req: JsonRpcRequest,
  auth: AuthResult,
  env: Env,
  executionCtx: ExecutionContext,
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;
  const ctx: ToolContext = { auth, env, executionCtx };

  // Notifications (no id) - process silently
  if (req.id === undefined) {
    // notifications/initialized is the only notification we expect
    return null;
  }

  switch (req.method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      });

    case 'ping':
      return jsonRpcResult(id, {});

    case 'tools/list':
      return jsonRpcResult(id, {
        tools: getAvailableTools(auth),
      });

    case 'tools/call':
      return handleToolCall(id, req.params as ToolCallParams, auth, ctx);

    case 'resources/list':
      return jsonRpcResult(id, {
        resources: getAvailableResources(auth),
      });

    case 'resources/templates/list':
      return jsonRpcResult(id, {
        resourceTemplates: getAvailableResourceTemplates(auth),
      });

    case 'resources/read':
      return handleResourceRead(id, req.params as { uri: string }, auth, ctx);

    case 'prompts/list':
      return jsonRpcResult(id, {
        prompts: getAvailablePrompts(),
      });

    case 'prompts/get':
      return handlePromptGet(id, req.params as { name: string; arguments?: Record<string, string> }, ctx);

    default:
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        message: `Method not found: ${req.method}`,
      });
  }
}

// ── tools/call Handler ──

async function handleToolCall(
  id: string | number | null,
  params: ToolCallParams,
  auth: AuthResult,
  ctx: ToolContext,
): Promise<JsonRpcResponse> {
  if (!params?.name) {
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INVALID_PARAMS,
      message: 'Missing required parameter: name',
    });
  }

  const tool = getTool(params.name);
  if (!tool) {
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INVALID_PARAMS,
      message: `Unknown tool: ${params.name}`,
    });
  }

  // Check scope
  if (tool.scope !== null) {
    if (auth.scopes !== null && !hasScope(auth.scopes, tool.scope as Scope)) {
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: `Error: This tool requires the '${tool.scope}' scope` }],
        isError: true,
      });
    }
  }

  // Validate input against Zod schema
  const parseResult = tool.inputSchema.safeParse(params.arguments ?? {});
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return jsonRpcResult(id, {
      content: [{ type: 'text', text: `Validation error: ${errors}` }],
      isError: true,
    });
  }

  // Execute tool handler
  try {
    const result = await tool.handler(parseResult.data, ctx);
    return jsonRpcResult(id, result);
  } catch (error) {
    console.error(`MCP tool error [${params.name}]:`, error instanceof Error ? error.message : error);
    return jsonRpcResult(id, {
      content: [{ type: 'text', text: 'Internal server error' }],
      isError: true,
    });
  }
}

// ── resources/read Handler ──

async function handleResourceRead(
  id: string | number | null,
  params: { uri: string },
  auth: AuthResult,
  ctx: ToolContext,
): Promise<JsonRpcResponse> {
  if (!params?.uri) {
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INVALID_PARAMS,
      message: 'Missing required parameter: uri',
    });
  }

  // Try exact match first
  const resource = getResource(params.uri);
  if (resource) {
    if (resource.scope !== null && auth.scopes !== null && !hasScope(auth.scopes, resource.scope as Scope)) {
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: `Insufficient scope for resource: ${params.uri}`,
      });
    }
    try {
      const content = await resource.handler(params.uri, ctx);
      return jsonRpcResult(id, { contents: [content] });
    } catch (error) {
      console.error(`MCP resource error [${params.uri}]:`, error instanceof Error ? error.message : error);
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message: 'Failed to read resource',
      });
    }
  }

  // Try template match
  const match = matchResourceTemplate(params.uri);
  if (match) {
    if (match.template.scope !== null && auth.scopes !== null && !hasScope(auth.scopes, match.template.scope as Scope)) {
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: `Insufficient scope for resource: ${params.uri}`,
      });
    }
    try {
      const content = await match.template.handler(params.uri, match.params, ctx);
      return jsonRpcResult(id, { contents: [content] });
    } catch (error) {
      console.error(`MCP resource error [${params.uri}]:`, error instanceof Error ? error.message : error);
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message: 'Failed to read resource',
      });
    }
  }

  return jsonRpcError(id, {
    code: JSON_RPC_ERRORS.INVALID_PARAMS,
    message: `Resource not found: ${params.uri}`,
  });
}

// ── prompts/get Handler ──

async function handlePromptGet(
  id: string | number | null,
  params: { name: string; arguments?: Record<string, string> },
  ctx: ToolContext,
): Promise<JsonRpcResponse> {
  if (!params?.name) {
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INVALID_PARAMS,
      message: 'Missing required parameter: name',
    });
  }

  const prompt = getPrompt(params.name);
  if (!prompt) {
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INVALID_PARAMS,
      message: `Unknown prompt: ${params.name}`,
    });
  }

  // Validate required arguments
  for (const arg of prompt.arguments) {
    if (arg.required && (!params.arguments || !params.arguments[arg.name])) {
      return jsonRpcError(id, {
        code: JSON_RPC_ERRORS.INVALID_PARAMS,
        message: `Missing required argument: ${arg.name}`,
      });
    }
  }

  try {
    const messages = await prompt.handler(params.arguments ?? {}, ctx);
    return jsonRpcResult(id, {
      description: prompt.description,
      messages,
    });
  } catch (error) {
    console.error(`MCP prompt error [${params.name}]:`, error instanceof Error ? error.message : error);
    return jsonRpcError(id, {
      code: JSON_RPC_ERRORS.INTERNAL_ERROR,
      message: 'Failed to generate prompt',
    });
  }
}

// ── Public API ──

/**
 * Process a raw HTTP request body as an MCP JSON-RPC message.
 * Supports both single requests and batches (up to MAX_BATCH_SIZE).
 *
 * Returns a JSON response body (object or array) or null for notifications.
 */
export async function handleMcpRequest(
  body: string,
  auth: AuthResult,
  env: Env,
  executionCtx: ExecutionContext,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  // Size check
  if (body.length > MAX_REQUEST_BODY_SIZE) {
    return jsonRpcError(null, {
      code: JSON_RPC_ERRORS.INVALID_REQUEST,
      message: 'Request body too large (max 1MB)',
    });
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonRpcError(null, {
      code: JSON_RPC_ERRORS.PARSE_ERROR,
      message: 'Parse error: invalid JSON',
    });
  }

  // Handle batch requests
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return jsonRpcError(null, {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: 'Invalid Request: empty batch',
      });
    }
    if (parsed.length > MAX_BATCH_SIZE) {
      return jsonRpcError(null, {
        code: JSON_RPC_ERRORS.INVALID_REQUEST,
        message: `Batch too large (max ${MAX_BATCH_SIZE} requests)`,
      });
    }

    const responses: JsonRpcResponse[] = [];
    for (const msg of parsed) {
      const validationError = validateRequest(msg);
      if (validationError) {
        responses.push(jsonRpcError((msg as Record<string, unknown>)?.id as string | number ?? null, validationError));
        continue;
      }
      const response = await handleRequest(msg as JsonRpcRequest, auth, env, executionCtx);
      if (response) responses.push(response);
    }
    return responses.length > 0 ? responses : null;
  }

  // Handle single request
  const validationError = validateRequest(parsed);
  if (validationError) {
    return jsonRpcError((parsed as Record<string, unknown>)?.id as string | number ?? null, validationError);
  }

  return handleRequest(parsed as JsonRpcRequest, auth, env, executionCtx);
}
