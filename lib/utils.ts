/**
 * Utility functions for event data processing
 * Now powered by the new model system
 */

import { Event, EventLoader, Photo } from '../models/index.js';
import type { EventFilterOptions } from '../models/loaders/EventLoader.js';

/**
 * Get photo URL with size and format options
 * Works with both Photo models and raw photo objects
 */
export function photoUrl(
  photo: Photo | { baseUrl?: string; id: string; directUrl?: string } | null | undefined,
  w = 676,
  h = 380,
  fmt = 'webp'
): string {
  if (!photo) return 'https://tampa.dev/images/default.jpg';
  // Non-Meetup photos store a directUrl with the full image URL
  if ('directUrl' in photo && photo.directUrl) return photo.directUrl;
  // Photo model instances have a .url getter
  if (photo instanceof Photo) return photo.url;
  if (photo.baseUrl) return `${photo.baseUrl}${photo.id}/${w}x${h}.${fmt}`;
  return photo.id;
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(url: URL): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  const queryString = url.search.slice(1).split('&');
  queryString.forEach((item) => {
    const kv = item.split('=');
    if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]) || true;
  });
  return params;
}

/**
 * Convert query parameters to EventFilterOptions
 */
export function paramsToFilterOptions(params: Record<string, any>): EventFilterOptions {
  const options: EventFilterOptions = {
    onlyActive: true,
    endedBufferHours: 2,
  };

  // /?groups=a,b,c
  if (params.groups && typeof params.groups === 'string') {
    options.groups = params.groups
      .toLowerCase()
      .split(',')
      .map((x) => x.replace(/\+/g, ' '));
  }

  // /?noonline=1
  if (params.noonline) {
    options.excludeOnline = true;
  }

  // /?within_hours=H
  if (params.within_hours) {
    options.withinHours = parseInt(params.within_hours, 10);
  }

  // /?within_days=D
  if (params.within_days) {
    options.withinDays = parseInt(params.within_days, 10);
  }

  return options;
}

/**
 * Load and filter event data based on query parameters
 * Returns Event[] instances
 */
export async function loadEvents(
  rawData: unknown,
  params: Record<string, any>
): Promise<Event[]> {
  const filterOptions = paramsToFilterOptions(params);
  const events = EventLoader.load(rawData, filterOptions);

  // /?noempty=1 - filter out groups with no events
  if (params.noempty) {
    return EventLoader.excludeEmptyGroups(events);
  }

  return events;
}

/**
 * Get all events sorted by date
 * Returns Event[] models
 */
export function getSortedEvents(data: any): Event[] {
  // If data is already Event[], use it directly (even if empty)
  if (Array.isArray(data)) {
    // Empty array is valid Event[] - return it immediately
    if (data.length === 0) {
      return [];
    }
    // Non-empty array - check if it's Event[] by checking first item
    if (isEvent(data[0])) {
      const events = data as Event[];
      return EventLoader.sort(events, { sortBy: 'dateTime', order: 'asc' });
    }
  }

  // Otherwise, load from raw data
  const events = EventLoader.fromMeetupData(data);
  return EventLoader.sort(events, { sortBy: 'dateTime', order: 'asc' });
}

/**
 * Check if value is an Event model instance
 * More reliable than instanceof in bundled environments
 */
function isEvent(value: any): value is Event {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    value.dateTime instanceof Date &&
    typeof value.eventUrl === 'string' &&
    value.group && typeof value.group.urlname === 'string'
  );
}

/**
 * Get next event for each group, sorted by earliest event date
 * Returns Event[] models
 */
export function getSortedNextEvents(data: any): Event[] {
  // If data is already Event[], use it directly (even if empty)
  if (Array.isArray(data)) {
    // Empty array is valid Event[] - return it immediately
    if (data.length === 0) {
      return [];
    }
    // Non-empty array - check if it's Event[] by checking first item
    if (isEvent(data[0])) {
      const events = data as Event[];
      return EventLoader.getNextEventPerGroup(events);
    }
  }

  // Otherwise, load from raw data
  const events = EventLoader.fromMeetupData(data);
  return EventLoader.getNextEventPerGroup(events);
}

/**
 * Get sorted group names by earliest event date
 */
export function getSortedGroupNames(data: any): string[] {
  const events = Array.isArray(data) ? data : EventLoader.fromMeetupData(data);
  const grouped = EventLoader.groupByGroup(events);

  const groupsWithEarliest: Array<{ name: string; earliest: Date }> = [];

  for (const [groupName, groupEvents] of grouped) {
    if (groupEvents.length === 0) continue;
    const sorted = EventLoader.sort(groupEvents, { sortBy: 'dateTime', order: 'asc' });
    groupsWithEarliest.push({
      name: groupName,
      earliest: sorted[0].dateTime,
    });
  }

  groupsWithEarliest.sort((a, b) => a.earliest.getTime() - b.earliest.getTime());
  return groupsWithEarliest.map((g) => g.name);
}

/**
 * Simple hash function for ETags
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
}

/**
 * Escape XML special characters
 */
export function escapeXml(unsafeStr: string): string {
  return unsafeStr.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Simple markdown to HTML converter
 */
export function markdownToHtml(markdown: string): string {
  // Remove backslash escaping
  markdown = markdown.replace(/\\([*])/g, '$1');

  // Convert headers
  markdown = markdown.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  markdown = markdown.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  markdown = markdown.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert links
  markdown = markdown.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a class="text-blue-500 hover:text-blue-700" href="$2">$1</a>'
  );

  // Convert bold text
  markdown = markdown.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');

  // Convert italic text
  markdown = markdown.replace(/\*(.*)\*/gim, '<em>$1</em>');

  // Convert horizontal rule
  markdown = markdown.replace(/^---+/gim, '<hr>');

  // Convert bulleted list items
  markdown = markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('* ')) {
        return `• ${line.substring(2)}`;
      } else {
        return line;
      }
    })
    .join('\n');

  // Convert line breaks to <br>
  markdown = markdown.replace(/\n/g, '<br>');

  return markdown;
}

/**
 * Convert date string to local formatted date
 */
export function toLocalDate(dateStr: string, overrideTimeZone?: string): string {
  let timeZone = overrideTimeZone;
  if (!timeZone) {
    const timeZoneMatch = dateStr.match(/([+-][0-9]{2}:[0-9]{2})$/);
    timeZone = timeZoneMatch ? timeZoneMatch[0] : 'America/New_York';
  }

  const dt = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: timeZone,
  };

  return new Intl.DateTimeFormat('en-US', options).format(dt);
}

/**
 * Truncate string to length
 */
export function trunc(str: string, len: number): string {
  return str.substr(0, len - 1) + (str.length > len ? '...' : '');
}
