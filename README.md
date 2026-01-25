# events.api.tampa.dev

Public API to retrieve information about upcoming tech events in the Tampa Bay area.

## API Documentation

Interactive API documentation with all available endpoints is available at:

**https://events.api.tampa.dev/docs**

The OpenAPI specification is available at:

**https://events.api.tampa.dev/openapi.json**

## Quick Start

### Events API

Get all upcoming events:
```
GET https://events.api.tampa.dev/2026-01-25/events
```

Get the next event for each group:
```
GET https://events.api.tampa.dev/2026-01-25/events/next
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
https://events.api.tampa.dev/2026-01-25/events?groups=tampadevs&noonline=1
```

## Widgets

### Next Event Widget

https://events.api.tampa.dev/widget/next-event?groups=tampadevs

Displays the next upcoming event for the specified group(s).

### Events Carousel

https://events.api.tampa.dev/widget/carousel

Displays a carousel of upcoming events.

## Development

To start the local development environment, execute the following command:

```bash
wrangler dev -l
```

Your local instance of the Events API will become available at http://localhost:8787.

## Data Freshness

Data is served from a cache in Workers KV. This cache data is updated every 30 minutes.

# Add Your Meetup

If you'd like us to aggregate event data from your Meetup group, please [open an issue](https://github.com/TampaDevs/events.api.tampa.dev/issues/new/choose).
