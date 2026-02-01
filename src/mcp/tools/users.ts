/**
 * MCP User Search Tool
 *
 * Public tool for searching and discovering community members.
 * Supports fuzzy name/username search, badge filtering, XP thresholds,
 * and flexible sort ordering. Only returns public profiles.
 */

import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import type { ToolResult } from '../types.js';

// ── users_search ──

defineTool({
  name: 'users_search',
  description:
    'Search for community members by name/username, filter by badges, and sort by join date, XP, or badge count. ' +
    'Only public profiles are returned. Supports combining filters (e.g., find users named "John" with the "builder" badge and at least 250 XP). ' +
    'Badge filter accepts comma-separated slugs with AND logic (user must have all specified badges).',
  scope: null,
  inputSchema: z.object({
    search: z.string().max(100).optional().describe('Fuzzy search on name or username (substring match)'),
    badge: z.string().max(500).optional().describe('Comma-separated badge slugs — user must have ALL listed badges'),
    min_xp: z.number().int().min(0).optional().describe('Minimum total XP from platform badges'),
    sort: z.enum(['join_date', 'xp', 'badge_count']).optional().default('join_date').describe('Sort field'),
    direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc for join_date, desc for xp/badge_count)'),
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);

    // Resolve sort direction default based on sort field
    const sortField = args.sort ?? 'join_date';
    const sortDir = args.direction ?? (sortField === 'join_date' ? 'asc' : 'desc');

    // Badge filter: parse comma-separated slugs
    const badgeSlugs = args.badge
      ? args.badge.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Build WHERE conditions as parameterized sql fragments
    const searchConditions: ReturnType<typeof sql>[] = [
      sql`u.profile_visibility = 'public'`,
      sql`u.username IS NOT NULL`,
    ];

    if (args.search && args.search.trim().length > 0) {
      const searchTerm = `%${args.search.trim()}%`;
      searchConditions.push(sql`(u.name LIKE ${searchTerm} OR u.username LIKE ${searchTerm})`);
    }

    for (const slug of badgeSlugs) {
      searchConditions.push(
        sql`EXISTS (SELECT 1 FROM user_badges ub_f JOIN badges b_f ON ub_f.badge_id = b_f.id WHERE ub_f.user_id = u.id AND b_f.slug = ${slug})`,
      );
    }

    const whereFragment = sql.join(searchConditions, sql` AND `);

    // Use full expression (not alias) so HAVING works in both data and count queries
    const havingFragment = args.min_xp !== undefined && args.min_xp > 0
      ? sql`HAVING COALESCE(SUM(b.points), 0) >= ${args.min_xp}`
      : sql``;

    // Dynamic ORDER BY — safe because values come from validated enum, not user input
    const orderFragment = sortField === 'xp'
      ? (sortDir === 'asc' ? sql`ORDER BY xp ASC, badge_count ASC` : sql`ORDER BY xp DESC, badge_count DESC`)
      : sortField === 'badge_count'
        ? (sortDir === 'asc' ? sql`ORDER BY badge_count ASC, xp ASC` : sql`ORDER BY badge_count DESC, xp DESC`)
        : (sortDir === 'asc' ? sql`ORDER BY u.created_at ASC` : sql`ORDER BY u.created_at DESC`);

    // Main data query
    const results = await db.all<{
      username: string;
      name: string | null;
      avatar_url: string | null;
      bio: string | null;
      location: string | null;
      xp: number;
      badge_count: number;
      created_at: string;
    }>(sql`
      SELECT u.username, u.name, u.avatar_url, u.bio, u.location,
             COALESCE(SUM(b.points), 0) AS xp,
             COUNT(ub.id) AS badge_count,
             u.created_at
      FROM users u
      LEFT JOIN user_badges ub ON ub.user_id = u.id
      LEFT JOIN badges b ON b.id = ub.badge_id AND b.group_id IS NULL
      WHERE ${whereFragment}
      GROUP BY u.id
      ${havingFragment}
      ${orderFragment}
      LIMIT ${args.limit} OFFSET ${args.offset}
    `);

    // Count query (same filters, no pagination)
    const countResult = await db.all<{ total: number }>(sql`
      SELECT COUNT(*) AS total FROM (
        SELECT u.id
        FROM users u
        LEFT JOIN user_badges ub ON ub.user_id = u.id
        LEFT JOIN badges b ON b.id = ub.badge_id AND b.group_id IS NULL
        WHERE ${whereFragment}
        GROUP BY u.id
        ${havingFragment}
      )
    `);
    const total = countResult[0]?.total ?? 0;

    // Fetch badge slugs for returned users
    const usernames = results.map(r => r.username);
    const badgesByUsername: Record<string, string[]> = {};

    if (usernames.length > 0) {
      const badgeRows = await db.all<{
        username: string;
        slug: string;
      }>(sql`
        SELECT u.username, b.slug
        FROM user_badges ub
        JOIN users u ON u.id = ub.user_id
        JOIN badges b ON b.id = ub.badge_id
        WHERE u.username IN (${sql.join(usernames.map(u => sql`${u}`), sql`, `)})
          AND b.group_id IS NULL
      `);

      for (const row of badgeRows) {
        if (!badgesByUsername[row.username]) badgesByUsername[row.username] = [];
        badgesByUsername[row.username].push(row.slug);
      }
    }

    const entries = results.map(user => ({
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      xp: user.xp,
      badgeCount: user.badge_count,
      badges: badgesByUsername[user.username] ?? [],
      memberSince: user.created_at,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          entries,
          total,
          limit: args.limit,
          offset: args.offset,
          hasMore: (args.offset + entries.length) < total,
        }),
      }],
    };
  },
});
