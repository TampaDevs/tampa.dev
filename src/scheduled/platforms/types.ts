/**
 * Common types for event platform data
 * These types represent the normalized data structure that all platforms should output
 */

/**
 * Raw group data from a platform (before normalization)
 */
export interface PlatformGroupData {
  id: string;
  name: string;
  urlname: string;
  link: string;
  keyGroupPhoto?: {
    id: string;
    baseUrl: string;
  } | null;
  memberships?: {
    totalCount: number;
  };
  events: {
    totalCount: number;
    pageInfo?: {
      endCursor: string | null;
      hasNextPage: boolean;
    };
    edges: Array<{
      node: PlatformEventData;
    }>;
  };
}

/**
 * Raw event data from a platform (before normalization)
 */
export interface PlatformEventData {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  duration?: string | null;
  eventUrl: string;
  eventType?: string | null;
  status: string;
  featuredEventPhoto?: {
    id: string;
    baseUrl: string;
  } | null;
  rsvps?: {
    totalCount: number;
  };
  venues?: Array<{
    name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    lat?: number | null;
    lon?: number | null;
  }> | null;
}

/**
 * Aggregated data structure stored in KV
 * Keyed by group urlname
 */
export type AggregatedData = Record<string, PlatformGroupData>;

/**
 * Result of a platform fetch operation
 */
export interface PlatformFetchResult {
  success: boolean;
  data?: PlatformGroupData;
  error?: string;
}
