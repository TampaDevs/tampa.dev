/**
 * Public Groups API Routes
 *
 * Returns all active groups with a displayOnSite flag for frontend filtering.
 * Groups with displayOnSite = true are curated partner groups.
 */

import { createRoute, z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../app.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { groups, groupMembers, users, userFavorites } from '../db/schema';
import { getCachedResponse, cacheResponse, getSyncVersion, checkConditionalRequest, createNotModifiedResponse } from '../cache.js';
import { KV_KEY_FAV_COUNTS, KV_TTL_FAV_COUNTS } from '../config/cache.js';

/**
 * Query parameters schema for group filtering
 */
const GroupQuerySchema = z.object({
  featured: z.string().optional().openapi({
    param: {
      name: 'featured',
      in: 'query',
    },
    description: 'Filter to only featured groups (set to "1" to filter)',
    example: '1',
  }),
  tag: z.string().optional().openapi({
    param: {
      name: 'tag',
      in: 'query',
    },
    description: 'Filter groups by tag',
    example: 'cloud',
  }),
});

/**
 * Social links schema
 */
const SocialLinksSchema = z.object({
  slack: z.string().optional(),
  discord: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
  meetup: z.string().optional(),
}).nullable();

/**
 * Group response schema (for OpenAPI documentation)
 */
const GroupResponseSchema = z.object({
  id: z.string(),
  urlname: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  link: z.string(),
  website: z.string().nullable(),
  platform: z.enum(['meetup', 'eventbrite', 'luma']),
  memberCount: z.number().nullable(),
  photoUrl: z.string().nullable(),
  isFeatured: z.boolean().nullable(),
  displayOnSite: z.boolean().nullable(),
  tags: z.array(z.string()).nullable(),
  socialLinks: SocialLinksSchema,
  favoritesCount: z.number().optional(),
});

/**
 * GET /2026-01-25/groups - Get all public groups
 */
const getAllGroupsRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/groups',
  summary: 'Get all public groups',
  description: 'Returns a list of all groups displayed on the website',
  tags: ['Groups'],
  request: {
    query: GroupQuerySchema,
  },
  responses: {
    200: {
      description: 'List of groups',
      content: {
        'application/json': {
          schema: z.array(GroupResponseSchema),
        },
      },
    },
  },
});

/**
 * GET /2026-01-25/groups/:slug - Get a single group by slug
 */
