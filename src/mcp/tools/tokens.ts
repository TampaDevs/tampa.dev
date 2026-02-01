/**
 * MCP Token Management Tools
 *
 * Tools for managing Personal Access Tokens (PATs) via the MCP interface.
 * Delegates to the profile service for all business logic.
 */

import { z } from 'zod';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  listTokens,
  createToken,
  revokeToken,
  ProfileError,
} from '../../services/profile.js';

// ── tokens_list ──

defineTool({
  name: 'tokens_list',
  description: 'List the authenticated user\'s Personal Access Tokens. Token values are never returned.',
  scope: 'user',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const tokens = await listTokens(db, ctx.auth.user.id);

    return { content: [{ type: 'text' as const, text: JSON.stringify(tokens) }] };
  },
});

// ── tokens_create ──

defineTool({
  name: 'tokens_create',
  description: 'Create a new Personal Access Token. The full token value is returned only once and cannot be retrieved again.',
  scope: 'user',
  inputSchema: z.object({
    name: z.string().min(1).max(200),
    scopes: z.array(z.string().min(1)).min(1),
    expiresInDays: z.number().int().positive().optional(),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await createToken(db, ctx.auth.user.id, ctx.auth.user.role, {
        name: args.name,
        scopes: args.scopes,
        expiresInDays: args.expiresInDays,
      });

      if (result.events) {
        for (const event of result.events) {
          ctx.executionCtx.waitUntil(
            ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
          );
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: result.id,
            name: result.name,
            token: result.token,
            tokenPrefix: result.tokenPrefix,
            scopes: result.scopes,
            expiresAt: result.expiresAt,
            createdAt: result.createdAt,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof ProfileError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  },
});

// ── tokens_revoke ──

defineTool({
  name: 'tokens_revoke',
  description: 'Revoke (delete) a Personal Access Token by ID. Only tokens owned by the authenticated user can be revoked.',
  scope: 'user',
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      await revokeToken(db, ctx.auth.user.id, args.id);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
    } catch (error) {
      if (error instanceof ProfileError) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
          isError: true,
        };
      }
      throw error;
    }
  },
});
