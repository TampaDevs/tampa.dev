/**
 * MCP Tool/Resource/Prompt Registry
 *
 * Central registry for all MCP capabilities. Handles:
 * - Tool, resource, and prompt registration
 * - Scope-based filtering for tools/list
 * - Zod-to-JSON Schema conversion for tool input schemas
 * - Tool lookup and input validation for tools/call
 */

import { z, type ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { hasScope, type Scope } from '../lib/scopes.js';
import type { AuthResult } from '../lib/auth.js';
import type {
  RegisteredTool,
  RegisteredResource,
  RegisteredResourceTemplate,
  RegisteredPrompt,
  ToolDefinition,
  ResourceDefinition,
  ResourceTemplate,
  PromptDefinition,
  ToolContext,
  ToolResult,
  PromptArgument,
  PromptMessage,
  ResourceContent,
} from './types.js';

// ── Tool Registry ──

const tools: Map<string, RegisteredTool> = new Map();
const resources: Map<string, RegisteredResource> = new Map();
const resourceTemplates: Map<string, RegisteredResourceTemplate> = new Map();
const prompts: Map<string, RegisteredPrompt> = new Map();

/**
 * Define and register an MCP tool.
 *
 * @example
 * defineTool({
 *   name: 'events_list',
 *   description: 'List upcoming events',
 *   scope: 'read:events',
 *   inputSchema: z.object({ limit: z.number().optional() }),
 *   handler: async (args, ctx) => ({ content: [{ type: 'text', text: '...' }] }),
 * });
 */
export function defineTool<T extends z.ZodObject<z.ZodRawShape>>(def: {
  name: string;
  description: string;
  scope: string | null;
  inputSchema: T;
  handler: (args: z.infer<T>, ctx: ToolContext) => Promise<ToolResult>;
}): RegisteredTool {
  const tool: RegisteredTool = {
    name: def.name,
    description: def.description,
    scope: def.scope,
    inputSchema: def.inputSchema,
    handler: def.handler as (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>,
  };
  tools.set(def.name, tool);
  return tool;
}

/**
 * Define and register an MCP resource.
 */
export function defineResource(def: {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  scope: string | null;
  handler: (uri: string, ctx: ToolContext) => Promise<ResourceContent>;
}): RegisteredResource {
  const resource: RegisteredResource = {
    uri: def.uri,
    name: def.name,
    description: def.description,
    mimeType: def.mimeType ?? 'application/json',
    scope: def.scope,
    handler: def.handler,
  };
  resources.set(def.uri, resource);
  return resource;
}

/**
 * Define and register an MCP resource template.
 */
export function defineResourceTemplate(def: {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType?: string;
  scope: string | null;
  handler: (uri: string, params: Record<string, string>, ctx: ToolContext) => Promise<ResourceContent>;
}): RegisteredResourceTemplate {
  const template: RegisteredResourceTemplate = {
    uriTemplate: def.uriTemplate,
    name: def.name,
    description: def.description,
    mimeType: def.mimeType ?? 'application/json',
    scope: def.scope,
    handler: def.handler,
  };
  resourceTemplates.set(def.uriTemplate, template);
  return template;
}

/**
 * Define and register an MCP prompt.
 */
export function definePrompt(def: {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  handler: (args: Record<string, string>, ctx: ToolContext) => Promise<PromptMessage[]>;
}): RegisteredPrompt {
  const prompt: RegisteredPrompt = {
    name: def.name,
    description: def.description,
    arguments: def.arguments ?? [],
    handler: def.handler,
  };
  prompts.set(def.name, prompt);
  return prompt;
}

// ── Scope-Based Filtering ──

/**
 * Check if an auth result has access to a given scope.
 * Session auth (scopes = null) has access to everything.
 * Public tools (scope = null) are accessible to everyone.
 */
function authHasScope(auth: AuthResult, scope: string | null): boolean {
  if (scope === null) return true; // Public tool
  if (auth.scopes === null) return true; // Session auth = unrestricted
  return hasScope(auth.scopes, scope as Scope);
}

/**
 * Get all tools accessible by the given auth result.
 * Filters based on token scopes.
 */
export function getAvailableTools(auth: AuthResult): ToolDefinition[] {
  const result: ToolDefinition[] = [];
  for (const tool of tools.values()) {
    if (authHasScope(auth, tool.scope)) {
      result.push({
        name: tool.name,
        description: tool.description,
        inputSchema: convertZodToJsonSchema(tool.inputSchema),
      });
    }
  }
  return result;
}

/**
 * Get all resources accessible by the given auth result.
 */
export function getAvailableResources(auth: AuthResult): ResourceDefinition[] {
  const result: ResourceDefinition[] = [];
  for (const resource of resources.values()) {
    if (authHasScope(auth, resource.scope)) {
      result.push({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      });
    }
  }
  return result;
}

/**
 * Get all resource templates accessible by the given auth result.
 */
export function getAvailableResourceTemplates(auth: AuthResult): ResourceTemplate[] {
  const result: ResourceTemplate[] = [];
  for (const template of resourceTemplates.values()) {
    if (authHasScope(auth, template.scope)) {
      result.push({
        uriTemplate: template.uriTemplate,
        name: template.name,
        description: template.description,
        mimeType: template.mimeType,
      });
    }
  }
  return result;
}

/**
 * Get all prompts.
 */
export function getAvailablePrompts(): PromptDefinition[] {
  const result: PromptDefinition[] = [];
  for (const prompt of prompts.values()) {
    result.push({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments.length > 0 ? prompt.arguments : undefined,
    });
  }
  return result;
}

// ── Tool Execution ──

/**
 * Look up a tool by name. Returns undefined if not found.
 */
export function getTool(name: string): RegisteredTool | undefined {
  return tools.get(name);
}

/**
 * Look up a resource by URI. Returns undefined if not found.
 */
export function getResource(uri: string): RegisteredResource | undefined {
  return resources.get(uri);
}

/**
 * Look up a resource template by matching URI against templates.
 * Returns the template and extracted parameters if found.
 */
export function matchResourceTemplate(uri: string): { template: RegisteredResourceTemplate; params: Record<string, string> } | undefined {
  for (const template of resourceTemplates.values()) {
    const params = matchUriTemplate(template.uriTemplate, uri);
    if (params) return { template, params };
  }
  return undefined;
}

/**
 * Look up a prompt by name. Returns undefined if not found.
 */
export function getPrompt(name: string): RegisteredPrompt | undefined {
  return prompts.get(name);
}

// ── JSON Schema Conversion ──

/**
 * Convert a Zod schema to JSON Schema for MCP tool input definitions.
 */
function convertZodToJsonSchema(schema: ZodType): ToolDefinition['inputSchema'] {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });
  // Ensure it's an object type with the right shape
  if (typeof jsonSchema === 'object' && 'type' in jsonSchema && jsonSchema.type === 'object') {
    return {
      type: 'object',
      properties: (jsonSchema as Record<string, unknown>).properties as Record<string, unknown> ?? {},
      required: (jsonSchema as Record<string, unknown>).required as string[] | undefined,
      additionalProperties: false,
    };
  }
  // Fallback for empty schemas
  return { type: 'object', properties: {}, additionalProperties: false };
}

// ── URI Template Matching ──

/**
 * Simple URI template matching (RFC 6570 level 1).
 * Matches templates like "tampadev://events/{eventId}" against URIs.
 */
function matchUriTemplate(template: string, uri: string): Record<string, string> | null {
  // Escape regex special chars except for {param} placeholders
  const paramNames: string[] = [];
  const regexStr = template.replace(/\{([^}]+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  }).replace(/[.*+?^$|()[\]\\]/g, (m) => {
    // Don't escape the capture groups we just added
    if (m === '(' || m === ')') return m;
    return '\\' + m;
  });

  const regex = new RegExp('^' + regexStr + '$');
  const match = uri.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1]);
  });
  return params;
}

// ── Registry Stats ──

export function getRegistryStats(): { tools: number; resources: number; resourceTemplates: number; prompts: number } {
  return {
    tools: tools.size,
    resources: resources.size,
    resourceTemplates: resourceTemplates.size,
    prompts: prompts.size,
  };
}
