/**
 * MCP Prompts
 *
 * Prompt templates for AI-assisted tasks in the Tampa Devs Events API.
 * Each prompt fetches relevant data from the database and returns
 * structured messages with context for the AI to act on.
 */

import { eq, gte, asc, desc, sql, and, lte } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  events,
  groups,
  venues,
  badges,
  userBadges,
  groupMembers,
  eventRsvps,
  eventCheckins,
  achievements,
  users,
} from '../db/schema.js';
import { definePrompt } from './registry.js';
import type { PromptMessage, ToolContext } from './types.js';

// ── Helper: Look up a group by slug ──

async function findGroupBySlug(ctx: ToolContext, slug: string) {
  const db = createDatabase(ctx.env.DB);
  return db.query.groups.findFirst({
    where: eq(groups.urlname, slug),
  });
}

// ── Prompts ──

/**
 * weekly_digest - Generate a weekly event digest
 * Optionally filtered to a specific group.
 */
definePrompt({
  name: 'weekly_digest',
  description: 'Generate a weekly event digest for the Tampa Bay tech community or a specific group',
  arguments: [
    {
      name: 'group_slug',
      description: 'Optional group slug to filter events to a specific group',
      required: false,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const now = new Date().toISOString();
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let groupFilter = undefined;
    let groupName = 'Tampa Bay tech community';

    if (args.group_slug) {
      const group = await findGroupBySlug(ctx, args.group_slug);
      if (group) {
        groupFilter = group.id;
        groupName = group.name;
      }
    }

    const conditions = [
      gte(events.startTime, now),
      sql`${events.startTime} <= ${oneWeekFromNow}`,
      eq(events.status, 'active'),
    ];
    if (groupFilter) {
      conditions.push(eq(events.groupId, groupFilter));
    }

    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        eventUrl: events.eventUrl,
        groupName: groups.name,
        venueName: venues.name,
        venueCity: venues.city,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(and(...conditions))
      .orderBy(asc(events.startTime))
      .limit(20);

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a weekly event digest for the ${groupName}.\n\nHere are the upcoming events for the next 7 days:\n${JSON.stringify(upcomingEvents, null, 2)}\n\nPlease format this as a friendly, concise newsletter highlighting the most interesting events. Include event titles, dates/times, locations, and brief descriptions. Group them by day of the week.`,
        },
      },
    ];
  },
});

/**
 * event_newsletter - Draft a newsletter with event data
 */
definePrompt({
  name: 'event_newsletter',
  description: 'Draft an event newsletter for a specific group',
  arguments: [
    {
      name: 'group_slug',
      description: 'Group slug to generate the newsletter for',
      required: true,
    },
    {
      name: 'date_range',
      description: 'Number of days to look ahead (default: 14)',
      required: false,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const group = await findGroupBySlug(ctx, args.group_slug);

    if (!group) {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Could not find a group with slug "${args.group_slug}". Please check the group slug and try again.`,
          },
        },
      ];
    }

    const daysAhead = parseInt(args.date_range || '14', 10);
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const groupEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        endTime: events.endTime,
        timezone: events.timezone,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        eventUrl: events.eventUrl,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(
        and(
          eq(events.groupId, group.id),
          gte(events.startTime, now),
          sql`${events.startTime} <= ${futureDate}`,
          eq(events.status, 'active'),
        ),
      )
      .orderBy(asc(events.startTime))
      .limit(20);

    const memberCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    const memberCount = memberCountResult[0]?.count ?? group.memberCount ?? 0;

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Draft an email newsletter for the "${group.name}" group.\n\nGroup Info:\n- Name: ${group.name}\n- Description: ${group.description || 'N/A'}\n- Members: ${memberCount}\n- Website: ${group.website || group.link}\n\nUpcoming events (next ${daysAhead} days):\n${JSON.stringify(groupEvents, null, 2)}\n\nPlease write a professional but friendly newsletter that:\n1. Opens with a warm greeting to the community\n2. Highlights each upcoming event with key details (date, time, location, what to expect)\n3. Encourages RSVPs and attendance\n4. Closes with a call to action`,
        },
      },
    ];
  },
});

/**
 * attendee_report - Summarize event attendance
 */
definePrompt({
  name: 'attendee_report',
  description: 'Generate an attendance report for a specific event',
  arguments: [
    {
      name: 'event_id',
      description: 'The event ID to generate the report for',
      required: true,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);

    const event = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        endTime: events.endTime,
        rsvpCount: events.rsvpCount,
        maxAttendees: events.maxAttendees,
        eventType: events.eventType,
        groupName: groups.name,
        venueName: venues.name,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, args.event_id))
      .limit(1);

    if (event.length === 0) {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Could not find an event with ID "${args.event_id}". Please check the event ID and try again.`,
          },
        },
      ];
    }

    const eventData = event[0];

    // Get RSVP stats
    const rsvpStats = await db
      .select({
        status: eventRsvps.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, args.event_id))
      .groupBy(eventRsvps.status);

    // Get checkin count
    const checkinResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(eventCheckins)
      .where(eq(eventCheckins.eventId, args.event_id));
    const checkinCount = checkinResult[0]?.count ?? 0;

    const rsvpBreakdown = Object.fromEntries(
      rsvpStats.map((r) => [r.status, r.count]),
    );

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate an attendance report for the following event.\n\nEvent Details:\n- Title: ${eventData.title}\n- Group: ${eventData.groupName || 'N/A'}\n- Date: ${eventData.startTime}${eventData.endTime ? ` to ${eventData.endTime}` : ''}\n- Type: ${eventData.eventType || 'physical'}\n- Venue: ${eventData.venueName || 'N/A'}\n- Max Capacity: ${eventData.maxAttendees ?? 'Unlimited'}\n\nAttendance Data:\n- RSVPs by status: ${JSON.stringify(rsvpBreakdown)}\n- Total RSVPs: ${eventData.rsvpCount ?? 0}\n- Checked in: ${checkinCount}\n- Show rate: ${eventData.rsvpCount ? Math.round((checkinCount / eventData.rsvpCount) * 100) : 0}%\n\nPlease provide:\n1. A summary of attendance metrics\n2. Analysis of the show rate (how it compares to typical tech meetup rates of 50-70%)\n3. Capacity utilization if applicable\n4. Recommendations for improving attendance at future events`,
        },
      },
    ];
  },
});

/**
 * community_health - Group activity report
 */
definePrompt({
  name: 'community_health',
  description: 'Generate a community health report for a specific group',
  arguments: [
    {
      name: 'group_slug',
      description: 'Group slug to analyze',
      required: true,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const group = await findGroupBySlug(ctx, args.group_slug);

    if (!group) {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Could not find a group with slug "${args.group_slug}". Please check the group slug and try again.`,
          },
        },
      ];
    }

    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Recent events (last 30 days)
    const recentEvents = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        rsvpCount: events.rsvpCount,
        status: events.status,
      })
      .from(events)
      .where(
        and(
          eq(events.groupId, group.id),
          gte(events.startTime, thirtyDaysAgo),
          sql`${events.startTime} <= ${now}`,
        ),
      )
      .orderBy(desc(events.startTime));

    // Upcoming events
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
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

    // Member count
    const memberStats = await db
      .select({
        role: groupMembers.role,
        count: sql<number>`COUNT(*)`,
      })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id))
      .groupBy(groupMembers.role);

    // Group badges count
    const badgeCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(badges)
      .where(eq(badges.groupId, group.id));

    // Event count over last 90 days
    const eventCount90d = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(events)
      .where(
        and(
          eq(events.groupId, group.id),
          gte(events.startTime, ninetyDaysAgo),
          sql`${events.startTime} <= ${now}`,
        ),
      );

    const memberBreakdown = Object.fromEntries(
      memberStats.map((m) => [m.role, m.count]),
    );
    const totalMembers = memberStats.reduce((sum, m) => sum + m.count, 0);

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a community health report for the "${group.name}" group.\n\nGroup Overview:\n- Name: ${group.name}\n- Description: ${group.description || 'N/A'}\n- Platform member count: ${group.memberCount ?? 0}\n- Registered members: ${totalMembers}\n- Member breakdown by role: ${JSON.stringify(memberBreakdown)}\n- Badges created: ${badgeCount[0]?.count ?? 0}\n- Events in last 90 days: ${eventCount90d[0]?.count ?? 0}\n\nRecent Events (last 30 days):\n${JSON.stringify(recentEvents, null, 2)}\n\nUpcoming Events:\n${JSON.stringify(upcomingEvents, null, 2)}\n\nPlease provide:\n1. An overall health score (1-10) with justification\n2. Analysis of event frequency and consistency\n3. Engagement trends based on RSVP counts\n4. Leadership team assessment (based on member roles)\n5. Specific, actionable recommendations for improving community engagement`,
        },
      },
    ];
  },
});

/**
 * suggest_events - Recommend events based on user preferences
 */
definePrompt({
  name: 'suggest_events',
  description: 'Recommend upcoming events based on the current user\'s interests and activity',
  arguments: [],
  handler: async (_args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;
    const now = new Date().toISOString();

    // Get user's favorite groups
    const favoriteGroups = await db.all<{ group_id: string; name: string }>(sql`
      SELECT uf.group_id, g.name
      FROM user_favorites uf
      JOIN groups g ON g.id = uf.group_id
      WHERE uf.user_id = ${userId}
    `);

    // Get user's badges (to understand interests)
    const userBadgeList = await db
      .select({
        badgeName: badges.name,
        groupName: groups.name,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .leftJoin(groups, eq(badges.groupId, groups.id))
      .where(eq(userBadges.userId, userId))
      .limit(20);

    // Get past events the user RSVPed to
    const pastRsvps = await db
      .select({
        eventTitle: events.title,
        groupName: groups.name,
        eventType: events.eventType,
      })
      .from(eventRsvps)
      .innerJoin(events, eq(eventRsvps.eventId, events.id))
      .leftJoin(groups, eq(events.groupId, groups.id))
      .where(eq(eventRsvps.userId, userId))
      .orderBy(desc(events.startTime))
      .limit(10);

    // Get upcoming events
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startTime: events.startTime,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
        eventUrl: events.eventUrl,
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
          eq(events.status, 'active'),
        ),
      )
      .orderBy(asc(events.startTime))
      .limit(30);

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Recommend upcoming events for this user based on their activity and interests.\n\nUser's Favorite Groups:\n${JSON.stringify(favoriteGroups, null, 2)}\n\nUser's Badges (indicating interests):\n${JSON.stringify(userBadgeList, null, 2)}\n\nRecent RSVPs (past events attended):\n${JSON.stringify(pastRsvps, null, 2)}\n\nAll Upcoming Events:\n${JSON.stringify(upcomingEvents, null, 2)}\n\nPlease:\n1. Analyze the user's interests based on their favorites, badges, and past RSVPs\n2. Rank the upcoming events by relevance to this user\n3. Provide personalized recommendations with brief explanations of why each event is a good match\n4. Suggest 3-5 top events with details on date, time, location, and why they should attend`,
        },
      },
    ];
  },
});

