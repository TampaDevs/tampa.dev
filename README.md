# events.api.tampa.dev

Public API to retrieve information about upcoming tech events in the Tampa Bay area.

## Add Your Meetup

Want your tech meetup included in the Tampa Bay events feed?

[![Add Your Meetup](https://img.shields.io/badge/Add_Your_Meetup-Click_Here-green?style=for-the-badge&logo=meetup)](https://github.com/TampaDevs/events.api.tampa.dev/issues/new/choose)

---

## API Documentation

Interactive API documentation with all available endpoints is available at:

**https://events.api.tampa.dev/docs**

The OpenAPI specification is available at:

**https://events.api.tampa.dev/openapi.json**

## API Clients

Auto-generated API clients are available for multiple languages:

| Language | Package |
|----------|---------|
| TypeScript | [`clients/typescript`](./clients/typescript) |
| Python | [`clients/python`](./clients/python) |
| Go | [`clients/go`](./clients/go) |
| Ruby | [`clients/ruby`](./clients/ruby) |

Clients are automatically regenerated when the API schema changes.

## JSON Schemas

JSON Schema definitions for all data models are available in [`schemas/models/`](./schemas/models/):

- [`event.schema.json`](./schemas/models/event.schema.json) - Event data
- [`group.schema.json`](./schemas/models/group.schema.json) - Meetup group data
- [`venue.schema.json`](./schemas/models/venue.schema.json) - Venue/location data
- [`photo.schema.json`](./schemas/models/photo.schema.json) - Photo data

## Quick Start

### Events API

Get all upcoming events:
```
GET https://events.api.tampa.dev/events
```

Get the next event for each group:
```
GET https://events.api.tampa.dev/events/next
```

### Feed Formats

RSS Feed:
```
https://events.api.tampa.dev/rss
```

iCalendar Feed:
```
https://events.api.tampa.dev/ical
```

### HTML Pages

Upcoming Events Page:
```
https://events.api.tampa.dev/html
```

### Filters

All endpoints support optional query parameters:

- `groups` - Comma-separated list of group urlnames (e.g., `tampadevs,suncoast-js`)
- `noempty` - Exclude groups with no upcoming events
- `noonline` - Exclude online events
- `within_hours` - Only show events within the next N hours
- `within_days` - Only show events within the next N days

Example:
```
https://events.api.tampa.dev/events?groups=tampadevs&noonline=1
```

## Widgets

### Next Event Widget

https://events.api.tampa.dev/widget/next-event?groups=tampadevs

Displays the next upcoming event for the specified group(s).

### Events Carousel

https://events.api.tampa.dev/widget/carousel

Displays a carousel of upcoming events.

## Development

To start the local development environment:

```bash
npm install
npm start
```

Your local instance of the Events API will become available at http://localhost:8787.

### Running Tests

```bash
npm test
```

## Data Freshness

Data is served from a cache in Workers KV. This cache data is updated every 30 minutes.
