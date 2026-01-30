/**
 * Sync Service
 *
 * Handles synchronization of events from external providers to D1 database.
 * Implements ETL: Extract (from providers) → Transform (to canonical) → Load (to D1)
 */

import { eq, and, inArray, gte, sql } from 'drizzle-orm';
import type { Database } from '../db';
import {
  groups,
  events,
  venues,
  syncLogs,
  type Group,
  type NewGroup,
  type NewEvent,
  type NewVenue,
  type NewSyncLog,
  EventPlatform,
  SyncStatus,
} from '../db/schema';
import type { ProviderRegistry } from '../providers/registry';
import type { Env } from '../../types/worker';
import type { EventBus } from '../lib/event-bus';
import type {
  CanonicalEvent,
  CanonicalGroup,
  CanonicalVenue,
  ProviderFetchResult,
} from '../providers/types';

// ============== Types ==============

export interface SyncResult {
  success: boolean;
  groupId: string;
  groupUrlname: string;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  error?: string;
  durationMs: number;
}

export interface SyncAllResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: SyncResult[];
  durationMs: number;
}

export interface SyncOptions {
  /** Maximum concurrent syncs */
  concurrency?: number;
  /** Only sync specific group IDs */
  groupIds?: string[];
  /** Force sync even if recently synced */
  force?: boolean;
}

// ============== Sync Service ==============

export class SyncService {
  private eventBus?: EventBus;

  constructor(
    private db: Database,
    private registry: ProviderRegistry,
    private env: Env
  ) {}

  /** Attach an EventBus to publish domain events during sync */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Sync a single group by its database ID
   */
  async syncGroup(groupId: string): Promise<SyncResult> {
    const startTime = Date.now();

    // Get group from database
    const group = await this.db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) {
      return {
        success: false,
        groupId,
        groupUrlname: 'unknown',
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        error: `Group not found: ${groupId}`,
        durationMs: Date.now() - startTime,
      };
    }

