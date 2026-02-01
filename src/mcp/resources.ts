/**
 * MCP Resources
 *
 * Static resources and resource templates for the Tampa.dev Events API.
 * Uses the `tampadev://` URI scheme. Each resource handler queries the
 * database and returns JSON-formatted content.
 */

import { eq, gte, asc, sql, and, isNull } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { events, groups, venues, users, badges, userBadges } from '../db/schema.js';
import { SCOPES } from '../lib/scopes.js';
import { defineResource, defineResourceTemplate } from './registry.js';
import type { ResourceContent, ToolContext } from './types.js';

// ── Static Resources ──

/**
 * tampadev://events - List upcoming events (next 30 days, limit 50)
 */
defineResource({
  uri: 'tampadev://events',
  name: 'Upcoming Events',
  description: 'List of upcoming Tampa Bay tech community events for the next 30 days',
  scope: 'read:events',
  handler: async (uri: string, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);
    const now = new Date().toISOString();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        eventType: events.eventType,
        status: events.status,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        eventUrl: events.eventUrl,
        photoUrl: events.photoUrl,
        groupId: events.groupId,
        groupName: groups.name,
        groupUrlname: groups.urlname,
        venueName: venues.name,
        venueCity: venues.city,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(
        and(
          gte(events.startTime, now),
          sql`${events.startTime} <= ${thirtyDaysFromNow}`,
          eq(events.status, 'active'),
        ),
      )
      .orderBy(asc(events.startTime))
      .limit(50);

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(upcomingEvents),
    };
  },
});

/**
 * tampadev://groups - List all active groups
 */
defineResource({
  uri: 'tampadev://groups',
  name: 'Active Groups',
  description: 'List of all active Tampa Bay tech community groups',
  scope: 'read:groups',
  handler: async (uri: string, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const activeGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        urlname: groups.urlname,
        description: groups.description,
        link: groups.link,
        website: groups.website,
        memberCount: groups.memberCount,
        photoUrl: groups.photoUrl,
        tags: groups.tags,
        isFeatured: groups.isFeatured,
      })
      .from(groups)
      .where(eq(groups.isActive, true))
      .orderBy(asc(groups.name));

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(activeGroups),
    };
  },
});

/**
 * tampadev://profile - Current user's profile data
 */
defineResource({
  uri: 'tampadev://profile',
  name: 'My Profile',
  description: 'Current authenticated user profile data',
  scope: 'read:user',
  handler: async (uri: string, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.auth.user.id),
    });

    if (!user) {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Return profile data without sensitive fields
    const profile = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      heroImageUrl: user.heroImageUrl,
      themeColor: user.themeColor,
      location: user.location,
      socialLinks: user.socialLinks ? JSON.parse(user.socialLinks) : null,
      profileVisibility: user.profileVisibility,
      showAchievements: user.showAchievements,
      role: user.role,
      createdAt: user.createdAt,
    };

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(profile),
    };
  },
});

/**
 * tampadev://badges - All available badges
 */
defineResource({
  uri: 'tampadev://badges',
  name: 'Available Badges',
  description: 'All available badges in the Tampa.dev platform',
  scope: null,
  handler: async (uri: string, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const allBadges = await db
      .select({
        id: badges.id,
        name: badges.name,
        slug: badges.slug,
        description: badges.description,
        icon: badges.icon,
        color: badges.color,
        points: badges.points,
        groupId: badges.groupId,
        groupName: groups.name,
      })
      .from(badges)
      .leftJoin(groups, eq(badges.groupId, groups.id))
      .where(eq(badges.hideFromDirectory, 0))
      .orderBy(badges.sortOrder, asc(badges.name));

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(allBadges),
    };
  },
});

/**
 * tampadev://leaderboard - Global top 20 leaderboard
 */
defineResource({
  uri: 'tampadev://leaderboard',
  name: 'Global Leaderboard',
  description: 'Top 20 users ranked by XP score from platform-level badges',
  scope: null,
  handler: async (uri: string, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const rankedUsers = await db.all<{
      id: string;
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
    }>(sql`
      SELECT u.id, u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.show_achievements = 1 AND u.profile_visibility = 'public' AND u.username IS NOT NULL
        AND b.group_id IS NULL
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC
      LIMIT 20
    `);

    const entries = rankedUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      score: user.score,
      badgeCount: user.badge_count,
    }));

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(entries),
    };
  },
});

/**
 * tampadev://scopes - Available OAuth scopes with descriptions
 */
