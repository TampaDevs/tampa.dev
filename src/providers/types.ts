import type { Env } from '../../types/worker';
import type { EventPlatformType, EventStatusType, EventTypeValue } from '../db/schema';

/**
 * Canonical event representation (platform-agnostic)
 * This is the normalized format that all providers transform their data into
 * before it gets stored in D1.
 */
export interface CanonicalEvent {
  platformId: string;
  platform: EventPlatformType;
  title: string;
  description?: string;
  eventUrl: string;
  photoUrl?: string;
  startTime: string; // ISO 8601 with timezone
  endTime?: string; // ISO 8601 with timezone
  timezone: string; // IANA timezone
  duration?: string; // ISO 8601 duration (e.g., PT2H30M)
  status: EventStatusType;
  eventType: EventTypeValue;
  rsvpCount: number;
  maxAttendees?: number;
  venue?: CanonicalVenue;
}

/**
 * Canonical venue representation
 */
export interface CanonicalVenue {
  platformVenueId?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
}

/**
 * Canonical group representation
 */
export interface CanonicalGroup {
  platformId: string;
  platform: EventPlatformType;
  urlname: string;
  name: string;
  description?: string;
  link: string;
  memberCount: number;
  photoUrl?: string;
}

/**
 * Options for fetching events from a provider
 */
export interface FetchOptions {
  maxEvents?: number;
  after?: Date;
  before?: Date;
}

/**
 * Result of fetching events from a provider
 */
export interface ProviderFetchResult {
  success: boolean;
  group?: CanonicalGroup;
  events?: CanonicalEvent[];
  error?: string;
  rateLimited?: boolean;
  retryAfter?: Date;
}

/**
 * Provider adapter interface - all event sources must implement this
 */
export interface ProviderAdapter {
  /** Platform identifier */
  readonly platform: EventPlatformType;

  /** Human-readable name */
  readonly name: string;

  /**
   * Check if the provider is configured with required environment variables
   */
  isConfigured(env: Env): boolean;

  /**
   * Initialize the provider (e.g., authenticate, set up clients)
   */
  initialize(env: Env): Promise<void>;

  /**
   * Fetch events for a group/organizer/calendar
   * @param groupIdentifier - The group's identifier on this platform (urlname, org ID, calendar ID, etc.)
   * @param options - Optional fetch parameters
   */
  fetchEvents(groupIdentifier: string, options?: FetchOptions): Promise<ProviderFetchResult>;

  /**
   * Fetch group/organizer metadata only (without events)
   * @param groupIdentifier - The group's identifier on this platform
   */
  fetchGroup?(groupIdentifier: string): Promise<CanonicalGroup | null>;
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly retryAfter?: Date
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Custom error for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string, public readonly platform: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
