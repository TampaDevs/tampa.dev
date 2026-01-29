/**
 * Eventbrite Provider Adapter
 *
 * Fetches event data from Eventbrite via their REST API
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

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

// ============== Eventbrite API Types ==============

interface EventbriteMultipartText {
  text: string;
  html: string;
}

interface EventbriteDatetimeWithTimezone {
  timezone: string;
  utc: string;
  local: string;
}

interface EventbriteAddress {
  address_1?: string;
  address_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  localized_address_display?: string;
}

interface EventbriteVenue {
  id: string;
  name?: string;
  address?: EventbriteAddress;
  latitude?: string;
  longitude?: string;
}

interface EventbriteLogo {
  id: string;
  url: string;
  original?: { url: string };
}

interface EventbriteOrganizer {
  id: string;
  name: string;
  description?: EventbriteMultipartText;
  logo?: EventbriteLogo;
  url?: string;
  num_followers?: number;
}

interface EventbriteEvent {
  id: string;
  name: EventbriteMultipartText;
  summary?: string;
  description?: EventbriteMultipartText;
  url: string;
  start: EventbriteDatetimeWithTimezone;
  end: EventbriteDatetimeWithTimezone;
  created: string;
  changed: string;
  published?: string;
  status: string;
  currency: string;
  online_event: boolean;
  hide_start_date?: boolean;
  hide_end_date?: boolean;
  logo?: EventbriteLogo;
  venue_id?: string;
  venue?: EventbriteVenue;
  organizer_id?: string;
  organizer?: EventbriteOrganizer;
  capacity?: number;
  capacity_is_custom?: boolean;
}

interface EventbritePagination {
  object_count: number;
  page_count: number;
  page_size: number;
  page_number: number;
  has_more_items: boolean;
  continuation?: string;
}

interface EventbriteEventsResponse {
  pagination: EventbritePagination;
  events: EventbriteEvent[];
}

interface EventbriteDescriptionResponse {
  description: string;
}

interface EventbriteOrganizerResponse {
  id: string;
  name: string;
  description?: EventbriteMultipartText;
  logo?: EventbriteLogo;
  url?: string;
  num_followers?: number;
}

interface EventbriteErrorResponse {
  error: string;
  error_description: string;
  status_code: number;
}

// ============== HTML to Markdown Conversion ==============

/**
 * Convert HTML to Markdown-like text for consistency with other providers
 * Handles common HTML tags and produces clean, readable text
 */
function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let text = html;

  // Replace block-level elements with newlines first
  text = text.replace(/<\/?(div|p|br|hr)[^>]*>/gi, '\n');

  // Convert headings
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  text = text.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, '#### $1\n');

  // Convert emphasis
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
  text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');

  // Convert links
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Convert lists
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  text = text.replace(/[ \t]+/g, ' '); // Collapse spaces
  text = text.replace(/\n +/g, '\n'); // Remove leading spaces on lines
  text = text.replace(/ +\n/g, '\n'); // Remove trailing spaces on lines

  return text.trim();
}

// ============== Transformer Functions ==============

/**
 * Transform Eventbrite status to canonical status
 */
function transformStatus(ebStatus: string): 'active' | 'cancelled' | 'draft' {
  switch (ebStatus.toLowerCase()) {
    case 'live':
    case 'started':
    case 'ended':
    case 'completed':
      return EventStatus.ACTIVE;
    case 'canceled':
    case 'cancelled':
      return EventStatus.CANCELLED;
    case 'draft':
      return EventStatus.DRAFT;
    default:
      return EventStatus.ACTIVE;
  }
}

/**
 * Transform Eventbrite event to canonical event type
 */
function transformEventType(isOnline: boolean): 'physical' | 'online' | 'hybrid' {
  return isOnline ? EventType.ONLINE : EventType.PHYSICAL;
}

/**
 * Transform Eventbrite venue to canonical venue
 */
