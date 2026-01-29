/**
 * Meetup Provider Adapter
 *
 * Fetches event data from Meetup.com via their GraphQL API
 * and transforms it to canonical format for D1 storage.
 */

import type { Env } from '../../../types/worker';
import type {
  ProviderAdapter,
  ProviderFetchResult,
  FetchOptions,
  CanonicalEvent,
  CanonicalGroup,
  CanonicalVenue,
} from '../types';
import { RateLimitError, AuthenticationError } from '../types';
import { EventPlatform, EventStatus, EventType } from '../../db/schema';
import { getAccessToken } from './auth';

const MEETUP_GQL_URL = 'https://api.meetup.com/gql-ext';

// ============== GraphQL Types ==============

interface MeetupPhoto {
  id: string;
  baseUrl: string;
}

interface MeetupVenue {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lon?: number | null;
}

interface MeetupEvent {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  duration?: string | null;
  eventUrl: string;
  eventType?: string | null;
  status: string;
  featuredEventPhoto?: MeetupPhoto | null;
  rsvps?: { totalCount: number };
  venues?: MeetupVenue[] | null;
}

interface MeetupGroup {
  id: string;
  name: string;
  urlname: string;
  link: string;
  keyGroupPhoto?: MeetupPhoto | null;
  memberships?: { totalCount: number };
  events: {
    totalCount: number;
    pageInfo?: { endCursor: string | null; hasNextPage: boolean };
    edges: Array<{ node: MeetupEvent }>;
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      code?: string;
      consumedPoints?: number;
      resetAt?: string;
    };
  }>;
}

// ============== GraphQL Query ==============

const GET_GROUP_EVENTS_QUERY = `
query($urlname: String!, $n: Int!, $after: String) {
  groupByUrlname(urlname: $urlname) {
    id
    name
    urlname
    link
    keyGroupPhoto { id baseUrl }
    memberships { totalCount }
    events(first: $n, after: $after, status: ACTIVE) {
      totalCount
      pageInfo { endCursor hasNextPage }
      edges {
        node {
          id
          title
          description
          dateTime
          duration
          eventUrl
          eventType
          status
          featuredEventPhoto { id baseUrl }
          rsvps { totalCount }
          venues {
            name
            address
            city
            state
            postalCode
            lat
            lon
          }
        }
      }
    }
  }
}`;

// ============== Transformer Functions ==============

/**
 * Transform Meetup event type to canonical event type
 */
function transformEventType(meetupEventType?: string | null): 'physical' | 'online' | 'hybrid' {
  if (!meetupEventType) return EventType.PHYSICAL;

  switch (meetupEventType.toUpperCase()) {
    case 'ONLINE':
      return EventType.ONLINE;
    case 'PHYSICAL':
      return EventType.PHYSICAL;
    default:
      return EventType.PHYSICAL;
  }
}

/**
 * Transform Meetup status to canonical status
 */
function transformStatus(meetupStatus: string): 'active' | 'cancelled' | 'draft' {
  switch (meetupStatus.toUpperCase()) {
    case 'ACTIVE':
    case 'PUBLISHED':
      return EventStatus.ACTIVE;
    case 'CANCELLED':
    case 'CANCELED':
      return EventStatus.CANCELLED;
    case 'DRAFT':
      return EventStatus.DRAFT;
    default:
      return EventStatus.ACTIVE;
  }
}

/**
 * Get photo URL from Meetup photo object
 */
function getPhotoUrl(photo?: MeetupPhoto | null): string | undefined {
  if (!photo?.baseUrl) return undefined;
  // Meetup photo URLs need dimensions appended
  return `${photo.baseUrl}676x380.webp`;
}

/**
 * Transform Meetup venue to canonical venue
 */
function transformVenue(venues?: MeetupVenue[] | null, eventType?: string | null): CanonicalVenue | undefined {
  // Check if online event
  if (transformEventType(eventType) === EventType.ONLINE) {
    return {
      name: 'Online event',
      isOnline: true,
    };
  }

  const venue = venues?.[0];
  if (!venue) return undefined;

  return {
    name: venue.name || 'TBD',
    address: venue.address || undefined,
    city: venue.city || undefined,
    state: venue.state || undefined,
    postalCode: venue.postalCode || undefined,
    latitude: venue.lat || undefined,
    longitude: venue.lon || undefined,
    isOnline: false,
  };
}

/**
 * Extract timezone from Meetup dateTime string
 * Meetup returns ISO 8601 with offset, e.g., "2024-01-15T18:00:00-05:00"
 */
function extractTimezone(dateTime: string): string {
  // Default to America/New_York for Tampa-based events
  // In a real implementation, you might want to derive this from venue location
  return 'America/New_York';
}

