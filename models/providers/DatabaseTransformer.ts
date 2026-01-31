/**
 * DatabaseTransformer
 *
 * Transforms D1 database records into Event models.
 * Used for loading events from the Cloudflare D1 SQLite database.
 */

import { Event, EventStatus, EventType, type EventData } from '../Event.js';
import { ONLINE_EVENT_VENUE_NAME, type VenueData } from '../Venue.js';
import type { GroupData } from '../Group.js';
import type { PhotoData } from '../Photo.js';

/**
 * Database record types (matching D1 schema)
 */
export interface DbEvent {
  id: string;
  platform: string;
  platformId: string;
  groupId: string;
  venueId: string | null;
  title: string;
  description: string | null;
  eventUrl: string;
  photoUrl: string | null;
  startTime: string; // ISO 8601
  endTime: string | null;
  timezone: string;
  duration: string | null; // ISO 8601 duration (PT2H30M)
  status: string;
  eventType: string | null;
  rsvpCount: number | null;
  maxAttendees: number | null;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbGroup {
  id: string;
  platform: string;
  platformId: string;
  urlname: string;
  name: string;
  description: string | null;
  link: string | null;
  photoUrl: string | null;
  memberCount: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbVenue {
  id: string;
  platform: string;
  platformVenueId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event record with joined group and venue
 */
export interface DbEventWithRelations {
  event: DbEvent;
  group: DbGroup;
  venue: DbVenue | null;
}

export class DatabaseTransformer {
  /**
   * Transform a database event record (with relations) into an Event model
   */
  static transformEvent(record: DbEventWithRelations): Event {
    const { event, group, venue } = record;

    // Transform venue
    const venues: VenueData[] = [];
    if (venue) {
      venues.push(this.transformVenue(venue));
    } else if (event.eventType === 'online') {
      // Add an online venue if no venue but event is online
      venues.push({ name: ONLINE_EVENT_VENUE_NAME });
    }

    // Transform group
    const groupData = this.transformGroup(group);

    // Create photo if photoUrl exists
    let photo: PhotoData | undefined;
    if (event.photoUrl) {
      photo = this.parsePhotoUrl(event.photoUrl);
    }

    // Map status
    const status = this.mapStatus(event.status);

    // Map event type
    const eventType = this.mapEventType(event.eventType);

    // Duration is already stored as ISO 8601 format in D1
    const duration = event.duration ?? undefined;

    // Build EventData
    const eventData: EventData = {
      id: event.platformId,
      title: event.title,
      description: event.description ?? undefined,
      dateTime: event.startTime,
      duration,
      eventUrl: event.eventUrl,
      status,
      eventType,
      rsvpCount: event.rsvpCount ?? 0,
      venues,
      photo,
      group: groupData,
      source: group.platform,
    };

    return new Event(eventData);
  }

  /**
   * Transform multiple database records into Event models
   * Skips records that fail validation and logs errors
   */
  static transformAll(records: DbEventWithRelations[]): Event[] {
    const events: Event[] = [];
    for (const record of records) {
      try {
        events.push(this.transformEvent(record));
      } catch (error) {
        console.error(`[DatabaseTransformer] Failed to transform event ${record.event.platformId}:`, {
          eventUrl: record.event.eventUrl,
          groupLink: record.group.link,
          error,
        });
        // Skip this event and continue with others
      }
    }
    return events;
  }

  /**
   * Transform a database group record into GroupData
   */
  static transformGroup(group: DbGroup): GroupData {
    let photo: PhotoData | undefined;
    if (group.photoUrl) {
      photo = this.parsePhotoUrl(group.photoUrl);
    }

    return {
      id: group.platformId,
      name: group.name,
      urlname: group.urlname,
      link: group.link || `https://${group.platform}.com/${group.platformId}`,
      memberCount: group.memberCount ?? 0,
      photo,
    };
  }

  /**
   * Transform a database venue record into VenueData
   */
  static transformVenue(venue: DbVenue): VenueData {
    if (venue.isOnline) {
      return { name: ONLINE_EVENT_VENUE_NAME };
    }

    return {
      name: venue.name,
      address: venue.address ?? undefined,
      city: venue.city ?? undefined,
      state: venue.state ?? undefined,
      postalCode: venue.postalCode ?? undefined,
      lat: venue.latitude ?? undefined,
      lon: venue.longitude ?? undefined,
    };
  }

  /**
   * Map database status to EventStatus enum
   */
  private static mapStatus(status: string): EventStatus {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'published':
        return EventStatus.ACTIVE;
      case 'cancelled':
      case 'canceled':
        return EventStatus.CANCELLED;
      case 'draft':
        return EventStatus.DRAFT;
      default:
        return EventStatus.ACTIVE;
    }
  }

  /**
   * Map database event type to EventType enum
   */
  private static mapEventType(eventType: string | null): EventType | undefined {
    if (!eventType) return undefined;

    switch (eventType.toLowerCase()) {
      case 'physical':
      case 'in_person':
      case 'in-person':
      case 'offline':
        return EventType.PHYSICAL;
      case 'online':
      case 'virtual':
        return EventType.ONLINE;
      case 'hybrid':
        return EventType.HYBRID;
      default:
        return undefined;
    }
  }

  /**
   * Convert duration in minutes to ISO 8601 duration format
   */
  private static minutesToIsoDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let duration = 'PT';
    if (hours > 0) duration += `${hours}H`;
    if (mins > 0) duration += `${mins}M`;
    if (duration === 'PT') duration += '0M';

    return duration;
  }

  /**
   * Parse a photo URL into PhotoData
   * Uses Meetup-style baseUrl+id for Meetup, directUrl for others
   */
  private static parsePhotoUrl(url: string): PhotoData {
    // Try to parse Meetup-style photo URLs
    // Format: https://secure.meetupstatic.com/photos/event/ID/SIZE.FORMAT
    const meetupMatch = url.match(/^(https:\/\/secure\.meetupstatic\.com\/photos\/event\/)(\d+)/);
    if (meetupMatch) {
      return {
        id: meetupMatch[2],
        baseUrl: meetupMatch[1],
      };
    }

    // For other URLs (Eventbrite, Luma, etc.), use directUrl
    return {
      id: url,
      directUrl: url,
    };
  }
}
