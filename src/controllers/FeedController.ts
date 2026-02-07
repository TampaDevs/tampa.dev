import type { Event } from '../../models/index.js';
import * as rss from '../../lib/rss.js';
import * as ical from '../../lib/ical.js';

/**
 * FeedController
 * Handles RSS and iCal feed generation
 */
export class FeedController {
  /**
   * Generate RSS feed from events
   */
  static generateRSS(events: Event[], request: Request): string {
    return rss.fromJSON(events, request);
  }

  /**
   * Generate iCal feed from events
   */
  static generateICal(events: Event[]): string {
    return ical.fromGroupEventsList(events);
  }

  /**
   * Validate iCal output
   */
  static isValidICal(icalData: string): boolean {
    return Boolean(icalData && icalData.length > 0);
  }
}
