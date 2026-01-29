/**
 * Events API Models
 *
 * Provider-agnostic data models for events, groups, venues, and photos.
 * These models provide:
 * - Type safety via TypeScript
 * - Runtime validation via Zod schemas
 * - Computed properties (no mutation!)
 * - Consistent data access patterns
 * - Easy serialization for APIs
 */

// Core models
export { Photo, PhotoSchema, type PhotoData } from './Photo.js';
export { Venue, VenueSchema, type VenueData, ONLINE_EVENT_VENUE_NAME } from './Venue.js';
export { Group, GroupSchema, type GroupData } from './Group.js';
export {
  Event,
  EventSchema,
  type EventData,
  EventStatus,
  EventType,
} from './Event.js';

// Provider-specific transformers
export {
  MeetupTransformer,
  MeetupDataSchema,
  type MeetupData,
  type MeetupGroupData,
  type MeetupEventNode,
  type MeetupGroup,
  type MeetupVenue,
  type MeetupPhoto,
} from './providers/MeetupTransformer.js';

export {
  DatabaseTransformer,
  type DbEvent,
  type DbGroup,
  type DbVenue,
  type DbEventWithRelations,
} from './providers/DatabaseTransformer.js';

// Factory/loader utilities
export { EventLoader } from './loaders/EventLoader.js';
