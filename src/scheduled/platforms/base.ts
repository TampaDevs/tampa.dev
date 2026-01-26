/**
 * Base interface for event platforms
 * All platform implementations should implement this interface
 */

import type { Env } from '../../app.js';
import type { PlatformGroupData, PlatformFetchResult } from './types.js';

/**
 * Configuration for a group to fetch from a platform
 */
export interface GroupConfig {
  urlname: string;
  platform: string;
  maxEvents?: number;
}

/**
 * Base interface that all event platforms must implement
 */
export interface EventPlatform {
  /**
   * Unique identifier for this platform
   */
  readonly name: string;

  /**
   * Initialize the platform (authenticate, etc.)
   * Called once before fetching events
   */
  initialize(env: Env): Promise<void>;

  /**
   * Fetch events for a specific group
   * @param groupUrlname - The URL name/identifier of the group
   * @param maxEvents - Maximum number of events to fetch (default: 25)
   */
  fetchGroupEvents(
    groupUrlname: string,
    maxEvents?: number
  ): Promise<PlatformFetchResult>;

  /**
   * Check if this platform is properly configured
   */
  isConfigured(env: Env): boolean;
}

/**
 * Registry of available platforms
 */
export class PlatformRegistry {
  private platforms: Map<string, EventPlatform> = new Map();

  register(platform: EventPlatform): void {
    this.platforms.set(platform.name, platform);
  }

  get(name: string): EventPlatform | undefined {
    return this.platforms.get(name);
  }

  getAll(): EventPlatform[] {
    return Array.from(this.platforms.values());
  }

  getConfigured(env: Env): EventPlatform[] {
    return this.getAll().filter((p) => p.isConfigured(env));
  }
}

/**
 * Global platform registry instance
 */
export const platformRegistry = new PlatformRegistry();
