# JSON Schemas

Auto-generated JSON schemas for the Events API.

**Generated:** 2026-01-30T04:13:02.382Z

## Directory Structure

- `models/` - JSON schemas for data models (Event, Group, Venue, Photo, Meetup)
- `openapi.json` - OpenAPI 3.1 specification for the entire API
- `index.json` - Index of all available schemas

## Model Schemas

### Event Schema

Schema for event data - core fields common across event providers

- **File:** [`models/event.schema.json`](./models/event.schema.json)
- **API URL:** `/2026-01-25/schemas/event`

### Group Schema

Schema for group/organization data

- **File:** [`models/group.schema.json`](./models/group.schema.json)
- **API URL:** `/2026-01-25/schemas/group`

### Venue Schema

Schema for venue/location data

- **File:** [`models/venue.schema.json`](./models/venue.schema.json)
- **API URL:** `/2026-01-25/schemas/venue`

### Photo Schema

Schema for photo data

- **File:** [`models/photo.schema.json`](./models/photo.schema.json)
- **API URL:** `/2026-01-25/schemas/photo`

### Meetup API Data Schema

Schema for Meetup API response data (provider-specific)

- **File:** [`models/meetup.schema.json`](./models/meetup.schema.json)
- **API URL:** `/2026-01-25/schemas/meetup`

## OpenAPI Specification

The complete API specification is available at:

- **File:** [openapi.json](./openapi.json)
- **Interactive Docs:** https://api.tampa.dev/docs
- **API URL:** https://api.tampa.dev/openapi.json

## Usage

### Validation

You can use these schemas to validate data in any JSON Schema validator:

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s schemas/models/event.schema.json -d your-event-data.json
```

### Documentation

Reference these schemas in your API documentation, OpenAPI specs, or TypeScript types.

### Regeneration

To regenerate these schemas from the Zod definitions:

```bash
npm run generate-schemas
```

This ensures the schemas stay in sync with the TypeScript models.
