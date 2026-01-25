import { z } from 'zod';
import { Group, GroupSchema } from './Group.js';
import { Venue, VenueSchema } from './Venue.js';
import { Photo, PhotoSchema } from './Photo.js';

/**
 * Event status enum
 */
export enum EventStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  DRAFT = 'DRAFT',
}

/**
 * Event type enum
 */
export enum EventType {
  PHYSICAL = 'PHYSICAL',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID',
}

/**
 * Zod schema for event data
 * Core fields common across event providers
 */
export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dateTime: z.string().datetime({ offset: true }), // ISO 8601 format with timezone support
  duration: z.string().optional(), // ISO 8601 duration format (e.g., "PT2H30M")
  eventUrl: z.string().url(),
  status: z.nativeEnum(EventStatus).default(EventStatus.ACTIVE),
  eventType: z.nativeEnum(EventType).optional(),
  rsvpCount: z.number().int().nonnegative().default(0),
  venues: z.array(VenueSchema).default([]),
  photo: PhotoSchema.optional(),
  group: GroupSchema, // Every event belongs to a group
  // Provider-specific data can be stored here
  extras: z.record(z.unknown()).optional(),
}).strict();

export type EventData = z.infer<typeof EventSchema>;

/**
 * Event model
 * Represents a scheduled event with location, time, and organizer information
 */
export class Event {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly dateTime: Date;
  readonly duration?: string;
  readonly eventUrl: string;
  readonly status: EventStatus;
  readonly eventType?: EventType;
  readonly rsvpCount: number;
  readonly venues: Venue[];
  readonly photo?: Photo;
  readonly group: Group;
  readonly extras?: Record<string, unknown>;

  constructor(data: EventData) {
    const validated = EventSchema.parse(data);
    this.id = validated.id;
    this.title = validated.title;
    this.description = validated.description;
    this.dateTime = new Date(validated.dateTime);
    this.duration = validated.duration;
    this.eventUrl = validated.eventUrl;
    this.status = validated.status;
    this.eventType = validated.eventType;
    this.rsvpCount = validated.rsvpCount;
    this.venues = validated.venues.map(v => new Venue(v));
    this.photo = validated.photo ? new Photo(validated.photo) : undefined;
    this.group = new Group(validated.group);
    this.extras = validated.extras;
  }

  /**
   * Get the primary venue for this event
   * Returns the first venue in the array, or null if no venues
   */
  get venue(): Venue | null {
    return this.venues[0] ?? null;
  }

  /**
   * Check if this is an online event
   */
  get isOnline(): boolean {
    return this.venue?.isOnline ?? false;
  }

  /**
   * Check if this event has ended
   * Considers an event ended if it's more than 2 hours past its start time
   */
  hasEnded(bufferHours: number = 2): boolean {
    const now = new Date();
    const endTime = new Date(this.dateTime.getTime() + bufferHours * 60 * 60 * 1000);
    return now > endTime;
  }

  /**
   * Check if this event is active
   */
  get isActive(): boolean {
    return this.status === EventStatus.ACTIVE;
  }

  /**
   * Check if this event is cancelled
   */
  get isCancelled(): boolean {
    return this.status === EventStatus.CANCELLED;
  }

  /**
   * Get formatted address for this event
   * Returns null for online events or events without a venue
   */
  get address(): string | null {
    return this.venue?.formattedAddress ?? null;
  }

  /**
   * Get Google Maps URL for this event's venue
   */
  get googleMapsUrl(): string | null {
    return this.venue?.googleMapsUrl ?? null;
  }

  /**
   * Get formatted address as HTML-safe string
   */
  get addressHTML(): string {
    return this.venue?.formattedAddressHTML ?? '';
  }

  /**
   * Get the photo URL for this event
   * Falls back to the group photo if no event photo is available
   */
  get photoUrl(): string | null {
    return this.photo?.url ?? this.group.photoUrl;
  }

  /**
   * Check if this event has a photo
   */
  get hasPhoto(): boolean {
    return this.photo !== undefined;
  }

  /**
   * Get event duration in milliseconds
   * Returns 0 if duration is not set or invalid
   */
  get durationMs(): number {
    if (!this.duration) return 0;

    // Parse ISO 8601 duration format (e.g., "PT2H30M")
    const match = this.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  }

  /**
   * Get event end time
   * Returns null if duration is not set
   */
  get endTime(): Date | null {
    if (!this.duration) return null;
    return new Date(this.dateTime.getTime() + this.durationMs);
  }

  /**
   * Check if event is happening within the specified time window
   * @param hours Number of hours from now
   */
  isWithinHours(hours: number): boolean {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return this.dateTime >= now && this.dateTime <= windowEnd;
  }

  /**
   * Check if event is happening within the specified number of days
   * @param days Number of days from now
   */
  isWithinDays(days: number): boolean {
    return this.isWithinHours(days * 24);
  }

  /**
   * Serialize to JSON
   * Returns a plain object suitable for JSON.stringify
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      ...(this.description && { description: this.description }),
      dateTime: this.dateTime.toISOString(),
      ...(this.duration && { duration: this.duration }),
      eventUrl: this.eventUrl,
      status: this.status,
      ...(this.eventType && { eventType: this.eventType }),
      rsvpCount: this.rsvpCount,
      venues: this.venues.map(v => v.toJSON()),
      ...(this.photo && { photo: this.photo.toJSON() }),
      group: this.group.toJSON(),
      ...(this.extras && { extras: this.extras }),
      // Include computed properties for convenience
      address: this.address,
      googleMapsUrl: this.googleMapsUrl,
      photoUrl: this.photoUrl,
      isOnline: this.isOnline,
    };
  }

}
