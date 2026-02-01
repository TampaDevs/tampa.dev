/**
 * MCP Leaderboard Tools
 *
 * Tools for querying the global and group-specific XP leaderboards.
 * XP is computed as the sum of badge points from the user_badges + badges tables.
 */

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { groups } from '../../db/schema.js';
import type { ToolResult } from '../types.js';

// ── leaderboard_global ──

defineTool({
  name: 'leaderboard_global',
  description: 'Get the global XP leaderboard. Returns users ranked by total XP (sum of badge points for platform-level badges). Only public profiles with achievements visible are included.',
  scope: null,
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    const rankedUsers = await db.all<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
    }>(sql`
      SELECT u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.show_achievements = 1
        AND u.profile_visibility = 'public'
        AND u.username IS NOT NULL
        AND b.group_id IS NULL
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC
      LIMIT ${args.limit} OFFSET ${args.offset}
    `);

    const totalResult = await db.all<{ total: number }>(sql`
      SELECT COUNT(*) AS total FROM (
        SELECT u.id
        FROM users u
        JOIN user_badges ub ON ub.user_id = u.id
        JOIN badges b ON b.id = ub.badge_id
        WHERE u.show_achievements = 1
          AND u.profile_visibility = 'public'
          AND u.username IS NOT NULL
          AND b.group_id IS NULL
        GROUP BY u.id
        HAVING SUM(b.points) > 0
      )
    `);
    const total = totalResult[0]?.total ?? 0;

    const entries = rankedUsers.map((user, index) => ({
      rank: args.offset + index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      xp: user.score,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ entries, total, limit: args.limit, offset: args.offset }),
      }],
    };
  },
});

// ── leaderboard_group ──

defineTool({
  name: 'leaderboard_group',
  description: 'Get a group-specific XP leaderboard. Returns users ranked by total XP from badges scoped to the specified group. Only public profiles are included.',
  scope: null,
  inputSchema: z.object({
    group_slug: z.string().min(1).max(100),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    // Look up group by slug
    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, args.group_slug),
    });

    if (!group) {
      return {
        content: [{ type: 'text', text: 'Error: Group not found' }],
        isError: true,
      };
    }

    const rankedUsers = await db.all<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
    }>(sql`
      SELECT u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.profile_visibility = 'public'
        AND u.username IS NOT NULL
        AND b.group_id = ${group.id}
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC
      LIMIT ${args.limit} OFFSET ${args.offset}
    `);

    const totalResult = await db.all<{ total: number }>(sql`
      SELECT COUNT(*) AS total FROM (
        SELECT u.id
        FROM users u
        JOIN user_badges ub ON ub.user_id = u.id
        JOIN badges b ON b.id = ub.badge_id
        WHERE u.profile_visibility = 'public'
          AND u.username IS NOT NULL
          AND b.group_id = ${group.id}
        GROUP BY u.id
        HAVING SUM(b.points) > 0
      )
    `);
    const total = totalResult[0]?.total ?? 0;

    const entries = rankedUsers.map((user, index) => ({
      rank: args.offset + index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      xp: user.score,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          group: {
            id: group.id,
            name: group.name,
            urlname: group.urlname,
            photoUrl: group.photoUrl,
          },
          entries,
          total,
          limit: args.limit,
          offset: args.offset,
        }),
      }],
    };
  },
});