    return this.syncGroupInternal(group, startTime);
  }

  /**
   * Sync a group by its urlname
   */
  async syncGroupByUrlname(urlname: string): Promise<SyncResult> {
    const startTime = Date.now();

    const group = await this.db.query.groups.findFirst({
      where: eq(groups.urlname, urlname),
    });

    if (!group) {
      return {
        success: false,
        groupId: 'unknown',
        groupUrlname: urlname,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        error: `Group not found: ${urlname}`,
        durationMs: Date.now() - startTime,
      };
    }

    return this.syncGroupInternal(group, startTime);
  }

  /**
   * Sync all active groups
   */
  async syncAllGroups(options: SyncOptions = {}): Promise<SyncAllResult> {
    const startTime = Date.now();
    const concurrency = options.concurrency || 5;

    // Get active groups
    let groupsToSync: Group[];
    if (options.groupIds && options.groupIds.length > 0) {
      groupsToSync = await this.db.query.groups.findMany({
        where: and(
          eq(groups.isActive, true),
          inArray(groups.id, options.groupIds)
        ),
      });
    } else {
      groupsToSync = await this.db.query.groups.findMany({
        where: eq(groups.isActive, true),
      });
    }

    const results: SyncResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process in batches with concurrency limit
    for (let i = 0; i < groupsToSync.length; i += concurrency) {
      const batch = groupsToSync.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map((group) => this.syncGroupInternal(group, Date.now()))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            succeeded++;
          } else {
            failed++;
          }
        } else {
          failed++;
          results.push({
            success: false,
            groupId: 'unknown',
            groupUrlname: 'unknown',
            eventsCreated: 0,
            eventsUpdated: 0,
            eventsDeleted: 0,
            error: result.reason?.message || 'Unknown error',
            durationMs: 0,
          });
        }
      }
    }

    const syncAllResult: SyncAllResult = {
      success: failed === 0,
      total: groupsToSync.length,
      succeeded,
      failed,
      results,
      durationMs: Date.now() - startTime,
    };

    // Publish sync.completed event
    if (this.eventBus) {
      try {
        await this.eventBus.publish({
          type: 'sync.completed',
          payload: {
            total: syncAllResult.total,
            succeeded: syncAllResult.succeeded,
            failed: syncAllResult.failed,
            durationMs: syncAllResult.durationMs,
          },
          metadata: { source: 'sync-service' },
        });
      } catch (err) {
        console.error('Failed to publish sync.completed event:', err);
      }
    }

    return syncAllResult;
  }

  /**
   * Internal sync implementation for a single group
   */
  private async syncGroupInternal(group: Group, startTime: number): Promise<SyncResult> {
    const logId = crypto.randomUUID();

    // Create sync log entry
    await this.db.insert(syncLogs).values({
      id: logId,
      platform: group.platform,
      groupId: group.id,
      startedAt: new Date().toISOString(),
      status: SyncStatus.RUNNING,
    });

    try {
      // Get the provider adapter
      const adapter = this.registry.getAdapter(group.platform as any);
      if (!adapter) {
        throw new Error(`No adapter for platform: ${group.platform}`);
      }

      // Fetch events from provider using platformId
      const fetchResult = await this.registry.fetchEvents(
        group.platform as any,
        group.platformId,
        this.env,
        { maxEvents: 50 }
      );

      if (!fetchResult.success) {
        throw new Error(fetchResult.error || 'Fetch failed');
      }

      // Update group metadata if returned
      if (fetchResult.group) {
        await this.updateGroupMetadata(group.id, fetchResult.group);
      }

      // Upsert events
      const eventResults = await this.upsertEvents(
        group.id,
        group.platform,
        fetchResult.events || []
      );

      // Mark events not in response as potentially ended/cancelled
      const deletedCount = await this.markMissingEvents(
        group.id,
        fetchResult.events || []
      );

      // Update sync log - success
      await this.db
        .update(syncLogs)
        .set({
          status: SyncStatus.SUCCESS,
          completedAt: new Date().toISOString(),
          eventsCreated: eventResults.created,
          eventsUpdated: eventResults.updated,
          eventsDeleted: deletedCount,
        })
        .where(eq(syncLogs.id, logId));

      // Update group sync timestamp
      await this.db
        .update(groups)
        .set({
          lastSyncAt: new Date().toISOString(),
          syncError: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(groups.id, group.id));

      // Publish domain events for newly created events
      if (this.eventBus && eventResults.created > 0) {
        try {
          await this.eventBus.publish({
            type: 'events.synced',
            payload: {
              groupId: group.id,
              groupUrlname: group.urlname,
              eventsCreated: eventResults.created,
              eventsUpdated: eventResults.updated,
              eventsDeleted: deletedCount,
            },
            metadata: { source: 'sync-service' },
          });
        } catch (err) {
          console.error('Failed to publish events.synced event:', err);
        }
      }

      return {
        success: true,
        groupId: group.id,
        groupUrlname: group.urlname,
        eventsCreated: eventResults.created,
        eventsUpdated: eventResults.updated,
        eventsDeleted: deletedCount,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update sync log - failed
      await this.db
        .update(syncLogs)
        .set({
          status: SyncStatus.FAILED,
          completedAt: new Date().toISOString(),
          error: errorMessage,
        })
        .where(eq(syncLogs.id, logId));

      // Update group with error
      await this.db
        .update(groups)
        .set({
          syncError: errorMessage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(groups.id, group.id));

      return {
        success: false,
        groupId: group.id,
        groupUrlname: group.urlname,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Update group metadata from provider response
   */
  private async updateGroupMetadata(
    groupId: string,
    canonicalGroup: CanonicalGroup
  ): Promise<void> {
    await this.db
      .update(groups)
      .set({
        name: canonicalGroup.name,
        description: canonicalGroup.description,
        link: canonicalGroup.link,
        memberCount: canonicalGroup.memberCount,
        photoUrl: canonicalGroup.photoUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(groups.id, groupId));
  }

  /**
   * Upsert events from canonical format to D1
   */
  private async upsertEvents(
    groupId: string,
    platform: string,
    canonicalEvents: CanonicalEvent[]
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const event of canonicalEvents) {
      // Upsert venue if present
      let venueId: string | null = null;
      if (event.venue) {
        venueId = await this.upsertVenue(platform, event.venue);
      }

      // Check if event exists
      const existing = await this.db.query.events.findFirst({
        where: and(
          eq(events.platform, platform),
          eq(events.platformId, event.platformId)
        ),
      });

      const now = new Date().toISOString();

      if (existing) {
        // Update existing event
        await this.db
          .update(events)
          .set({
            title: event.title,
            description: event.description,
            eventUrl: event.eventUrl,
            photoUrl: event.photoUrl,
            startTime: event.startTime,
            endTime: event.endTime,
            timezone: event.timezone,
            duration: event.duration,
            status: event.status,
            eventType: event.eventType,
            rsvpCount: event.rsvpCount,
            maxAttendees: event.maxAttendees,
            venueId,
            lastSyncAt: now,
            updatedAt: now,
          })
          .where(eq(events.id, existing.id));
        updated++;
      } else {
        // Insert new event
        await this.db.insert(events).values({
          id: crypto.randomUUID(),
          platform,
          platformId: event.platformId,
          groupId,
          venueId,
          title: event.title,
          description: event.description,
          eventUrl: event.eventUrl,
          photoUrl: event.photoUrl,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          duration: event.duration,
          status: event.status,
          eventType: event.eventType,
          rsvpCount: event.rsvpCount,
          maxAttendees: event.maxAttendees,
          lastSyncAt: now,
        });
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Upsert venue and return its ID
   */
  private async upsertVenue(
    platform: string,
    venue: CanonicalVenue
  ): Promise<string> {
    // Check for existing venue by platform ID
    if (venue.platformVenueId) {
      const existing = await this.db.query.venues.findFirst({
        where: and(
          eq(venues.platform, platform),
          eq(venues.platformVenueId, venue.platformVenueId)
        ),
      });
      if (existing) return existing.id;
    }

    // Check for online venue (reuse single "Online event" venue per platform)
    if (venue.isOnline) {
      const existingOnline = await this.db.query.venues.findFirst({
        where: and(
          eq(venues.platform, platform),
          eq(venues.isOnline, true)
        ),
      });
      if (existingOnline) return existingOnline.id;
    }

    // Create new venue
    const id = crypto.randomUUID();
    await this.db.insert(venues).values({
      id,
      platform,
      platformVenueId: venue.platformVenueId,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      postalCode: venue.postalCode,
      country: venue.country,
      latitude: venue.latitude,
      longitude: venue.longitude,
      isOnline: venue.isOnline,
    });

    return id;
  }

  /**
   * Mark events not in the latest fetch as potentially ended
   * (Only for future events that are no longer returned)
   */
  private async markMissingEvents(
    groupId: string,
    currentEvents: CanonicalEvent[]
  ): Promise<number> {
    const now = new Date().toISOString();
    const currentPlatformIds = currentEvents.map((e) => e.platformId);

    // Get future events for this group that aren't in the current response
    const futureEvents = await this.db.query.events.findMany({
      where: and(
        eq(events.groupId, groupId),
        eq(events.status, 'active'),
        gte(events.startTime, now)
      ),
    });

    let deletedCount = 0;
    for (const event of futureEvents) {
      if (!currentPlatformIds.includes(event.platformId)) {
        // Event is no longer in the response - mark as cancelled
        await this.db
          .update(events)
          .set({
            status: 'cancelled',
            updatedAt: now,
          })
          .where(eq(events.id, event.id));
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get recent sync logs, enriched with group name/urlname
   */
  async getSyncLogs(options: { limit?: number; groupId?: string } = {}) {
    const limit = options.limit || 50;

    const logs = options.groupId
      ? await this.db.query.syncLogs.findMany({
          where: eq(syncLogs.groupId, options.groupId),
          orderBy: (logs, { desc }) => [desc(logs.startedAt)],
          limit,
        })
      : await this.db.query.syncLogs.findMany({
          orderBy: (logs, { desc }) => [desc(logs.startedAt)],
          limit,
        });

    // Enrich with group name/urlname
    const groupIds = [...new Set(logs.filter(l => l.groupId).map(l => l.groupId!))];
    const groupResults = groupIds.length > 0
      ? await this.db.query.groups.findMany({
          where: inArray(groups.id, groupIds),
        })
      : [];
    const groupMap = new Map(groupResults.map(g => [g.id, g]));

    return logs.map(log => ({
      ...log,
      groupName: log.groupId ? groupMap.get(log.groupId)?.name ?? null : null,
      groupUrlname: log.groupId ? groupMap.get(log.groupId)?.urlname ?? null : null,
    }));
  }
}
