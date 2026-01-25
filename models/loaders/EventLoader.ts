import { Event } from '../Event.js';
import { MeetupTransformer } from '../providers/MeetupTransformer.js';

/**
 * Filter options for loading events
 */
export interface EventFilterOptions {
  /** Filter to specific group urlnames */
  groups?: string[];
  /** Exclude online events */
  excludeOnline?: boolean;
  /** Exclude empty groups (groups with no events) */
  excludeEmptyGroups?: boolean;
  /** Only include events within N hours from now */
  withinHours?: number;
  /** Only include events within N days from now */
  withinDays?: number;
  /** Only include active events (exclude cancelled, draft, etc.) */
  onlyActive?: boolean;
  /** Include events that ended less than N hours ago */
  endedBufferHours?: number;
}

/**
 * Sort options for events
 */
export type EventSortBy = 'dateTime' | 'title' | 'group';
export type EventSortOrder = 'asc' | 'desc';

export interface EventSortOptions {
  sortBy?: EventSortBy;
  order?: EventSortOrder;
}

/**
 * EventLoader
 * Centralized utility for loading, filtering, and sorting events
 */
export class EventLoader {
  /**
   * Load events from raw Meetup data
   */
  static fromMeetupData(rawData: unknown): Event[] {
    const validated = MeetupTransformer.validate(rawData);
    return MeetupTransformer.transformAll(validated);
  }

  /**
   * Filter events based on provided options
   */
  static filter(events: Event[], options: EventFilterOptions = {}): Event[] {
    let filtered = [...events];

    // Filter out ended events (with buffer)
    const endedBufferHours = options.endedBufferHours ?? 2;
    filtered = filtered.filter(event => !event.hasEnded(endedBufferHours));

    // Filter by group urlnames
    if (options.groups && options.groups.length > 0) {
      const groupSet = new Set(options.groups);
      filtered = filtered.filter(event => groupSet.has(event.group.urlname));
    }

    // Exclude online events
    if (options.excludeOnline) {
      filtered = filtered.filter(event => !event.isOnline);
    }

    // Filter by time window (hours)
    if (options.withinHours !== undefined) {
      filtered = filtered.filter(event => event.isWithinHours(options.withinHours!));
    }

    // Filter by time window (days)
    if (options.withinDays !== undefined) {
      filtered = filtered.filter(event => event.isWithinDays(options.withinDays!));
    }

    // Only active events
    if (options.onlyActive) {
      filtered = filtered.filter(event => event.isActive);
    }

    return filtered;
  }

  /**
   * Sort events
   */
  static sort(
    events: Event[],
    options: EventSortOptions = { sortBy: 'dateTime', order: 'asc' }
  ): Event[] {
    const { sortBy = 'dateTime', order = 'asc' } = options;
    const sorted = [...events];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dateTime':
          comparison = a.dateTime.getTime() - b.dateTime.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'group':
          comparison = a.group.name.localeCompare(b.group.name);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Load, filter, and sort events in one call
   */
  static load(
    rawData: unknown,
    filterOptions?: EventFilterOptions,
    sortOptions?: EventSortOptions
  ): Event[] {
    let events = this.fromMeetupData(rawData);
    events = this.filter(events, filterOptions);
    events = this.sort(events, sortOptions);
    return events;
  }

  /**
   * Get one event per group (the next/earliest event for each group)
   */
  static getNextEventPerGroup(events: Event[]): Event[] {
    const groupMap = new Map<string, Event>();

    // Sort by date first
    const sorted = this.sort(events, { sortBy: 'dateTime', order: 'asc' });

    // Keep only the first (earliest) event for each group
    for (const event of sorted) {
      const groupKey = event.group.urlname;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, event);
      }
    }

    return Array.from(groupMap.values());
  }

  /**
   * Group events by their group
   */
  static groupByGroup(events: Event[]): Map<string, Event[]> {
    const grouped = new Map<string, Event[]>();

    for (const event of events) {
      const groupKey = event.group.urlname;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(event);
    }

    return grouped;
  }

  /**
   * Filter out empty groups (groups with no events)
   * This is useful when you want to exclude groups that have no upcoming events
   */
  static excludeEmptyGroups(events: Event[]): Event[] {
    const grouped = this.groupByGroup(events);
    const result: Event[] = [];

    for (const [_groupKey, groupEvents] of grouped) {
      if (groupEvents.length > 0) {
        result.push(...groupEvents);
      }
    }

    return result;
  }
}