function transformVenue(venue?: EventbriteVenue, isOnline?: boolean): CanonicalVenue | undefined {
  if (isOnline) {
    return {
      name: 'Online event',
      isOnline: true,
    };
  }

  if (!venue) return undefined;

  return {
    platformVenueId: venue.id,
    name: venue.name || 'TBD',
    address: venue.address?.address_1 || undefined,
    city: venue.address?.city || undefined,
    state: venue.address?.region || undefined,
    postalCode: venue.address?.postal_code || undefined,
    country: venue.address?.country || undefined,
    latitude: venue.latitude ? parseFloat(venue.latitude) : undefined,
    longitude: venue.longitude ? parseFloat(venue.longitude) : undefined,
    isOnline: false,
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
 * Transform Eventbrite event to canonical event
 * @param event - The Eventbrite event object
 * @param fullDescription - Optional full HTML description from /events/{id}/description/
 */
function transformEvent(event: EventbriteEvent, fullDescription?: string): CanonicalEvent {
  // Use full description if available, convert HTML to Markdown for consistency with other providers
  // Fall back to inline description/summary if full description unavailable
  const rawDescription = fullDescription || event.description?.html || event.description?.text || event.summary;
  const description = rawDescription ? htmlToMarkdown(rawDescription) : undefined;

  return {
    platformId: event.id,
    platform: EventPlatform.EVENTBRITE,
    title: event.name.text,
    description,
    eventUrl: event.url,
    photoUrl: event.logo?.url || event.logo?.original?.url || undefined,
    startTime: event.start.utc,
    endTime: event.end.utc,
    timezone: event.start.timezone,
    duration: calculateDuration(event.start.utc, event.end.utc),
    status: transformStatus(event.status),
    eventType: transformEventType(event.online_event),
    rsvpCount: 0, // Eventbrite doesn't expose RSVP count directly in events list
    maxAttendees: event.capacity || undefined,
    venue: transformVenue(event.venue, event.online_event),
  };
}

/**
 * Transform Eventbrite organizer to canonical group
 */
function transformOrganizer(organizer: EventbriteOrganizerResponse, urlname: string): CanonicalGroup {
  return {
    platformId: organizer.id,
    platform: EventPlatform.EVENTBRITE,
    urlname: urlname,
    name: organizer.name,
    description: organizer.description?.text || undefined,
    link: organizer.url || `https://www.eventbrite.com/o/${organizer.id}`,
    memberCount: organizer.num_followers || 0,
    photoUrl: organizer.logo?.url || undefined,
  };
}

// ============== Eventbrite Adapter ==============

export class EventbriteAdapter implements ProviderAdapter {
  readonly platform = EventPlatform.EVENTBRITE;
  readonly name = 'Eventbrite';

  private privateToken: string | null = null;

  isConfigured(env: Env): boolean {
    return !!env.EVENTBRITE_PRIVATE_TOKEN;
  }

  async initialize(env: Env): Promise<void> {
    if (!this.isConfigured(env)) {
      throw new AuthenticationError(
        'Eventbrite is not configured. Missing EVENTBRITE_PRIVATE_TOKEN.',
        this.platform
      );
    }

    this.privateToken = env.EVENTBRITE_PRIVATE_TOKEN!;

    // Verify token works by making a simple API call
    try {
      const response = await this.apiRequest('/users/me/');
      if (!response.ok) {
        throw new Error(`Invalid token: ${response.status}`);
      }
    } catch (error) {
      throw new AuthenticationError(
        `Failed to authenticate with Eventbrite: ${error instanceof Error ? error.message : String(error)}`,
        this.platform
      );
    }
  }

  async fetchEvents(organizerId: string, options?: FetchOptions): Promise<ProviderFetchResult> {
    if (!this.privateToken) {
      return {
        success: false,
        error: 'Eventbrite adapter not initialized. Call initialize() first.',
      };
    }

    try {
      // Fetch organizer info first
      const organizerResponse = await this.apiRequest(`/organizers/${organizerId}/`);
      if (!organizerResponse.ok) {
        if (organizerResponse.status === 404) {
          return {
            success: false,
            error: `Organizer not found: ${organizerId}`,
          };
        }
        throw new Error(`Failed to fetch organizer: ${organizerResponse.status}`);
      }

      const organizerData = (await organizerResponse.json()) as EventbriteOrganizerResponse;
      const group = transformOrganizer(organizerData, organizerId);

      // Fetch events with venue expansion
      const events: CanonicalEvent[] = [];
      let continuation: string | undefined;
      const maxEvents = options?.maxEvents || 50;
      const rawEvents: EventbriteEvent[] = [];

      do {
        const params = new URLSearchParams({
          'expand': 'venue',
          'status': 'live,started', // Only active events
          'order_by': 'start_asc',
        });

        if (continuation) {
          params.set('continuation', continuation);
        }

        const eventsResponse = await this.apiRequest(
          `/organizers/${organizerId}/events/?${params.toString()}`
        );

        if (!eventsResponse.ok) {
          throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
        }

        const eventsData = (await eventsResponse.json()) as EventbriteEventsResponse;

        for (const event of eventsData.events) {
          rawEvents.push(event);
          if (rawEvents.length >= maxEvents) break;
        }

        continuation = eventsData.pagination.has_more_items
          ? eventsData.pagination.continuation
          : undefined;
      } while (continuation && rawEvents.length < maxEvents);

      // Fetch full descriptions for each event (in parallel for performance)
      const descriptionPromises = rawEvents.map(event => this.fetchEventDescription(event.id));
      const descriptions = await Promise.all(descriptionPromises);

      // Transform events with their full descriptions
      for (let i = 0; i < rawEvents.length; i++) {
        events.push(transformEvent(rawEvents[i], descriptions[i]));
      }

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

  async fetchGroup(organizerId: string): Promise<CanonicalGroup | null> {
    if (!this.privateToken) {
      throw new Error('Eventbrite adapter not initialized');
    }

    const response = await this.apiRequest(`/organizers/${organizerId}/`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch organizer: ${response.status}`);
    }

    const data = (await response.json()) as EventbriteOrganizerResponse;
    return transformOrganizer(data, organizerId);
  }

  /**
   * Fetch the full HTML description for an event
   * The inline description field is deprecated; full descriptions require a separate API call
   */
  private async fetchEventDescription(eventId: string): Promise<string | undefined> {
    try {
      const response = await this.apiRequest(`/events/${eventId}/description/`);
      if (!response.ok) {
        return undefined;
      }
      const data = (await response.json()) as EventbriteDescriptionResponse;
      return data.description || undefined;
    } catch {
      // If description fetch fails, return undefined (will fall back to summary)
      return undefined;
    }
  }

  private async apiRequest(endpoint: string): Promise<Response> {
    const response = await fetch(`${EVENTBRITE_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.privateToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Check for rate limiting
    if (response.status === 429) {
      // Eventbrite rate limit: 2000 calls per hour
      const retryAfter = new Date(Date.now() + 60 * 1000); // Retry in 1 minute
      throw new RateLimitError(
        'Eventbrite API rate limit exceeded (2000 calls/hour)',
        this.platform,
        retryAfter
      );
    }

    return response;
  }
}

// Export singleton instance
export const eventbriteAdapter = new EventbriteAdapter();
