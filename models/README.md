# Events API Data Models

Provider-agnostic data models for events, groups, venues, and photos.

## Overview

This models system provides:
- **Type safety** via TypeScript interfaces and classes
- **Runtime validation** via Zod schemas
- **Immutable data structures** - no property mutation
- **Computed properties** - address, URLs, etc. calculated on-the-fly
- **Provider extensibility** - core models + provider-specific transformers
- **Consistent API** - unified data access patterns across the codebase

## Core Models

### Event

The central model representing a scheduled event.

```typescript
import { Event } from './models';

// Properties
event.id              // string
event.title           // string
event.description     // string | undefined
event.dateTime        // Date
event.duration        // string (ISO 8601, e.g., "PT2H30M")
event.eventUrl        // string
event.status          // EventStatus enum
event.eventType       // EventType enum
event.rsvpCount       // number
event.venues          // Venue[]
event.photo           // Photo | undefined
event.group           // Group
event.extras          // Record<string, unknown> - provider-specific data

// Computed properties
event.venue           // Venue | null - primary venue
event.isOnline        // boolean
event.isActive        // boolean
event.isCancelled     // boolean
event.address         // string | null
event.googleMapsUrl   // string | null
event.addressHTML     // string (HTML-safe)
event.photoUrl        // string | null (event photo or group photo)
event.durationMs      // number (milliseconds)
event.endTime         // Date | null

// Methods
event.hasEnded(bufferHours?: number): boolean
event.isWithinHours(hours: number): boolean
event.isWithinDays(days: number): boolean
event.toJSON(): Record<string, unknown>
event.toLegacyJSON(): Record<string, unknown>  // For backward compatibility
```

### Group

Represents an organization or community that hosts events.

```typescript
import { Group } from './models';

// Properties
group.id          // string
group.name        // string
group.urlname     // string
group.link        // string
group.memberCount // number
group.photo       // Photo | undefined
group.extras      // Record<string, unknown>

// Computed properties
group.photoUrl    // string | null
group.hasPhoto    // boolean

// Methods
group.toJSON(): GroupData
```

### Venue

Represents a physical or virtual event location.

```typescript
import { Venue } from './models';

// Properties
venue.name        // string
venue.address     // string | undefined
venue.city        // string | undefined
venue.state       // string | undefined
venue.postalCode  // string | undefined
venue.lat         // number | undefined
venue.lon         // number | undefined

// Computed properties
venue.isOnline            // boolean
venue.hasCoordinates      // boolean
venue.formattedAddress    // string | null
venue.googleMapsUrl       // string | null
venue.formattedAddressHTML // string (HTML-safe)

// Methods
venue.toJSON(): VenueData
```

### Photo

Represents an image associated with an event or group.

```typescript
import { Photo } from './models';

// Properties
photo.id      // string
photo.baseUrl // string

// Computed properties
photo.url     // string

// Methods
photo.toJSON(): PhotoData
```

## Loading and Filtering Events

Use the `EventLoader` utility for all event loading and filtering operations.

```typescript
import { EventLoader } from './models';

// Load from raw KV data
const events = EventLoader.fromMeetupData(rawData);

// Filter events
const filtered = EventLoader.filter(events, {
  groups: ['tampa-devs', 'suncoast-js'],  // Specific groups
  excludeOnline: true,                     // No online events
  withinDays: 7,                           // Next 7 days only
  onlyActive: true,                        // Only active events
  endedBufferHours: 2,                     // Include events that ended <2hrs ago
});

// Sort events
const sorted = EventLoader.sort(events, {
  sortBy: 'dateTime',  // or 'title' or 'group'
  order: 'asc'         // or 'desc'
});

// Load, filter, and sort in one call
const events = EventLoader.load(
  rawData,
  { withinDays: 30, onlyActive: true },
  { sortBy: 'dateTime', order: 'asc' }
);

// Get next event per group
const nextEvents = EventLoader.getNextEventPerGroup(events);

// Group events by group
const byGroup = EventLoader.groupByGroup(events);
```

