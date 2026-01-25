import { z } from 'zod';
import { Event, EventStatus, EventType } from '../Event.js';
import { Group } from '../Group.js';
import { Venue } from '../Venue.js';
import { Photo } from '../Photo.js';

/**
 * Zod schemas for Meetup API responses
 * These validate the raw data structure from Meetup's GraphQL API
 */

const MeetupPhotoSchema = z.object({
  id: z.string(),
  baseUrl: z.string(),
});

const MeetupVenueSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

const MeetupGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  urlname: z.string(),
  link: z.string(),
  keyGroupPhoto: MeetupPhotoSchema.nullish(), // Can be null or undefined
  memberships: z.object({
    totalCount: z.number(),
  }),
});

const MeetupEventNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dateTime: z.string(),
  duration: z.string().optional(),
  eventUrl: z.string(),
  status: z.string().optional(),
  eventType: z.string().optional(),
  rsvps: z.object({
    totalCount: z.number(),
  }).optional(),
  venues: z.array(MeetupVenueSchema).optional(),
  featuredEventPhoto: MeetupPhotoSchema.nullish(), // Can be null or undefined
});

const MeetupEventEdgeSchema = z.object({
  node: MeetupEventNodeSchema,
});

const MeetupGroupDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  urlname: z.string(),
  link: z.string(),
  keyGroupPhoto: MeetupPhotoSchema.nullish(), // Can be null or undefined
  memberships: z.object({
    totalCount: z.number(),
  }),
  events: z.object({
    edges: z.array(MeetupEventEdgeSchema),
    pageInfo: z.object({
      endCursor: z.string().nullish(), // Can be null when no more pages
      hasNextPage: z.boolean(),
    }),
    totalCount: z.number(),
  }),
});

// Record of group data - entire groups can be null if they don't exist or are private
export const MeetupDataSchema = z.record(MeetupGroupDataSchema.nullish());

export type MeetupPhoto = z.infer<typeof MeetupPhotoSchema>;
export type MeetupVenue = z.infer<typeof MeetupVenueSchema>;
export type MeetupGroup = z.infer<typeof MeetupGroupSchema>;
export type MeetupEventNode = z.infer<typeof MeetupEventNodeSchema>;
export type MeetupGroupData = z.infer<typeof MeetupGroupDataSchema>;
export type MeetupData = z.infer<typeof MeetupDataSchema>;

/**
 * MeetupTransformer
 * Transforms raw Meetup API data into our core models
 */
export class MeetupTransformer {
  /**
   * Validate and parse raw Meetup data
   */
  static validate(rawData: unknown): MeetupData {
    return MeetupDataSchema.parse(rawData);
  }

  /**
   * Transform Meetup photo to Photo model
   */
  static transformPhoto(meetupPhoto: MeetupPhoto): Photo {
    return new Photo({
      id: meetupPhoto.id,
      baseUrl: meetupPhoto.baseUrl,
    });
  }

  /**
   * Transform Meetup venue to Venue model
   */
  static transformVenue(meetupVenue: MeetupVenue): Venue {
    return new Venue({
      name: meetupVenue.name,
      address: meetupVenue.address,
      city: meetupVenue.city,
      state: meetupVenue.state,
      postalCode: meetupVenue.postalCode,
      lat: meetupVenue.lat,
      lon: meetupVenue.lon,
    });
  }

  /**
   * Transform Meetup group to Group model
   */
  static transformGroup(meetupGroup: MeetupGroup): Group {
    return new Group({
      id: meetupGroup.id,
      name: meetupGroup.name,
      urlname: meetupGroup.urlname,
      link: meetupGroup.link,
      memberCount: meetupGroup.memberships.totalCount,
      photo: meetupGroup.keyGroupPhoto
        ? this.transformPhoto(meetupGroup.keyGroupPhoto)
        : undefined,
      extras: {
        provider: 'meetup',
      },
    });
  }

  /**
   * Transform Meetup event status to EventStatus enum
   */
  static transformEventStatus(status?: string): EventStatus {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return EventStatus.ACTIVE;
      case 'CANCELLED':
        return EventStatus.CANCELLED;
      case 'DRAFT':
        return EventStatus.DRAFT;
      default:
        return EventStatus.ACTIVE;
    }
  }

  /**
   * Transform Meetup event type to EventType enum
   */
  static transformEventType(type?: string): EventType | undefined {
    switch (type?.toUpperCase()) {
      case 'PHYSICAL':
        return EventType.PHYSICAL;
      case 'ONLINE':
        return EventType.ONLINE;
      case 'HYBRID':
        return EventType.HYBRID;
      default:
        return undefined;
    }
  }

  /**
   * Transform Meetup event node to Event model
   */
  static transformEvent(eventNode: MeetupEventNode, group: Group): Event {
    return new Event({
      id: eventNode.id,
      title: eventNode.title,
      description: eventNode.description,
      dateTime: eventNode.dateTime,
      duration: eventNode.duration,
      eventUrl: eventNode.eventUrl,
      status: this.transformEventStatus(eventNode.status),
      eventType: this.transformEventType(eventNode.eventType),
      rsvpCount: eventNode.rsvps?.totalCount ?? 0,
      venues: (eventNode.venues ?? []).map(v => this.transformVenue(v)),
      photo: eventNode.featuredEventPhoto
        ? this.transformPhoto(eventNode.featuredEventPhoto)
        : undefined,
      group,
      extras: {
        provider: 'meetup',
      },
    });
  }

  /**
   * Transform entire Meetup data structure to array of Events
   */
  static transformAll(meetupData: MeetupData): Event[] {
    const events: Event[] = [];

    for (const [_groupKey, groupData] of Object.entries(meetupData)) {
      // Skip null groups (private, deleted, or inaccessible)
      if (!groupData) continue;

      // TypeScript doesn't narrow Object.entries() types, so assert non-null after check
      const validGroupData = groupData as MeetupGroupData;

      // Transform group once
      const group = this.transformGroup(validGroupData);

      // Transform all events for this group
      for (const edge of validGroupData.events.edges) {
        const event = this.transformEvent(edge.node, group);
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Transform and group events by their group
   * Returns a Map of Group -> Event[]
   */
  static transformByGroup(meetupData: MeetupData): Map<Group, Event[]> {
    const grouped = new Map<Group, Event[]>();

    for (const [_groupKey, groupData] of Object.entries(meetupData)) {
      // Skip null groups (private, deleted, or inaccessible)
      if (!groupData) continue;

      // TypeScript doesn't narrow Object.entries() types, so assert non-null after check
      const validGroupData = groupData as MeetupGroupData;

      const group = this.transformGroup(validGroupData);
      const events = validGroupData.events.edges.map(edge =>
        this.transformEvent(edge.node, group)
      );
      grouped.set(group, events);
    }

    return grouped;
  }
}
