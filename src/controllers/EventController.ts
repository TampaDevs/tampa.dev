import type { Context } from 'hono';
import type { Env } from '../app.js';
import * as util from '../../lib/utils.js';
import { Event } from '../../models/index.js';

/**
 * EventController
 * Handles all event-related business logic
 */
export class EventController {
  /**
   * Load raw event data from KV storage
   */
  static async loadRawData(c: Context<{ Bindings: Env }>): Promise<unknown> {
    const rawData = await c.env.kv.get('event_data');
    if (!rawData) {
      throw new Error('No event data available');
    }
    return JSON.parse(rawData);
  }

  /**
   * Parse query parameters
   */
  static getQueryParams(c: Context): Record<string, any> {
    const url = new URL(c.req.url);
    return util.parseQueryParams(url);
  }

  /**
   * Load and filter events based on query parameters
   */
  static async loadEvents(
    c: Context<{ Bindings: Env }>,
    params?: Record<string, any>
  ): Promise<Event[]> {
    const rawData = await this.loadRawData(c);
    const queryParams = params || this.getQueryParams(c);
    return util.loadEvents(rawData, queryParams);
  }

  /**
   * Get all events
   */
  static async getAllEvents(c: Context<{ Bindings: Env }>): Promise<Event[]> {
    const events = await this.loadEvents(c);
    return events;
  }

  /**
   * Get next event per group
   */
  static async getNextEvents(c: Context<{ Bindings: Env }>): Promise<Event[]> {
    const events = await this.loadEvents(c);
    return util.getSortedNextEvents(events);
  }

  /**
   * Generate ETag for caching
   */
  static generateETag(data: any): string {
    return util.cyrb53(JSON.stringify(data));
  }
}