/**
 * onboarding_guide - Guide a new user through platform features
 */
definePrompt({
  name: 'onboarding_guide',
  description: 'Generate a personalized onboarding guide for a new user',
  arguments: [],
  handler: async (_args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;

    // Get user profile completeness
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Check what they have set up
    const hasUsername = !!user?.username;
    const hasBio = !!user?.bio;
    const hasAvatar = !!user?.avatarUrl;
    const hasSocialLinks = !!user?.socialLinks;
    const isPublic = user?.profileVisibility === 'public';

    // Count favorites, badges, RSVPs
    const [favCount, badgeCountResult, rsvpCount] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(sql`user_favorites`).where(sql`user_id = ${userId}`),
      db.select({ count: sql<number>`COUNT(*)` }).from(userBadges).where(eq(userBadges.userId, userId)),
      db.select({ count: sql<number>`COUNT(*)` }).from(eventRsvps).where(eq(eventRsvps.userId, userId)),
    ]);

    // Get some featured groups to recommend
    const featuredGroups = await db
      .select({
        name: groups.name,
        urlname: groups.urlname,
        description: groups.description,
        memberCount: groups.memberCount,
      })
      .from(groups)
      .where(and(eq(groups.isActive, true), eq(groups.isFeatured, true)))
      .limit(5);

    // Get a few upcoming events
    const now = new Date().toISOString();
    const soonEvents = await db
      .select({
        title: events.title,
        startTime: events.startTime,
        groupName: groups.name,
      })
      .from(events)
      .leftJoin(groups, eq(events.groupId, groups.id))
      .where(and(gte(events.startTime, now), eq(events.status, 'active')))
      .orderBy(asc(events.startTime))
      .limit(5);

    const profileCompleteness = {
      username: hasUsername,
      bio: hasBio,
      avatar: hasAvatar,
      socialLinks: hasSocialLinks,
      publicProfile: isPublic,
    };

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a personalized onboarding guide for a new Tampa Devs platform user.\n\nUser Profile Status:\n- Name: ${user?.name || 'Not set'}\n- Username: ${hasUsername ? user?.username : 'Not set'}\n- Profile completeness: ${JSON.stringify(profileCompleteness)}\n- Badges earned: ${badgeCountResult[0]?.count ?? 0}\n- Groups favorited: ${favCount[0]?.count ?? 0}\n- Events RSVPed: ${rsvpCount[0]?.count ?? 0}\n\nFeatured Groups to Explore:\n${JSON.stringify(featuredGroups, null, 2)}\n\nUpcoming Events:\n${JSON.stringify(soonEvents, null, 2)}\n\nPlease create a friendly, step-by-step onboarding guide that:\n1. Welcomes the user to Tampa Devs\n2. Identifies which profile setup steps they still need to complete\n3. Recommends featured groups to follow based on their interests\n4. Suggests upcoming events to attend\n5. Explains how badges and XP work\n6. Encourages community participation`,
        },
      },
    ];
  },
});

/**
 * group_setup_guide - Guide for setting up a group
 */
definePrompt({
  name: 'group_setup_guide',
  description: 'Generate a setup guide for configuring a newly created or claimed group',
  arguments: [
    {
      name: 'group_id',
      description: 'The group ID to generate the setup guide for',
      required: true,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, args.group_id),
    });

    if (!group) {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Could not find a group with ID "${args.group_id}". Please check the group ID and try again.`,
          },
        },
      ];
    }

    // Check what's already set up
    const hasDescription = !!group.description;
    const hasPhoto = !!group.photoUrl;
    const hasWebsite = !!group.website;
    const hasTags = !!group.tags;
    const hasSocialLinks = !!group.socialLinks;

    // Count existing events, badges, members
    const [eventCountResult, badgeCountResult, memberCountResult] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(events).where(eq(events.groupId, group.id)),
      db.select({ count: sql<number>`COUNT(*)` }).from(badges).where(eq(badges.groupId, group.id)),
      db.select({ count: sql<number>`COUNT(*)` }).from(groupMembers).where(eq(groupMembers.groupId, group.id)),
    ]);

    const setupStatus = {
      description: hasDescription,
      photo: hasPhoto,
      website: hasWebsite,
      tags: hasTags,
      socialLinks: hasSocialLinks,
      displayOnSite: group.displayOnSite,
      isFeatured: group.isFeatured,
      events: eventCountResult[0]?.count ?? 0,
      badges: badgeCountResult[0]?.count ?? 0,
      members: memberCountResult[0]?.count ?? 0,
      maxBadges: group.maxBadges,
      maxBadgePoints: group.maxBadgePoints,
    };

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a group setup guide for the "${group.name}" group on the Tampa Devs platform.\n\nCurrent Group Status:\n- Name: ${group.name}\n- URL slug: ${group.urlname}\n- Platform: ${group.platform}\n- Setup completion: ${JSON.stringify(setupStatus, null, 2)}\n\nPlease provide a comprehensive setup guide that:\n1. Identifies which setup steps are complete and which remain\n2. Guides through completing the group profile (description, photo, website, tags, social links)\n3. Explains how to create and manage events\n4. Describes the badge system and how to create group-specific badges (limit: ${group.maxBadges} badges, max ${group.maxBadgePoints} points each)\n5. Explains member roles (owner, manager, volunteer, member) and when to use each\n6. Recommends best practices for growing the group on the platform\n7. Explains how to get the group featured on the site`,
        },
      },
    ];
  },
});

/**
 * badge_strategy - Suggest badge/achievement strategies for a group
 */
definePrompt({
  name: 'badge_strategy',
  description: 'Suggest a badge and achievement strategy for a specific group',
  arguments: [
    {
      name: 'group_slug',
      description: 'Group slug to create badge strategy for',
      required: true,
    },
  ],
  handler: async (args: Record<string, string>, ctx: ToolContext): Promise<PromptMessage[]> => {
    const db = createDatabase(ctx.env.DB);
    const group = await findGroupBySlug(ctx, args.group_slug);

    if (!group) {
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Could not find a group with slug "${args.group_slug}". Please check the group slug and try again.`,
          },
        },
      ];
    }

    // Get existing badges for this group
    const existingBadges = await db
      .select({
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

    // Get platform-level achievements for context
    const platformAchievements = await db
      .select({
        name: achievements.name,
        description: achievements.description,
        icon: achievements.icon,
        targetValue: achievements.targetValue,
        points: achievements.points,
        eventType: achievements.eventType,
      })
      .from(achievements)
      .orderBy(achievements.sortOrder)
      .limit(20);

    // Get recent event types/topics for the group
    const recentGroupEvents = await db
      .select({
        title: events.title,
        eventType: events.eventType,
        rsvpCount: events.rsvpCount,
      })
      .from(events)
      .where(eq(events.groupId, group.id))
      .orderBy(desc(events.startTime))
      .limit(15);

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Suggest a badge and achievement strategy for the "${group.name}" group.\n\nGroup Info:\n- Name: ${group.name}\n- Description: ${group.description || 'N/A'}\n- Badge limits: max ${group.maxBadges} badges, max ${group.maxBadgePoints} XP points per badge\n\nExisting Group Badges (${existingBadges.length}/${group.maxBadges}):\n${JSON.stringify(existingBadges, null, 2)}\n\nPlatform-Level Achievements (for reference):\n${JSON.stringify(platformAchievements, null, 2)}\n\nRecent Group Events (for understanding the group's focus):\n${JSON.stringify(recentGroupEvents, null, 2)}\n\nPlease provide:\n1. Analysis of the current badge setup (gaps, opportunities)\n2. Suggested new badges that align with the group's activities and theme\n3. A recommended point value strategy (how to distribute points across ${group.maxBadges} badge slots with max ${group.maxBadgePoints} points each)\n4. Ideas for badge progression paths (beginner -> intermediate -> advanced)\n5. Strategies for using badges to drive engagement (event attendance, community participation)\n6. Creative badge ideas that complement the platform-level achievements`,
        },
      },
    ];
  },
});
