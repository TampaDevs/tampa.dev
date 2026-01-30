/**
 * Types matching the Events API response structure
 *
 * NOTE: API response types are now auto-generated from the OpenAPI spec.
 * See api-types.generated.ts for the canonical types.
 *
 * These manually-maintained types remain for:
 * - Backwards compatibility during migration
 * - UI-specific types like LocalGroupCompat (transformations of API types)
 *
 * Run `npm run generate:types` to update generated types after API changes.
 */

export interface Photo {
  id: string;
  baseUrl: string;
}

export interface Venue {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
}

export interface Group {
  id: string;
  name: string;
  urlname: string;
  link: string;
  memberCount: number;
  photo?: Photo;
}

export type EventStatus = "ACTIVE" | "CANCELLED" | "DRAFT";
export type EventType = "PHYSICAL" | "ONLINE" | "HYBRID";
export type EventSource = "meetup" | "eventbrite" | "luma";

export interface Event {
  id: string;
  title: string;
  description?: string;
  dateTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  duration?: string; // ISO 8601 duration
  eventUrl: string;
  status: EventStatus;
  eventType?: EventType;
  rsvpCount: number;
  venues: Venue[];
  photo?: Photo;
  group: Group;
  // Event source (meetup, eventbrite, luma) - defaults to meetup for backwards compatibility
  source?: EventSource;
  // Computed fields from API
  address?: string;
  googleMapsUrl?: string;
  appleMapsUrl?: string;
  photoUrl?: string;
  isOnline: boolean;
}

export interface EventsResponse {
  events: Event[];
}

/**
 * LocalGroup-compatible interface for components
 * This is used by GroupCard, EventCard, etc.
 */
export interface LocalGroupCompat {
  slug: string;
  name: string;
  description: string;
  website: string;
  logo: string;
  meetupUrlname?: string;
  socialLinks?: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  };
  tags: string[];
  featured?: boolean;
}

/**
 * Find a group by its urlname from a list of groups
 */
export function findGroupByUrlname(
  groups: LocalGroupCompat[],
  urlname: string
): LocalGroupCompat | undefined {
  const normalizedUrlname = urlname.toLowerCase();
  return groups.find(
    (g) =>
      g.slug.toLowerCase() === normalizedUrlname ||
      g.meetupUrlname?.toLowerCase() === normalizedUrlname
  );
}
