/**
 * Luma Provider Adapter
 *
 * Fetches event data from Luma via their REST API
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

const LUMA_API_BASE = 'https://public-api.luma.com/v1';

// ============== Luma API Types ==============

interface LumaGeoAddress {
  address?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  city_state?: string | null;
  full_address?: string | null;
  google_maps_place_id?: string | null;
  apple_maps_place_id?: string | null;
  description?: string | null;
}

interface LumaHost {
  id: string;
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string;
  api_id?: string; // Deprecated
}

interface LumaEvent {
  id: string;
  user_id: string;
  calendar_id: string;
  start_at: string; // ISO 8601 datetime
  duration_interval?: string;
  end_at: string; // ISO 8601 datetime
  created_at: string;
  timezone: string; // IANA timezone
  name: string;
  description?: string;
  description_md?: string;
  geo_address_json?: LumaGeoAddress | null;
  geo_latitude?: string | null;
  geo_longitude?: string | null;
  meeting_url?: string | null;
  cover_url?: string;
  visibility: 'public' | 'members-only' | 'private';
  url: string;
  hosts?: LumaHost[];
  api_id?: string; // Deprecated
}

interface LumaEventEntry {
  api_id: string;
  event: LumaEvent;
}

interface LumaEventsResponse {
  entries: LumaEventEntry[];
  has_more: boolean;
  next_cursor?: string;
}

interface LumaCalendar {
  api_id: string;
  name?: string;
  description?: string;
  cover_url?: string;
  url?: string;
}

// ============== Transformer Functions ==============

/**
 * Transform Luma visibility to canonical status
 */
function transformStatus(visibility: string): 'active' | 'cancelled' | 'draft' {
  switch (visibility) {
    case 'public':
      return EventStatus.ACTIVE;
    case 'members-only':
      return EventStatus.ACTIVE; // Still active, just restricted
    case 'private':
      return EventStatus.DRAFT;
    default:
      return EventStatus.ACTIVE;
  }
}

/**
 * Determine event type based on venue info
 */
function determineEventType(event: LumaEvent): 'physical' | 'online' | 'hybrid' {
  const hasPhysicalVenue = event.geo_address_json?.address ||
    event.geo_latitude ||
    event.geo_longitude;
  const hasOnlineVenue = !!event.meeting_url;

  if (hasPhysicalVenue && hasOnlineVenue) {
    return EventType.HYBRID;
  } else if (hasOnlineVenue) {
    return EventType.ONLINE;
  }

  return EventType.PHYSICAL;
}

/**
 * Transform Luma geo address to canonical venue
 */
function transformVenue(event: LumaEvent): CanonicalVenue | undefined {
  const eventType = determineEventType(event);

  if (eventType === EventType.ONLINE) {
    return {
      name: 'Online event',
      isOnline: true,
    };
  }

  const geo = event.geo_address_json;
  if (!geo && !event.geo_latitude) {
    return undefined;
  }

  // Try to extract venue name from description or use city_state
  const venueName = geo?.description || geo?.city_state || geo?.address || 'TBD';

  return {
    name: venueName,
    address: geo?.address || geo?.full_address || undefined,
    city: geo?.city || undefined,
    state: geo?.region || undefined,
    country: geo?.country || undefined,
    latitude: event.geo_latitude ? parseFloat(event.geo_latitude) : undefined,
    longitude: event.geo_longitude ? parseFloat(event.geo_longitude) : undefined,
    isOnline: eventType === EventType.HYBRID,
  };
}

/**
 * Calculate ISO 8601 duration from start and end times
 */
