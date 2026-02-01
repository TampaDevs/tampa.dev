/**
 * MCP Tools: Favorites
 *
 * Tools for managing a user's favorite groups. Delegates to the
 * shared favorites service and emits domain events via EVENTS_QUEUE.
 */

import { z } from 'zod';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  FavoriteError,
} from '../../services/favorites.js';

// ── favorites_list ──

defineTool({
  name: 'favorites_list',
  description: 'List the authenticated user\'s favorite groups.',
  scope: 'read:favorites',
  inputSchema: z.object({}),
  handler: async (_args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const favorites = await listFavorites(db, ctx.auth.user.id);
    return { content: [{ type: 'text', text: JSON.stringify(favorites) }] };
  },
});

// ── favorites_add ──

defineTool({
  name: 'favorites_add',
  description: 'Add a group to the authenticated user\'s favorites by group slug.',
  scope: 'write:favorites',
  inputSchema: z.object({
    group_slug: z.string().describe('The group URL slug (urlname) to add as a favorite'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await addFavorite(db, ctx.auth.user.id, args.group_slug);

      // Emit domain events for achievements/webhooks/notifications
      for (const event of result.events) {
        ctx.executionCtx.waitUntil(
          ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            added: !result.alreadyExisted,
            alreadyExisted: result.alreadyExisted,
            groupSlug: args.group_slug,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof FavoriteError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});

// ── favorites_remove ──

defineTool({
  name: 'favorites_remove',
  description: 'Remove a group from the authenticated user\'s favorites by group slug.',
  scope: 'write:favorites',
  inputSchema: z.object({
    group_slug: z.string().describe('The group URL slug (urlname) to remove from favorites'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    try {
      const result = await removeFavorite(db, ctx.auth.user.id, args.group_slug);

      // Emit domain events for achievements/webhooks/notifications
      for (const event of result.events) {
        ctx.executionCtx.waitUntil(
          ctx.env.EVENTS_QUEUE.send({ ...event, timestamp: new Date().toISOString() }),
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            removed: true,
            groupSlug: args.group_slug,
          }),
        }],
      };
    } catch (error) {
      if (error instanceof FavoriteError) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
      throw error;
    }
  },
});