const getGroupBySlugRoute = createRoute({
  method: 'get',
  path: '/2026-01-25/groups/{slug}',
  summary: 'Get a group by slug',
  description: 'Returns a single group by its URL slug',
  tags: ['Groups'],
  request: {
    params: z.object({
      slug: z.string().openapi({
        param: {
          name: 'slug',
          in: 'path',
        },
        description: 'The group URL slug (urlname)',
        example: 'tampadevs',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Group details',
      content: {
        'application/json': {
          schema: GroupResponseSchema,
        },
      },
    },
    404: {
      description: 'Group not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

/**
 * Parse JSON fields in a group object for API response
 */
function parseGroupJsonFields(group: typeof groups.$inferSelect) {
  return {
    id: group.id,
    urlname: group.urlname,
    name: group.name,
    description: group.description,
    link: group.link,
    website: group.website,
    platform: group.platform,
    memberCount: group.memberCount,
    photoUrl: group.photoUrl,
    isFeatured: group.isFeatured,
    displayOnSite: group.displayOnSite,
    tags: group.tags ? JSON.parse(group.tags) : null,
    socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
  };
}

/**
 * Register group routes with the app
 */
export function registerGroupRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // Handler for all groups
  const allGroupsHandler = async (c: any) => {
    const db = createDatabase(c.env.DB);
    const url = new URL(c.req.url);
    const featured = url.searchParams.get('featured') === '1';
    const tag = url.searchParams.get('tag');

    // Get sync version for cache key
    const syncVersion = await getSyncVersion(c.env.DB, c.env.kv);

    // Check for conditional request (If-None-Match)
    if (syncVersion && checkConditionalRequest(c.req.raw, syncVersion)) {
      return createNotModifiedResponse(syncVersion);
    }

    // Get favorites counts (cached in KV to avoid aggregation query on every request)
    let favCountMap: Map<string, number>;
    const kv = c.env.kv;
    let kvCachedFavs: string | null = null;
    if (kv) {
      try { kvCachedFavs = await kv.get(KV_KEY_FAV_COUNTS); } catch {}
    }
    if (kvCachedFavs) {
      favCountMap = new Map(JSON.parse(kvCachedFavs));
    } else {
      const favCounts = await db
        .select({ groupId: userFavorites.groupId, count: count() })
        .from(userFavorites)
        .groupBy(userFavorites.groupId);
      favCountMap = new Map(favCounts.map((f) => [f.groupId, f.count]));
      if (kv) {
        kv.put(KV_KEY_FAV_COUNTS, JSON.stringify([...favCountMap]), { expirationTtl: KV_TTL_FAV_COUNTS }).catch(() => {});
      }
    }

    // Check cache for group data
    const cached = await getCachedResponse(c.req.raw, syncVersion || undefined);
    if (cached) {
      // Inject fresh favorites counts into cached response
      const cachedData = await cached.json() as any[];
      const updated = cachedData.map((g: any) => ({
        ...g,
        favoritesCount: favCountMap.get(g.id) || 0,
      }));
      const headers = new Headers(cached.headers);
      headers.set('Content-Type', 'application/json');
      return new Response(JSON.stringify(updated), {
        status: cached.status,
        headers,
      });
    }

    // Return all active groups (groups being synced)
    // Frontend can filter by displayOnSite if needed for curated views
    const conditions = [eq(groups.isActive, true)];

    if (featured) {
      conditions.push(eq(groups.isFeatured, true));
    }

    const results = await db.query.groups.findMany({
      where: and(...conditions),
      orderBy: [desc(groups.displayOnSite), desc(groups.isFeatured), desc(groups.memberCount)],
    });

    // Filter by tag if specified (done in JS since tags is JSON)
    let filteredResults = results;
    if (tag) {
      filteredResults = results.filter((group) => {
        if (!group.tags) return false;
        const tags = JSON.parse(group.tags) as string[];
        return tags.includes(tag);
      });
    }

    const json = filteredResults.map((g) => ({
      ...parseGroupJsonFields(g),
      favoritesCount: favCountMap.get(g.id) || 0,
    }));

    const response = new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Cache and return
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(c.req.raw, response, syncVersion || undefined, waitUntil);
  };

  // Handler for single group
  const singleGroupHandler = async (c: any) => {
    const db = createDatabase(c.env.DB);
    const slug = c.req.param('slug');

    // Get sync version for cache key
    const syncVersion = await getSyncVersion(c.env.DB, c.env.kv);

    // Check for conditional request (If-None-Match)
    if (syncVersion && checkConditionalRequest(c.req.raw, syncVersion)) {
      return createNotModifiedResponse(syncVersion);
    }

    // Check cache first
    const cached = await getCachedResponse(c.req.raw, syncVersion || undefined);
    if (cached) {
      return cached;
    }

    const group = await db.query.groups.findFirst({
      where: and(
        eq(groups.urlname, slug),
        eq(groups.displayOnSite, true)
      ),
    });

    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    const json = parseGroupJsonFields(group);

    // Fetch owners and favorites count in parallel
    const [ownerMembers, favCountResult] = await Promise.all([
      db.query.groupMembers.findMany({
        where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.role, 'owner')),
      }),
      db.select({ count: count() }).from(userFavorites).where(eq(userFavorites.groupId, group.id)),
    ]);
    const owners = await Promise.all(
      ownerMembers.map(async (m) => {
        const user = await db.query.users.findFirst({ where: eq(users.id, m.userId) });
        return user ? { id: user.id, name: user.name, username: user.username, avatarUrl: user.avatarUrl } : null;
      })
    );

    const jsonWithOwners = {
      ...json,
      owners: owners.filter(Boolean),
      ownerCount: ownerMembers.length,
      favoritesCount: favCountResult[0]?.count || 0,
    };

    const response = new Response(JSON.stringify(jsonWithOwners), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Cache and return
    const waitUntil = c.executionCtx?.waitUntil?.bind(c.executionCtx);
    return cacheResponse(c.req.raw, response, syncVersion || undefined, waitUntil);
  };

  // Group members handler (public users who favorited this group)
  const groupMembersHandler = async (c: any) => {
    const db = createDatabase(c.env.DB);
    const slug = c.req.param('slug');

    const group = await db.query.groups.findFirst({
      where: and(eq(groups.urlname, slug), eq(groups.displayOnSite, true)),
    });

    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    const members = await db
      .select({
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        favoritedAt: userFavorites.createdAt,
      })
      .from(userFavorites)
      .innerJoin(users, eq(userFavorites.userId, users.id))
      .where(
        and(
          eq(userFavorites.groupId, group.id),
          eq(users.profileVisibility, 'public'),
        )
      )
      .orderBy(desc(userFavorites.createdAt));

    return c.json({
      groupName: group.name,
      groupSlug: group.urlname,
      members: members
        .filter((m) => m.username)
        .map((m) => ({
          username: m.username,
          name: m.name,
          avatarUrl: m.avatarUrl,
          favoritedAt: m.favoritedAt,
        })),
    });
  };

  // Versioned routes (OpenAPI documented)
  app.openapi(getAllGroupsRoute, allGroupsHandler);
  app.openapi(getGroupBySlugRoute, singleGroupHandler);

  // Legacy unversioned routes (for backwards compatibility)
  app.get('/groups', allGroupsHandler);
  app.get('/groups/:slug', singleGroupHandler);

  // Group members route
  app.get('/groups/:slug/members', groupMembersHandler);
  app.get('/2026-01-25/groups/:slug/members', groupMembersHandler);
}
