/**
 * Provider Adapters
 *
 * This module exports all provider adapters and the registry.
 * Import from here to get the pre-configured registry with all adapters registered.
 */

// Types
export * from './types';

// Registry
export { ProviderRegistry, providerRegistry } from './registry';

// Individual adapters
export { MeetupAdapter, meetupAdapter } from './meetup';
export { EventbriteAdapter, eventbriteAdapter } from './eventbrite';
export { LumaAdapter, lumaAdapter } from './luma';

// Register all adapters with the global registry
import { providerRegistry } from './registry';
import { meetupAdapter } from './meetup';
import { eventbriteAdapter } from './eventbrite';
import { lumaAdapter } from './luma';

providerRegistry.register(meetupAdapter);
providerRegistry.register(eventbriteAdapter);
providerRegistry.register(lumaAdapter);