/**
 * Transform Meetup event to canonical event
 */
function transformEvent(event: MeetupEvent, groupPhoto?: MeetupPhoto | null): CanonicalEvent {
  return {
    platformId: event.id,
    platform: EventPlatform.MEETUP,
    title: event.title,
    description: event.description || undefined,
    eventUrl: event.eventUrl,
    photoUrl: getPhotoUrl(event.featuredEventPhoto) || getPhotoUrl(groupPhoto),
    startTime: event.dateTime,
    endTime: event.duration ? calculateEndTime(event.dateTime, event.duration) : undefined,
    timezone: extractTimezone(event.dateTime),
    duration: event.duration || undefined,
    status: transformStatus(event.status),
    eventType: transformEventType(event.eventType),
    rsvpCount: event.rsvps?.totalCount || 0,
    venue: transformVenue(event.venues, event.eventType),
  };
}

/**
 * Calculate end time from start time and ISO 8601 duration
 */
function calculateEndTime(startTime: string, duration: string): string | undefined {
  try {
    const start = new Date(startTime);

    // Parse ISO 8601 duration (e.g., "PT2H30M")
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return undefined;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);

    const end = new Date(start.getTime() + (hours * 60 + minutes) * 60 * 1000);
    return end.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Transform Meetup group to canonical group
 */
function transformGroup(group: MeetupGroup): CanonicalGroup {
  return {
    platformId: group.id,
    platform: EventPlatform.MEETUP,
    urlname: group.urlname,
    name: group.name,
    link: group.link,
    memberCount: group.memberships?.totalCount || 0,
    photoUrl: getPhotoUrl(group.keyGroupPhoto),
  };
}

// ============== Meetup Adapter ==============

export class MeetupAdapter implements ProviderAdapter {
  readonly platform = EventPlatform.MEETUP;
  readonly name = 'Meetup';

  private accessToken: string | null = null;

  isConfigured(env: Env): boolean {
    return !!(env.MEETUP_CLIENT_KEY && env.MEETUP_SIGNING_KEY && env.MEETUP_MEMBER_ID);
  }

  async initialize(env: Env): Promise<void> {
    if (!this.isConfigured(env)) {
      throw new AuthenticationError(
        'Meetup is not configured. Missing MEETUP_CLIENT_KEY, MEETUP_SIGNING_KEY, or MEETUP_MEMBER_ID.',
        this.platform
      );
    }

    try {
      this.accessToken = await getAccessToken({
        clientKey: env.MEETUP_CLIENT_KEY!,
        signingKey: env.MEETUP_SIGNING_KEY!,
        memberId: env.MEETUP_MEMBER_ID!,
      });
    } catch (error) {
      throw new AuthenticationError(
        `Failed to authenticate with Meetup: ${error instanceof Error ? error.message : String(error)}`,
        this.platform
      );
    }
  }

  async fetchEvents(groupUrlname: string, options?: FetchOptions): Promise<ProviderFetchResult> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'Meetup adapter not initialized. Call initialize() first.',
      };
    }

    try {
      const maxEvents = options?.maxEvents || 25;
      const data = await this.queryGraphQL(groupUrlname, maxEvents);

      if (!data) {
        return {
          success: false,
          error: `Group not found: ${groupUrlname}`,
        };
      }

      // Transform to canonical format
      const group = transformGroup(data);
      const events = data.events.edges.map((edge) =>
        transformEvent(edge.node, data.keyGroupPhoto)
      );

      return {
        success: true,
        group,
        events,
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: false,
          error: error.message,
          rateLimited: true,
          retryAfter: error.retryAfter,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchGroup(groupUrlname: string): Promise<CanonicalGroup | null> {
    if (!this.accessToken) {
      throw new Error('Meetup adapter not initialized');
    }

    const data = await this.queryGraphQL(groupUrlname, 1);
    if (!data) return null;

    return transformGroup(data);
  }

  private async queryGraphQL(groupUrlname: string, maxEvents: number): Promise<MeetupGroup | null> {
    const response = await fetch(MEETUP_GQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_GROUP_EVENTS_QUERY,
        variables: {
          urlname: groupUrlname,
          n: maxEvents,
          after: null,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Meetup API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<{ groupByUrlname: MeetupGroup | null }>;

    // Check for rate limiting
    if (result.errors) {
      for (const error of result.errors) {
        if (error.extensions?.code === 'RATE_LIMITED') {
          const resetAt = error.extensions.resetAt ? new Date(error.extensions.resetAt) : undefined;
          throw new RateLimitError(error.message, this.platform, resetAt);
        }
      }

      // Other GraphQL errors
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data.groupByUrlname;
  }
}

// Export singleton instance
export const meetupAdapter = new MeetupAdapter();
