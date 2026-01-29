/**
 * OAuth API Handler
 *
 * Handles API requests authenticated via OAuth tokens.
 * Third-party apps use these endpoints after obtaining access tokens.
 *
 * The user's identity is available in this.ctx.props, which contains:
 * - userId: string
 * - email: string
 * - name: string | null
 * - avatarUrl: string | null
 * - githubUsername: string | null
 * - scopes: string[]
 */

import { WorkerEntrypoint } from 'cloudflare:workers';
import { eq, desc, gte, inArray } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, groups, events } from '../db/schema.js';
import type { Env } from '../../types/worker.js';

interface OAuthProps {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string | null;
  scopes: string[];
}

interface OAuthContext extends ExecutionContext {
  props: OAuthProps;
}

export class OAuthApiHandler extends WorkerEntrypoint<Env> {
  // Override ctx type to include props
  declare ctx: OAuthContext;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/v1', '');

    // Route to appropriate handler
    if (path === '/me' || path === '/me/') {
      return this.handleMe();
    }

    if (path === '/profile' || path === '/profile/') {
      return this.handleProfile();
    }

    if (path === '/events' || path === '/events/') {
      return this.handleEvents(url);
    }

    if (path === '/groups' || path === '/groups/') {
      return this.handleGroups(url);
    }

    if (path.startsWith('/groups/')) {
      const groupSlug = path.replace('/groups/', '').replace('/', '');
      return this.handleGroup(groupSlug);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * GET /api/v1/me - Get authenticated user's basic info
   * Requires: profile scope
   */
  private async handleMe(): Promise<Response> {
    if (!this.hasScope('profile')) {
      return this.scopeError('profile');
    }

    return Response.json({
      id: this.ctx.props.userId,
      email: this.ctx.props.email,
      name: this.ctx.props.name,
      avatarUrl: this.ctx.props.avatarUrl,
      githubUsername: this.ctx.props.githubUsername,
    });
  }

  /**
   * GET /api/v1/profile - Get full user profile from database
   * Requires: profile scope
   */
  private async handleProfile(): Promise<Response> {
    if (!this.hasScope('profile')) {
      return this.scopeError('profile');
    }

    const db = createDatabase(this.env.DB);
    const user = await db.query.users.findFirst({
      where: eq(users.id, this.ctx.props.userId),
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    });
  }

  /**
   * GET /api/v1/events - List upcoming events
   * Requires: events:read scope
   */
  private async handleEvents(url: URL): Promise<Response> {
    if (!this.hasScope('events:read')) {
      return this.scopeError('events:read');
    }

    const db = createDatabase(this.env.DB);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get upcoming events
    const now = new Date().toISOString();
    const upcomingEvents = await db.query.events.findMany({
      where: gte(events.startTime, now),
      orderBy: [events.startTime],
      limit,
      offset,
    });

    // Get group info for each event
    const groupIds = [...new Set(upcomingEvents.map((e) => e.groupId))];
    const groupsData = groupIds.length > 0
      ? await db.query.groups.findMany({
          where: inArray(groups.id, groupIds),
        })
      : [];
    const groupMap = new Map(groupsData.map((g) => [g.id, g]));

    return Response.json({
      events: upcomingEvents.map((event) => {
        const group = groupMap.get(event.groupId);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          eventUrl: event.eventUrl,
          photoUrl: event.photoUrl,
          eventType: event.eventType,
          rsvpCount: event.rsvpCount,
          group: group ? {
            id: group.id,
            name: group.name,
            urlname: group.urlname,
          } : null,
        };
      }),
      pagination: {
        limit,
        offset,
        hasMore: upcomingEvents.length === limit,
      },
    });
  }

  /**
   * GET /api/v1/groups - List groups
   * Requires: groups:read scope
   */
  private async handleGroups(url: URL): Promise<Response> {
    if (!this.hasScope('groups:read')) {
      return this.scopeError('groups:read');
    }

    const db = createDatabase(this.env.DB);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const allGroups = await db.query.groups.findMany({
      where: eq(groups.displayOnSite, true),
      orderBy: [desc(groups.memberCount)],
      limit,
      offset,
    });

    return Response.json({
      groups: allGroups.map((group) => ({
        id: group.id,
        urlname: group.urlname,
        name: group.name,
        description: group.description,
        link: group.link,
        website: group.website,
        memberCount: group.memberCount,
        photoUrl: group.photoUrl,
        tags: group.tags ? JSON.parse(group.tags) : null,
        socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      })),
      pagination: {
        limit,
        offset,
        hasMore: allGroups.length === limit,
      },
    });
  }

  /**
   * GET /api/v1/groups/:slug - Get a specific group
   * Requires: groups:read scope
   */
  private async handleGroup(slug: string): Promise<Response> {
    if (!this.hasScope('groups:read')) {
      return this.scopeError('groups:read');
    }

    const db = createDatabase(this.env.DB);
    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, slug),
    });

    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get upcoming events for this group
    const now = new Date().toISOString();
    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, group.id),
      orderBy: [events.startTime],
      limit: 10,
    });

    return Response.json({
      id: group.id,
      urlname: group.urlname,
      name: group.name,
      description: group.description,
      link: group.link,
      website: group.website,
      memberCount: group.memberCount,
      photoUrl: group.photoUrl,
      tags: group.tags ? JSON.parse(group.tags) : null,
      socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      upcomingEvents: groupEvents.map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        eventUrl: event.eventUrl,
      })),
    });
  }

  /**
   * Check if the token has a required scope
   */
  private hasScope(scope: string): boolean {
    return this.ctx.props.scopes.includes(scope);
  }

  /**
   * Return a scope error response
   */
  private scopeError(requiredScope: string): Response {
    return Response.json(
      {
        error: 'insufficient_scope',
        error_description: `This endpoint requires the '${requiredScope}' scope`,
        scope: requiredScope,
      },
      {
        status: 403,
        headers: {
          'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${requiredScope}"`,
        },
      }
    );
  }
}
