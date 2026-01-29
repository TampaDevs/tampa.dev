import type { Env } from '../../types/worker';
import type { ProviderAdapter, ProviderFetchResult, FetchOptions } from './types';
import type { EventPlatformType } from '../db/schema';

/**
 * Registry for managing provider adapters
 * Supports discovering, registering, and querying providers dynamically
 */
export class ProviderRegistry {
  private adapters: Map<EventPlatformType, ProviderAdapter> = new Map();
  private initialized: Set<EventPlatformType> = new Set();

  /**
   * Register a provider adapter
   */
  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  /**
   * Get a specific adapter by platform
   */
  getAdapter(platform: EventPlatformType): ProviderAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all adapters that are configured (have required env variables)
   */
  getConfiguredAdapters(env: Env): ProviderAdapter[] {
    return Array.from(this.adapters.values()).filter((adapter) =>
      adapter.isConfigured(env)
    );
  }

  /**
   * Initialize all configured adapters
   */
  async initializeAll(env: Env): Promise<void> {
    const configuredAdapters = this.getConfiguredAdapters(env);

    for (const adapter of configuredAdapters) {
      if (!this.initialized.has(adapter.platform)) {
        await adapter.initialize(env);
        this.initialized.add(adapter.platform);
      }
    }
  }

  /**
   * Initialize a specific adapter
   */
  async initializeAdapter(platform: EventPlatformType, env: Env): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }

    if (!adapter.isConfigured(env)) {
      throw new Error(`Adapter for ${platform} is not configured`);
    }

    if (!this.initialized.has(platform)) {
      await adapter.initialize(env);
      this.initialized.add(platform);
    }
  }

  /**
   * Check if an adapter is initialized
   */
  isInitialized(platform: EventPlatformType): boolean {
    return this.initialized.has(platform);
  }

  /**
   * Fetch events from a specific platform
   */
  async fetchEvents(
    platform: EventPlatformType,
    groupIdentifier: string,
    env: Env,
    options?: FetchOptions
  ): Promise<ProviderFetchResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return {
        success: false,
        error: `No adapter registered for platform: ${platform}`,
      };
    }

    if (!adapter.isConfigured(env)) {
      return {
        success: false,
        error: `Adapter for ${platform} is not configured`,
      };
    }

    // Auto-initialize if needed
    if (!this.initialized.has(platform)) {
      try {
        await adapter.initialize(env);
        this.initialized.add(platform);
      } catch (error) {
        return {
          success: false,
          error: `Failed to initialize ${platform}: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    return adapter.fetchEvents(groupIdentifier, options);
  }

  /**
   * Reset initialization state (useful for testing or re-auth)
   */
  reset(): void {
    this.initialized.clear();
  }
}

// Global registry instance
export const providerRegistry = new ProviderRegistry();
