/**
 * MCP Portfolio Tools
 *
 * Tools for managing user portfolio items via the MCP interface.
 * Delegates to the profile service for all business logic.
 */

import { z } from 'zod';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  listPortfolioItems,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  ProfileError,
} from '../../services/profile.js';

// ── portfolio_list ──

defineTool({
  name: 'portfolio_list',
  description: 'List the authenticated user\'s portfolio items, ordered by sort order.',
  scope: 'read:portfolio',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);
    const items = await listPortfolioItems(db, ctx.auth.user.id);

    return { content: [{ type: 'text' as const, text: JSON.stringify(items) }] };
  },
});

// ── portfolio_create ──

defineTool({
  name: 'portfolio_create',
  description: 'Create a new portfolio item for the authenticated user.',
  scope: 'write:portfolio',
  inputSchema: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await createPortfolioItem(db, ctx.auth.user.id, {
        title: args.title,
        description: args.description,
        url: args.url,
        imageUrl: args.imageUrl,
      });

      if (result.events) {
        for (const event of result.events) {
          ctx.executionCtx.waitUntil(
            ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
          );
        }
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result.item) }] };
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

// ── portfolio_update ──

defineTool({
  name: 'portfolio_update',
  description: 'Update an existing portfolio item. Only the authenticated user\'s own items can be updated.',
  scope: 'write:portfolio',
  inputSchema: z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.url !== undefined) updates.url = args.url;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;

    try {
      const item = await updatePortfolioItem(db, ctx.auth.user.id, args.id, updates);
      return { content: [{ type: 'text' as const, text: JSON.stringify(item) }] };
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

// ── portfolio_delete ──

defineTool({
  name: 'portfolio_delete',
  description: 'Delete a portfolio item. Only the authenticated user\'s own items can be deleted.',
  scope: 'write:portfolio',
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      await deletePortfolioItem(db, ctx.auth.user.id, args.id);
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