function calculateDuration(start: string, end: string): string | undefined {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();

    if (diffMs <= 0) return undefined;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `PT${hours}H${minutes}M`;
    } else if (hours > 0) {
      return `PT${hours}H`;
    } else if (minutes > 0) {
      return `PT${minutes}M`;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Transform Luma event to canonical event
 */
function transformEvent(entry: LumaEventEntry): CanonicalEvent {
  const event = entry.event;

  return {
    platformId: event.id || entry.api_id,
    platform: EventPlatform.LUMA,
    title: event.name,
    description: event.description || event.description_md || undefined,
    eventUrl: event.url,
    photoUrl: event.cover_url || undefined,
    startTime: event.start_at,
    endTime: event.end_at,
    timezone: event.timezone,
    duration: calculateDuration(event.start_at, event.end_at) || event.duration_interval || undefined,
    status: transformStatus(event.visibility),
    eventType: determineEventType(event),
    rsvpCount: 0, // Luma doesn't expose RSVP count in the events list API
    venue: transformVenue(event),
  };
}

/**
 * Create a canonical group from Luma calendar info
 * Note: Luma doesn't have a separate calendar metadata endpoint in their public API,
 * so we construct a minimal group from the calendar ID
 */
function createGroupFromCalendar(calendarId: string, calendarName?: string): CanonicalGroup {
  return {
    platformId: calendarId,
    platform: EventPlatform.LUMA,
    urlname: calendarId, // Use calendar ID as urlname
    name: calendarName || `Luma Calendar ${calendarId}`,
    link: `https://lu.ma/calendar/${calendarId}`,
    memberCount: 0, // Not available from API
  };
}

// ============== Luma Adapter ==============

export class LumaAdapter implements ProviderAdapter {
  readonly platform = EventPlatform.LUMA;
  readonly name = 'Luma';

  private apiKey: string | null = null;

  isConfigured(env: Env): boolean {
    return !!env.LUMA_API_KEY;
  }

  async initialize(env: Env): Promise<void> {
    if (!this.isConfigured(env)) {
      throw new AuthenticationError(
        'Luma is not configured. Missing LUMA_API_KEY.',
        this.platform
      );
    }

    this.apiKey = env.LUMA_API_KEY!;

    // Note: Luma doesn't have a simple "verify token" endpoint,
    // so we'll verify on first actual use
  }

  async fetchEvents(calendarId: string, options?: FetchOptions): Promise<ProviderFetchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Luma adapter not initialized. Call initialize() first.',
      };
    }

    try {
      const events: CanonicalEvent[] = [];
      let cursor: string | undefined;
      const maxEvents = options?.maxEvents || 50;
      let calendarName: string | undefined;

      // Build query parameters
      const buildParams = () => {
        const params = new URLSearchParams({
          pagination_limit: String(Math.min(50, maxEvents - events.length)),
        });

        // Only fetch future events by default
        if (options?.after) {
          params.set('after', options.after.toISOString());
        } else {
          params.set('after', new Date().toISOString());
        }

        if (options?.before) {
          params.set('before', options.before.toISOString());
        }

        if (cursor) {
          params.set('pagination_cursor', cursor);
        }

        return params;
      };

      do {
        const response = await this.apiRequest(`/calendar/list-events?${buildParams().toString()}`);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              error: 'Invalid or unauthorized Luma API key',
            };
          }
          if (response.status === 404) {
            return {
              success: false,
              error: `Calendar not found: ${calendarId}`,
            };
          }
          throw new Error(`Failed to fetch events: ${response.status}`);
        }

        const data = (await response.json()) as LumaEventsResponse;

        for (const entry of data.entries) {
          events.push(transformEvent(entry));

          // Try to extract calendar name from first event's calendar
          if (!calendarName && entry.event.calendar_id) {
            // We could potentially make another API call to get calendar details,
            // but for now we'll just use the name from the event if available
            calendarName = entry.event.name ? `Calendar for ${entry.event.hosts?.[0]?.name || 'events'}` : undefined;
          }

          if (events.length >= maxEvents) break;
        }

        cursor = data.has_more ? data.next_cursor : undefined;
      } while (cursor && events.length < maxEvents);

      // Create group from calendar
      const group = createGroupFromCalendar(calendarId, calendarName);

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

  async fetchGroup(calendarId: string): Promise<CanonicalGroup | null> {
    // Luma doesn't have a dedicated calendar metadata endpoint in their public API
    // We return a minimal group based on the calendar ID
    return createGroupFromCalendar(calendarId);
  }

  private async apiRequest(endpoint: string): Promise<Response> {
    const response = await fetch(`${LUMA_API_BASE}${endpoint}`, {
      headers: {
        'x-luma-api-key': this.apiKey!,
        'Content-Type': 'application/json',
      },
    });

    // Check for rate limiting (Luma uses standard 429)
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 60000;
      const retryAfter = new Date(Date.now() + retryAfterMs);

      throw new RateLimitError(
        'Luma API rate limit exceeded',
        this.platform,
        retryAfter
      );
    }

    return response;
  }
}

// Export singleton instance
export const lumaAdapter = new LumaAdapter();
