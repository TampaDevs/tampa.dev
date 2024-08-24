# events.api.tampa.dev

Public API to retrieve information about upcoming tech events in the Tampa Bay area.

## Usage

Simply send a GET request to https://events.api.tampa.dev/.

Want an RSS feed? Grab it at https://events.api.tampa.dev/rss.

Want an iCal feed? It's at https://events.api.tampa.dev/ical.

You can also access this API at the following additional URLs:

- https://tampa.dev/events.json (for JSON),
- https://tampa.dev/feed (for RSS), and
- https://tampa.dev/webcal (for iCal)

### Filters

You can supply optional filters as query parameters:

- `groups`: A comma-separated list of groups to return. These should match the group's `urlname` (e.g., `tampadevs`).
- `noempty`: Filter groups with no upcoming events from the response.
- `noonline`: Filter online events from the response.

_Note: These filters also work when you're requesting results in iCal, HTML, RSS, and any other formats._

Example:

https://events.api.tampa.dev/?groups=tampadevs,tampa-bay-techies&noonline&noempty

## Widgets

The Events API also provides several HTML views and embeddable widgets. These support the same parameters as the other API routes. 

### Next Event Widget

https://events.api.tampa.dev/widget/next-event?groups=tampadevs

_Note: This widget is intended to display events for a single group, so remember to specify the `groups` query parameter with a single group name._

### Events Carousel

https://events.api.tampa.dev/widget/carousel

### Upcoming Events Page

https://events.api.tampa.dev/html or https://tampa.dev/upcoming-events

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
