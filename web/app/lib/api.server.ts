/**
 * Server-side API client for fetching events and groups
 *
 * For local development, set EVENTS_API_URL=http://localhost:8787
 */

import type { Event, LocalGroupCompat } from "./types";
import { findGroupByUrlname } from "./types";

// Re-export shared types for server-side code
export type { LocalGroupCompat };
export { findGroupByUrlname };

const API_HOST = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";
const API_BASE = `${API_HOST}/2026-01-25`;

// ============== Groups API ==============

export interface ApiGroup {
  id: string;
  urlname: string;
  name: string;
  description: string | null;
  link: string;
  website: string | null;
  platform: "meetup" | "eventbrite" | "luma";
  memberCount: number | null;
  photoUrl: string | null;
  isFeatured: boolean | null;
  tags: string[] | null;
  socialLinks: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  } | null;
}

interface FetchGroupsOptions {
  featured?: boolean;
  tag?: string;
}

export async function fetchGroups(
  options: FetchGroupsOptions = {}
): Promise<ApiGroup[]> {
  const params = new URLSearchParams();

  if (options.featured) {
    params.set("featured", "1");
  }
  if (options.tag) {
    params.set("tag", options.tag);
  }

  const url = `${API_BASE}/groups${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Groups API request failed: ${response.status}`);
    return [];
  }

  return (await response.json()) as ApiGroup[];
}

export async function fetchGroupBySlug(
  slug: string
): Promise<ApiGroup | null> {
  const url = `${API_BASE}/groups/${encodeURIComponent(slug)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    console.error(`Group API request failed: ${response.status}`);
    return null;
  }

  return (await response.json()) as ApiGroup;
}

/**
 * Convert API group to LocalGroup-compatible format for existing components
 */
export function toLocalGroup(group: ApiGroup): LocalGroupCompat {
  return {
    slug: group.urlname,
    name: group.name,
    description: group.description || "",
    website: group.website || group.link,
    logo: group.photoUrl || "/images/placeholder-group.svg",
    meetupUrlname: group.platform === "meetup" ? group.urlname : undefined,
    socialLinks: group.socialLinks || undefined,
    tags: group.tags || [],
    featured: group.isFeatured || false,
  };
}

/**
 * Get all unique tags from groups
 */
export function extractTags(groups: ApiGroup[]): string[] {
  const tagSet = new Set<string>();
  for (const group of groups) {
    if (group.tags) {
      for (const tag of group.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get all group urlnames from a list of groups
 * Uses slug as fallback if meetupUrlname is not set (for non-Meetup platforms)
 */
export function getGroupUrlnames(groups: LocalGroupCompat[]): string[] {
  return groups.map((g) => g.meetupUrlname || g.slug);
}

/**
 * Filter groups by tag
 */
export function filterGroupsByTag(groups: ApiGroup[], tag: string): ApiGroup[] {
  return groups.filter((g) => g.tags?.includes(tag));
}

// ============== Events API ==============

interface FetchEventsOptions {
  groups?: string[];
  noOnline?: boolean;
  withinDays?: number;
  withinHours?: number;
  noEmpty?: boolean;
}

export async function fetchEvents(
  options: FetchEventsOptions = {}
): Promise<Event[]> {
  const params = new URLSearchParams();

  if (options.groups?.length) {
    params.set("groups", options.groups.join(","));
  }
  if (options.noOnline) {
    params.set("noonline", "1");
  }
  if (options.withinDays) {
    params.set("within_days", options.withinDays.toString());
  }
  if (options.withinHours) {
    params.set("within_hours", options.withinHours.toString());
  }
  if (options.noEmpty) {
    params.set("noempty", "1");
  }

  const url = `${API_BASE}/events${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 503) {
      // No events available
      return [];
    }
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = (await response.json()) as { events?: Event[] } | Event[];
  return Array.isArray(data) ? data : (data.events ?? []);
}

export async function fetchNextEvents(
  options: FetchEventsOptions = {}
): Promise<Event[]> {
  const params = new URLSearchParams();

  if (options.groups?.length) {
    params.set("groups", options.groups.join(","));
  }
  if (options.noOnline) {
    params.set("noonline", "1");
  }
  if (options.noEmpty) {
    params.set("noempty", "1");
  }

  const url = `${API_BASE}/events/next${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 503) {
      return [];
    }
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = (await response.json()) as { events?: Event[] } | Event[];
  return Array.isArray(data) ? data : (data.events ?? []);
}

/**
 * Fetch a single event by ID
 * Since the API doesn't have a single event endpoint, we fetch all events
 * and find the one with the matching ID
 */
export async function fetchEventById(id: string): Promise<Event | null> {
  const events = await fetchEvents({ withinDays: 90 });
  return events.find((event) => event.id === id) ?? null;
}
