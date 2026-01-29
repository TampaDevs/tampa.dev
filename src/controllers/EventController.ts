import type { Context } from 'hono';
import type { Env } from '../app.js';
import * as util from '../../lib/utils.js';
import { Event, EventLoader, type DbEventWithRelations } from '../../models/index.js';
import { createDatabase } from '../db/index.js';
import { events, groups, venues } from '../db/schema.js';
import { eq, gte, and, desc } from 'drizzle-orm';

/**
 * EventController
 * Handles all event-related business logic
 */
export class EventController {
  /**
   * Load events from D1 database with relations
   */
  static async loadFromDatabase(c: Context<{ Bindings: Env }>): Promise<Event[]> {
    const db = createDatabase(c.env.DB);

    // Query active events with their groups and venues
    // Only get future events (start time >= now - 2 hours buffer for ongoing events)
    const bufferTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const dbEvents = await db.query.events.findMany({
      where: and(
        eq(events.status, 'active'),
        gte(events.startTime, bufferTime)
      ),
      orderBy: [desc(events.startTime)],
      limit: 200,
    });

    if (dbEvents.length === 0) {
      return [];
    }

    // Get unique group IDs and venue IDs
    const groupIds = [...new Set(dbEvents.map(e => e.groupId))];
    const venueIds = [...new Set(dbEvents.filter(e => e.venueId).map(e => e.venueId!))];

    // Batch load groups
    const groupMap = new Map<string, typeof groups.$inferSelect>();
    if (groupIds.length > 0) {
      const groupResults = await db.query.groups.findMany({
        where: and(
          eq(groups.isActive, true),
        ),
      });
      for (const group of groupResults) {
        groupMap.set(group.id, group);
      }
    }

    // Batch load venues
    const venueMap = new Map<string, typeof venues.$inferSelect>();
    if (venueIds.length > 0) {
      const venueResults = await db.query.venues.findMany();
      for (const venue of venueResults) {
        venueMap.set(venue.id, venue);
      }
    }

    // Combine into DbEventWithRelations
    const records: DbEventWithRelations[] = [];
    for (const event of dbEvents) {
      const group = groupMap.get(event.groupId);
      if (!group) continue; // Skip events without active groups

      const venue = event.venueId ? venueMap.get(event.venueId) || null : null;

      records.push({
        event: event as any,
        group: group as any,
        venue: venue as any,
      });
    }

    // Transform to Event models
    return EventLoader.fromDatabaseRecords(records);
  }

  /**
   * Parse query parameters
   */
  static getQueryParams(c: Context): Record<string, any> {
    const url = new URL(c.req.url);
    return util.parseQueryParams(url);
  }

  /**
   * Load and filter events based on query parameters
   * Uses D1 database as the primary data source
   */
  static async loadEvents(
    c: Context<{ Bindings: Env }>,
    params?: Record<string, any>
  ): Promise<Event[]> {
    const queryParams = params || this.getQueryParams(c);

    if (!c.env.DB) {
      throw new Error('Database not available');
    }

    const dbEvents = await this.loadFromDatabase(c);
    const filterOptions = util.paramsToFilterOptions(queryParams);
    let filtered = EventLoader.filter(dbEvents, filterOptions);
    filtered = EventLoader.sort(filtered, { sortBy: 'dateTime', order: 'asc' });

    // Handle noempty filter
    if (queryParams.noempty) {
      filtered = EventLoader.excludeEmptyGroups(filtered);
    }

    return filtered;
  }

  /**
   * Get all events
   */
  static async getAllEvents(c: Context<{ Bindings: Env }>): Promise<Event[]> {
    const events = await this.loadEvents(c);
    return events;
  }

  /**
   * Get next event per group
   */
  static async getNextEvents(c: Context<{ Bindings: Env }>): Promise<Event[]> {
    const events = await this.loadEvents(c);
    return util.getSortedNextEvents(events);
  }

  /**
   * Generate ETag for caching
   */
  static generateETag(data: any): string {
    return util.cyrb53(JSON.stringify(data));
  }
}
