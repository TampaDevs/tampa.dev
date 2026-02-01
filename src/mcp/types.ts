/**
 * MCP Protocol Types
 *
 * Type definitions for the Model Context Protocol (MCP) JSON-RPC messages
 * and server capabilities. Based on MCP spec version 2025-03-26.
 */

import type { ZodType } from 'zod';
import type { AuthResult } from '../lib/auth.js';
import type { Env } from '../../types/worker.js';

// ── JSON-RPC 2.0 ──

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// ── MCP Protocol ──

export const MCP_PROTOCOL_VERSION = '2025-03-26';

export interface ServerInfo {
  name: string;
  version: string;
}

export interface ServerCapabilities {
  tools?: Record<string, never>;
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}

// ── Tool Types ──

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolResult {
  content: ContentBlock[];
  isError?: boolean;
}

export interface ContentBlock {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: { uri: string; text?: string; mimeType?: string };
}

// ── Resource Types ──

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// ── Prompt Types ──

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: ContentBlock;
}

// ── Registry Types ──

/**
 * Context passed to every MCP tool/resource/prompt handler.
 * Provides access to the authenticated user, environment bindings,
 * and the execution context for background tasks.
 */
export interface ToolContext {
  auth: AuthResult;
  env: Env;
  executionCtx: ExecutionContext;
}

/**
 * A registered tool in the MCP server.
 * The inputSchema is a Zod object that validates tool arguments.
 * The scope determines which tokens can access this tool.
 */
export interface RegisteredTool {
  name: string;
  description: string;
  scope: string | null; // null = public (no auth needed for tool listing, auth still needed for /mcp)
  inputSchema: ZodType;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface RegisteredResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  scope: string | null;
  handler: (uri: string, ctx: ToolContext) => Promise<ResourceContent>;
}

export interface RegisteredResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType: string;
  scope: string | null;
  handler: (uri: string, params: Record<string, string>, ctx: ToolContext) => Promise<ResourceContent>;
}

export interface RegisteredPrompt {
  name: string;
  description: string;
  arguments: PromptArgument[];
  handler: (args: Record<string, string>, ctx: ToolContext) => Promise<PromptMessage[]>;
}
