# Tampa.dev Events API & Website

This repository contains both the **Events API** and the **tampa.dev** website for discovering tech events in the Tampa Bay area.

- **Website**: [tampa.dev](https://tampa.dev)
- **API**: [events.api.tampa.dev](https://events.api.tampa.dev)

## Add Your Group

Want your group included in the Tampa Bay events feed?

[![Add Your Group](https://img.shields.io/badge/Add_Your_Group-Click_Here-green?style=for-the-badge&logo=meetup)](https://github.com/TampaDevs/events.api.tampa.dev/issues/new/choose)

---

## API Documentation

Interactive API documentation with all available endpoints is available at:

**https://events.api.tampa.dev/docs**

The OpenAPI specification is available at:

**https://events.api.tampa.dev/openapi.json**

## API Clients

Auto-generated API clients are available for multiple languages. Clients are automatically regenerated and published when the API schema changes.

### TypeScript / JavaScript

```bash
npm install @tampadevs/events-api-client --registry=https://npm.pkg.github.com
```

```typescript
import { EventsApi } from '@tampadevs/events-api-client';

const api = new EventsApi();
const events = await api.getEvents();
```

### Go

```bash
go get github.com/TampaDevs/events.api.tampa.dev/clients/go
```

```go
package main

import (
    "context"
    "fmt"
    tampaevents "github.com/TampaDevs/events.api.tampa.dev/clients/go"
)

func main() {
    cfg := tampaevents.NewConfiguration()
    client := tampaevents.NewAPIClient(cfg)

    events, _, err := client.EventsAPI.GetEvents(context.Background()).Execute()
    if err != nil {
        panic(err)
    }

    for _, event := range events {
        fmt.Println(event.GetTitle())
    }
}
```

### Python

```bash
pip install git+https://github.com/TampaDevs/events.api.tampa.dev.git#subdirectory=clients/python
```

```python
from tampa_events_api import ApiClient, EventsApi

client = ApiClient()
api = EventsApi(client)

events = api.get_events()
for event in events:
    print(event.title)
```

### Ruby

```bash
gem install tampa_events_api --source "https://rubygems.pkg.github.com/tampadevs"
```

```ruby
require 'tampa_events_api'

api = TampaEventsAPI::EventsApi.new

events = api.get_events
events.each do |event|
  puts event.title
end
```

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

### Events API

To start the local API development environment:

```bash
npm install
npm start
```

Your local instance of the Events API will become available at http://localhost:8787.

```bash
npm test
```

### Website (tampa.dev)

The website is a React Router 7 app deployed to Cloudflare Workers.

```bash
cd web
npm install
npm run dev
```

Your local instance will be available at http://localhost:5173.

```bash
npm run typecheck  # Type check
npm test           # Run tests
npm run build      # Build for production
```

## Environment Variables

Copy `.dev.vars.example` to `.dev.vars` and fill in the required values:

```bash
cp .dev.vars.example .dev.vars
```

### Required for Authentication

- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth app credentials
- `SESSION_SECRET` - Random secret for session signing (generate with `openssl rand -base64 32`)

### Required for File Uploads (R2)

User avatars and OAuth app logos are stored in Cloudflare R2:

1. Create an R2 bucket named `tampa-dev-uploads-public` in the Cloudflare dashboard
2. Create an R2 API token with Object Read & Write permissions
3. Set these environment variables:
   - `R2_ACCOUNT_ID` - Your Cloudflare account ID
   - `R2_ACCESS_KEY_ID` - R2 API token access key
   - `R2_SECRET_ACCESS_KEY` - R2 API token secret key
   - `UPLOADS_PUBLIC_URL` - (Optional) Custom domain for the R2 bucket

### Meetup API (for event aggregation)

- `MEETUP_CLIENT_KEY` - Meetup OAuth client key
- `MEETUP_MEMBER_ID` - Your Meetup member ID
- `MEETUP_SIGNING_KEY` - RSA private key for JWT signing

## Data Freshness

Data is served from a cache in Workers KV. This cache data is updated every 30 minutes.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for recent updates and new features.