defineResource({
  uri: 'tampadev://scopes',
  name: 'OAuth Scopes',
  description: 'Available OAuth scopes and their descriptions for the Tampa.dev API',
  scope: null,
  handler: async (uri: string, _ctx: ToolContext): Promise<ResourceContent> => {
    const scopeList = Object.entries(SCOPES).map(([key, description]) => ({
      scope: key,
      description,
    }));

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(scopeList),
    };
  },
});

// ── Resource Templates ──

/**
 * tampadev://events/{eventId} - Single event details
 */
defineResourceTemplate({
  uriTemplate: 'tampadev://events/{eventId}',
  name: 'Event Details',
  description: 'Detailed information about a specific event',
  scope: 'read:events',
  handler: async (uri: string, params: Record<string, string>, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const event = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        duration: events.duration,
        eventType: events.eventType,
        status: events.status,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        eventUrl: events.eventUrl,
        photoUrl: events.photoUrl,
        isFeatured: events.isFeatured,
        createdAt: events.createdAt,
        groupId: events.groupId,
        groupName: groups.name,
        groupUrlname: groups.urlname,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
        venueState: venues.state,
        venueLatitude: venues.latitude,
        venueLongitude: venues.longitude,
        venueIsOnline: venues.isOnline,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, params.eventId))
      .limit(1);

    if (event.length === 0) {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Event not found' }),
      };
    }

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(event[0]),
    };
  },
});

/**
 * tampadev://groups/{slug} - Single group details
 */
defineResourceTemplate({
  uriTemplate: 'tampadev://groups/{slug}',
  name: 'Group Details',
  description: 'Detailed information about a specific group',
  scope: 'read:groups',
  handler: async (uri: string, params: Record<string, string>, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, params.slug),
    });

    if (!group) {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Group not found' }),
      };
    }

    // Fetch upcoming events for this group
    const now = new Date().toISOString();
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
      })
      .from(events)
      .where(
        and(
          eq(events.groupId, group.id),
          gte(events.startTime, now),
          eq(events.status, 'active'),
        ),
      )
      .orderBy(asc(events.startTime))
      .limit(10);

    // Fetch group badges
    const groupBadges = await db
      .select({
        id: badges.id,
        name: badges.name,
        slug: badges.slug,
        description: badges.description,
        icon: badges.icon,
        color: badges.color,
        points: badges.points,
      })
      .from(badges)
      .where(eq(badges.groupId, group.id))
      .orderBy(badges.sortOrder);

    const data = {
      id: group.id,
      name: group.name,
      urlname: group.urlname,
      description: group.description,
      link: group.link,
      website: group.website,
      memberCount: group.memberCount,
      photoUrl: group.photoUrl,
      tags: group.tags ? JSON.parse(group.tags) : [],
      socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      isFeatured: group.isFeatured,
      upcomingEvents,
      badges: groupBadges,
    };

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data),
    };
  },
});

/**
 * tampadev://leaderboard/{slug} - Group-specific leaderboard
 */
defineResourceTemplate({
  uriTemplate: 'tampadev://leaderboard/{slug}',
  name: 'Group Leaderboard',
  description: 'Top users ranked by XP score for a specific group',
  scope: null,
  handler: async (uri: string, params: Record<string, string>, ctx: ToolContext): Promise<ResourceContent> => {
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, params.slug),
    });

    if (!group) {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'Group not found' }),
      };
    }

    const rankedUsers = await db.all<{
      id: string;
      username: string;
      name: string | null;
      avatar_url: string | null;
      score: number;
      badge_count: number;
    }>(sql`
      SELECT u.id, u.username, u.name, u.avatar_url,
             COALESCE(SUM(b.points), 0) AS score,
             COUNT(ub.id) AS badge_count
      FROM users u
      JOIN user_badges ub ON ub.user_id = u.id
      JOIN badges b ON b.id = ub.badge_id
      WHERE u.profile_visibility = 'public' AND u.username IS NOT NULL
        AND b.group_id = ${group.id}
      GROUP BY u.id
      HAVING SUM(b.points) > 0
      ORDER BY score DESC, badge_count DESC
      LIMIT 20
    `);

    const entries = rankedUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar_url,
      score: user.score,
      badgeCount: user.badge_count,
    }));

    const data = {
      group: {
        id: group.id,
        name: group.name,
        urlname: group.urlname,
        photoUrl: group.photoUrl,
      },
      entries,
    };

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data),
    };
  },
});
