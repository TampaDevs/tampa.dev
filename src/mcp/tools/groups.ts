/**
 * MCP Tools: Groups
 *
 * Group-related MCP tools for listing, viewing, and leaderboard access.
 */

import { z } from 'zod';
import { eq, and, like, asc, desc, sql, count as drizzleCount } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { groups, groupMembers } from '../../db/schema.js';

// ── groups_list ──

defineTool({
  name: 'groups_list',
  description:
    'Search and list community groups with keyword search (name/description), tag, platform, and status filters. ' +
    'Supports sorting by name, member count, or creation date with flexible direction. ' +
    'Returns paginated results with total count.',
  scope: 'read:groups',
  inputSchema: z.object({
    search: z.string().max(200).optional().describe('Keyword search on group name or description (substring match)'),
    tag: z.string().max(100).optional().describe('Filter by tag (groups must have this tag in their tags array)'),
    platform: z.enum(['meetup', 'eventbrite', 'luma', 'tampa.dev']).optional().describe('Filter by platform'),
    featured: z.boolean().optional().describe('Filter by featured status'),
    active: z.boolean().optional().describe('Filter by active status'),
    display_on_site: z.boolean().optional().describe('Filter by whether group is displayed on site'),
    sort: z.enum(['name', 'member_count', 'created_at']).optional().default('name').describe('Sort field'),
    direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc for name, desc for member_count/created_at)'),
    limit: z.number().int().min(1).max(100).optional().default(25).describe('Max results to return (1-100, default 25)'),
    offset: z.number().int().min(0).optional().default(0).describe('Number of results to skip'),
  }),
  handler: async (args, ctx) => {
    const db = createDatabase(ctx.env.DB);

    // Resolve sort direction default based on sort field
    const sortField = args.sort ?? 'name';
    const sortDir = args.direction ?? (sortField === 'name' ? 'asc' : 'desc');

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];

    if (args.search && args.search.trim().length > 0) {
      const searchTerm = `%${args.search.trim()}%`;
      conditions.push(sql`(${groups.name} LIKE ${searchTerm} OR ${groups.description} LIKE ${searchTerm})` as any);
    }

    if (args.tag && args.tag.trim().length > 0) {
      // Tags are stored as JSON array: ["tag1","tag2"]
      // Use LIKE on the raw text for pragmatic matching
      conditions.push(like(groups.tags, `%"${args.tag.trim()}"%`) as any);
    }

    if (args.platform) {
      conditions.push(eq(groups.platform, args.platform));
    }

    if (args.featured !== undefined) {
      conditions.push(eq(groups.isFeatured, args.featured));
    }

    if (args.active !== undefined) {
      conditions.push(eq(groups.isActive, args.active));
    }

    if (args.display_on_site !== undefined) {
      conditions.push(eq(groups.displayOnSite, args.display_on_site));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Dynamic ORDER BY — safe because values come from validated enum
    const orderByClause = sortField === 'member_count'
      ? (sortDir === 'asc' ? [asc(groups.memberCount)] : [desc(groups.memberCount)])
      : sortField === 'created_at'
        ? (sortDir === 'asc' ? [asc(groups.createdAt)] : [desc(groups.createdAt)])
        : (sortDir === 'asc' ? [asc(groups.name)] : [desc(groups.name)]);

    // Main data query
    const groupRows = await db
      .select({
        id: groups.id,
        name: groups.name,
        urlname: groups.urlname,
        description: groups.description,
        link: groups.link,
        website: groups.website,
        platform: groups.platform,
        memberCount: groups.memberCount,
        photoUrl: groups.photoUrl,
        displayOnSite: groups.displayOnSite,
        isFeatured: groups.isFeatured,
        tags: groups.tags,
        socialLinks: groups.socialLinks,
        isActive: groups.isActive,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(args.limit)
      .offset(args.offset);

    // Count query (same filters, no pagination)
    const [countRow] = await db
      .select({ total: drizzleCount() })
      .from(groups)
      .where(whereClause);
    const total = countRow?.total ?? 0;

    const entries = groupRows.map((row) => ({
      id: row.id,
      name: row.name,
      urlname: row.urlname,
      description: row.description,
      link: row.link,
      website: row.website,
      platform: row.platform,
      memberCount: row.memberCount,
      photoUrl: row.photoUrl,
      displayOnSite: row.displayOnSite,
      isFeatured: row.isFeatured,
      tags: row.tags ? JSON.parse(row.tags) : [],
      socialLinks: row.socialLinks ? JSON.parse(row.socialLinks) : {},
      isActive: row.isActive,
      createdAt: row.createdAt,
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
