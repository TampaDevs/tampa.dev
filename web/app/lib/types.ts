/**
 * Types matching the Events API response structure
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
  photoUrl?: string;
  isOnline: boolean;
}

export interface EventsResponse {
  events: Event[];
}
