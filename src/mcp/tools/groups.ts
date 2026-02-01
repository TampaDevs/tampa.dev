/**
 * MCP Tools: Groups
 *
 * Group-related MCP tools for listing, viewing, and leaderboard access.
 */

import { z } from 'zod';
import { eq, and, like, asc, count } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { groups, groupMembers } from '../../db/schema.js';

// ── groups_list ──

defineTool({
  name: 'groups_list',
  description: 'List groups with optional filters for featured, active status, and name search. Returns groups ordered by name ascending.',
  scope: 'read:groups',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).optional().default(25).describe('Max results to return (1-100, default 25)'),
    offset: z.number().int().min(0).optional().default(0).describe('Number of results to skip'),
    featured: z.boolean().optional().describe('Filter by featured status'),
    active: z.boolean().optional().describe('Filter by active status'),
    search: z.string().max(200).optional().describe('Search groups by name (case-insensitive LIKE match)'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (args.featured !== undefined) {
      conditions.push(eq(groups.isFeatured, args.featured));
    }

    if (args.active !== undefined) {
      conditions.push(eq(groups.isActive, args.active));
    }

    if (args.search) {
      conditions.push(like(groups.name, `%${args.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const groupRows = await db
      .select({
        id: groups.id,
        name: groups.name,
        urlname: groups.urlname,
        description: groups.description,
        link: groups.link,
        website: groups.website,
        memberCount: groups.memberCount,
        photoUrl: groups.photoUrl,
        displayOnSite: groups.displayOnSite,
        isFeatured: groups.isFeatured,
        tags: groups.tags,
        socialLinks: groups.socialLinks,
        isActive: groups.isActive,
      })
      .from(groups)
      .where(whereClause)
      .orderBy(asc(groups.name))
      .limit(args.limit)
      .offset(args.offset);

    const result = groupRows.map((row) => ({
      id: row.id,
      name: row.name,
      urlname: row.urlname,
      description: row.description,
      link: row.link,
      website: row.website,
      memberCount: row.memberCount,
      photoUrl: row.photoUrl,
      displayOnSite: row.displayOnSite,
      isFeatured: row.isFeatured,
      tags: row.tags ? JSON.parse(row.tags) : [],
      socialLinks: row.socialLinks ? JSON.parse(row.socialLinks) : {},
      isActive: row.isActive,
    }));

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── groups_get ──

defineTool({
  name: 'groups_get',
  description: 'Get a single group by its URL slug (urlname), including its member count.',
  scope: 'read:groups',
  inputSchema: z.object({
    slug: z.string().describe('The group URL slug (urlname)'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, args.slug),
    });

    if (!group) {
      return { content: [{ type: 'text', text: 'Error: Group not found' }], isError: true };
    }

    // Get actual member count from group_members table
    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    const result = {
      id: group.id,
      name: group.name,
      urlname: group.urlname,
      description: group.description,
      link: group.link,
      website: group.website,
      memberCount: memberCount || group.memberCount,
      photoUrl: group.photoUrl,
      displayOnSite: group.displayOnSite,
      isFeatured: group.isFeatured,
      tags: group.tags ? JSON.parse(group.tags) : [],
      socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : {},
      isActive: group.isActive,
      maxBadges: group.maxBadges,
      maxBadgePoints: group.maxBadgePoints,
      createdAt: group.createdAt,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});

// ── groups_leaderboard ──

defineTool({
  name: 'groups_leaderboard',
  description: 'Get the XP leaderboard for a group. Note: leaderboard computation is complex and is best served by the REST API. This tool returns a reference to the REST endpoint.',
  scope: null,
  inputSchema: z.object({
    slug: z.string().describe('The group URL slug (urlname)'),
  }),
  handler: async (args, _ctx) => {
    const result = {
      message: 'Use the REST API /groups/:slug/leaderboard for detailed leaderboard data with XP calculations.',
      endpoint: `/groups/${encodeURIComponent(args.slug)}/leaderboard`,
      slug: args.slug,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
});
