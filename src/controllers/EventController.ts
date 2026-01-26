import type { Context } from 'hono';
import type { Env } from '../app.js';
import * as util from '../../lib/utils.js';
import { Event } from '../../models/index.js';
import { generateDataHash } from '../cache.js';

/**
 * EventController
 * Handles all event-related business logic
 */
export class EventController {
  /**
   * Load raw event data string from KV storage
   */
  static async loadRawDataString(c: Context<{ Bindings: Env }>): Promise<string> {
    const rawData = await c.env.kv.get('event_data');
    if (!rawData) {
      throw new Error('No event data available');
    }
    return rawData;
  }

  /**
   * Load raw event data from KV storage
   */
  static async loadRawData(c: Context<{ Bindings: Env }>): Promise<unknown> {
    const rawData = await this.loadRawDataString(c);
    return JSON.parse(rawData);
  }

  /**
   * Get the hash of the current event data for cache invalidation
   */
  static async getDataHash(c: Context<{ Bindings: Env }>): Promise<string> {
    const rawData = await this.loadRawDataString(c);
    return generateDataHash(rawData);
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