## Provider Transformers

### Meetup Transformer

Transforms raw Meetup API data into core models.

```typescript
import { MeetupTransformer } from './models';

// Validate raw data
const validated = MeetupTransformer.validate(rawData);

// Transform all events
const events = MeetupTransformer.transformAll(validated);

// Transform and group by Group
const grouped = MeetupTransformer.transformByGroup(validated);
```

### Adding New Providers

To support a new event provider:

1. Create a new transformer in `models/providers/`
2. Define Zod schemas for the provider's API response
3. Implement transformation functions to map to core models
4. Use the `extras` field for provider-specific data

```typescript
// Example: Eventbrite transformer
export class EventbriteTransformer {
  static validate(rawData: unknown): EventbriteData {
    return EventbriteDataSchema.parse(rawData);
  }

  static transformEvent(ebEvent: EventbriteEvent): Event {
    return new Event({
      id: ebEvent.id,
      title: ebEvent.name.text,
      // ... map fields to core model
      extras: {
        provider: 'eventbrite',
        category: ebEvent.category_id,
        // ... other Eventbrite-specific fields
      }
    });
  }
}
```

## Migration from Legacy Code

### Old Pattern (utils.js)
```javascript
// ❌ Old: Ad-hoc property access, mutation
const events = getSortedEvents(data);
events.forEach(e => {
  console.log(e.data.title);
  console.log(e.data.rsvps.totalCount);
  console.log(e.address); // Mutated in-place by eventAddress()
});
```

### New Pattern
```typescript
// ✅ New: Type-safe, immutable
const events = EventLoader.load(rawData, { onlyActive: true });
events.forEach(e => {
  console.log(e.title);
  console.log(e.rsvpCount);
  console.log(e.address); // Computed property, no mutation
});
```

## Benefits

### For Development
- **IDE autocomplete** - know exactly what properties are available
- **Type safety** - catch errors at compile time
- **Refactoring confidence** - TypeScript tracks all usages
- **Clear data flow** - no hidden mutations or side effects

### For Maintenance
- **Single source of truth** - one place to understand data structure
- **Validation** - catch bad data at the boundary
- **Extensibility** - easy to add new providers
- **Testing** - models are easy to mock and test

### For Users
- **Consistent API responses** - predictable structure
- **Better error handling** - validation catches issues early
- **Performance** - computed properties cached by getters
- **Documentation** - TypeScript types are self-documenting

## Best Practices

1. **Never mutate model instances** - they're designed to be immutable
2. **Use EventLoader for all filtering** - don't duplicate filter logic
3. **Leverage computed properties** - use `event.address` instead of manual formatting
4. **Validate at boundaries** - parse raw data as soon as it enters the system
5. **Use toJSON() for serialization** - consistent API responses
6. **Store provider-specific data in extras** - keep core models clean

## Examples

### Example 1: Get all events in the next week
```typescript
const upcomingEvents = EventLoader.load(rawData, {
  withinDays: 7,
  onlyActive: true,
  endedBufferHours: 0, // Don't include ended events
});
```

### Example 2: Get next event for each group
```typescript
const allEvents = EventLoader.fromMeetupData(rawData);
const nextEvents = EventLoader.getNextEventPerGroup(allEvents);
```

### Example 3: Filter specific groups, no online events
```typescript
const inPersonEvents = EventLoader.load(rawData, {
  groups: ['tampa-devs', 'suncoast-js'],
  excludeOnline: true,
  onlyActive: true,
});
```

### Example 4: Build JSON API response
```typescript
const events = EventLoader.load(rawData, filterOptions);
const response = events.map(e => e.toJSON());
```

### Example 5: Build RSS feed
```typescript
const events = EventLoader.load(rawData, { withinDays: 30 });
const rssItems = events.map(event => ({
  title: event.title,
  link: event.eventUrl,
  description: event.description,
  pubDate: event.dateTime.toUTCString(),
  guid: event.id,
}));
```
