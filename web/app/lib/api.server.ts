/**
 * Server-side API client for fetching events
 */

import type { Event } from "./types";

const API_BASE = "https://events.api.tampa.dev/2026-01-25";

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
