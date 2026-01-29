/**
 * Friendly type aliases for API responses
 *
 * These types are derived from the generated OpenAPI types.
 * The generated types are in api-types.generated.ts
 *
 * Run `npm run generate:types` to regenerate after API changes.
 */

import type { paths } from "./api-types.generated";

// ============== Event Types ==============

/**
 * Event response from the API
 * Extracted from GET /2026-01-25/events response
 */
export type ApiEvent =
  paths["/2026-01-25/events"]["get"]["responses"]["200"]["content"]["application/json"][number];

/**
 * Event status enum values
 */
export type EventStatus = ApiEvent["status"];

/**
 * Event type enum values
 */
export type EventType = NonNullable<ApiEvent["eventType"]>;

// ============== Group Types ==============

/**
 * Group response from the API
 * Extracted from GET /2026-01-25/groups response
 */
export type ApiGroup =
  paths["/2026-01-25/groups"]["get"]["responses"]["200"]["content"]["application/json"][number];

/**
 * Platform enum values
 */
export type Platform = ApiGroup["platform"];

/**
 * Social links structure
 */
export type SocialLinks = NonNullable<ApiGroup["socialLinks"]>;

// ============== Manually defined types ==============
// These types are used in the API but not fully specified in OpenAPI schema

/**
 * Venue information (nested in events, uses z.any() in OpenAPI)
 */
export interface Venue {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
}

/**
 * Group info embedded in events (uses z.any() in OpenAPI)
 */
export interface EventGroup {
  id: string;
  name: string;
  urlname: string;
  link: string;
  memberCount: number;
  photo?: Photo;
}

/**
 * Photo information
 */
export interface Photo {
  id: string;
  baseUrl: string;
}

// ============== Re-exports for convenience ==============

export type { paths };
