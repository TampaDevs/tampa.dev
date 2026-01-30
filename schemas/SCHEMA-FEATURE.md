# JSON Schema Generation

This feature provides **auto-generated JSON schemas** from your Zod model definitions, ensuring your schemas always stay in sync with your TypeScript types.

## Overview

The Events API now provides JSON schemas in two ways:

1. **Dynamic API Routes** - Served in real-time from `/2026-01-25/schemas/*`
2. **Static Files** - Generated in the `schemas/` directory and committed to the repo

Both approaches use the **exact same source of truth**: your Zod schemas in the `models/` directory.

## API Routes

### List All Schemas

**GET `/2026-01-25/schemas`**

Returns a list of all available schemas with metadata:

```json
{
  "schemas": [
    {
      "name": "event",
      "title": "Event Schema",
      "description": "Schema for event data - core fields common across event providers",
      "url": "/2026-01-25/schemas/event"
    },
    {
      "name": "group",
      "title": "Group Schema",
      "description": "Schema for group/organization data",
      "url": "/2026-01-25/schemas/group"
    },
    ...
  ],
  "version": "2026-01-25"
}
```

### Get Specific Schema

**GET `/2026-01-25/schemas/{name}`**

Returns the JSON Schema for a specific model type.

Available schemas:
- `/2026-01-25/schemas/event` - Event model
- `/2026-01-25/schemas/group` - Group model
- `/2026-01-25/schemas/venue` - Venue model
- `/2026-01-25/schemas/photo` - Photo model
- `/2026-01-25/schemas/meetup` - Meetup API data (provider-specific)

**Response Headers:**
- `Content-Type: application/schema+json`
- `Cache-Control: public, max-age=86400` (24 hours)
- `Access-Control-Allow-Origin: *`

**Example Response:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://api.tampa.dev/2026-01-25/schemas/event",
  "title": "Event Schema",
  "description": "Schema for event data - core fields common across event providers",
  "$ref": "#/definitions/Event",
  "definitions": {
    "Event": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "dateTime": { "type": "string", "format": "date-time" },
        ...
      },
      "required": ["id", "title", "dateTime", ...]
    }
  }
}
```

## Static Files

JSON schema files are generated in the `schemas/` directory:

```
schemas/
├── event.schema.json      # Event model schema
├── group.schema.json      # Group model schema
├── venue.schema.json      # Venue model schema
├── photo.schema.json      # Photo model schema
├── meetup.schema.json     # Meetup API schema
├── index.json             # Schema registry
└── README.md              # Documentation
```

### Generating Static Files

Run the generator script:

```bash
npm run generate-schemas
```

This command:
1. Reads all Zod schemas from `models/`
2. Converts them to JSON Schema format using `zod-to-json-schema`
3. Adds metadata ($schema, $id, title, description)
4. Writes files to `schemas/` directory
5. Creates an index and README

**When to regenerate:**
- After modifying any Zod schema in `models/`
- Before committing schema-related changes
- As part of your CI/CD pipeline

## Implementation Details

### Source Files

- **`lib/schemas.ts`** - Schema generation logic
  - Converts Zod schemas to JSON Schema
  - Provides programmatic access to schemas
  - Used by both API routes and static generation

- **`scripts/generate-schemas.ts`** - Static file generator
  - Generates all schema files
  - Creates index and README
  - Can be run manually or in CI

- **`src/index.ts`** - API route handlers
  - Serves schemas dynamically
  - Returns 404 for unknown schemas
  - Caches responses for 24 hours

### Dependencies

- **`zod`** - Schema definition and validation (v3.22+)
- **`zod-to-json-schema`** - Converts Zod schemas to JSON Schema (v3.25+)
- **`tsx`** - TypeScript execution for scripts (dev only)

**Important:** Make sure `zod` is explicitly installed to avoid version conflicts with transitive dependencies.

## Use Cases

### 1. API Documentation

Reference schemas in your OpenAPI/Swagger specs:

```yaml
components:
  schemas:
    Event:
      $ref: 'https://api.tampa.dev/2026-01-25/schemas/event'
```

### 2. Data Validation

Validate data in external tools:

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate event data
ajv validate -s schemas/event.schema.json -d my-event.json
```

### 3. Code Generation

Generate types for other languages:

```bash
# Generate TypeScript types from JSON Schema
quicktype schemas/event.schema.json -o EventTypes.ts
```

### 4. Client Libraries

Use schemas for runtime validation in client apps:

```typescript
import Ajv from 'ajv';
import eventSchema from './schemas/event.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(eventSchema);

if (validate(data)) {
  // data is valid
} else {
  console.error(validate.errors);
}
```

### 5. Documentation Sites

Generate documentation from schemas:

```bash
# Using json-schema-docs
npx json-schema-docs schemas/event.schema.json
```

## Maintenance

### Adding New Models

1. Create Zod schema in `models/`
2. Export from `models/index.ts`
3. Add getter function in `lib/schemas.ts`:
   ```typescript
   export function getMyModelSchema(): SchemaInfo {
     return {
       name: 'MyModel',
       title: 'My Model Schema',
       description: 'Schema for my model data',
       schema: zodToJsonSchema(MyModelSchema, 'MyModel'),
     };
   }
   ```
4. Add to `getAllSchemas()` map
5. Run `npm run generate-schemas`
6. Commit the generated files

### Modifying Existing Models

1. Update Zod schema in `models/`
2. Run tests: `npm test`
3. Regenerate schemas: `npm run generate-schemas`
4. Review the diff in `schemas/`
5. Commit changes

### Versioning

When making breaking changes:

1. Create new versioned routes: `/2026-XX-XX/schemas/`
2. Update schema $id URLs to match
3. Document migration path
4. Deprecate old routes after transition period

## Troubleshooting

### Empty Schemas Generated

**Problem:** Generated schemas have empty definitions:
```json
{ "definitions": { "Event": {} } }
```

**Solution:** Check Zod version compatibility. `zod-to-json-schema` requires Zod v3.22+. Install explicitly:
```bash
npm install zod@^3.22.0
```

### Schema Not Found (404)

**Problem:** API returns 404 for valid schema name.

**Solution:** Check that:
1. Schema is exported from `models/index.ts`
2. Schema getter exists in `lib/schemas.ts`
3. Schema is added to `getAllSchemas()` map
4. Schema name is lowercase in URL

### Nested Objects Not Inlined

**Problem:** Schemas use `$ref` instead of inline definitions.

**Solution:** This is expected behavior. The schemas use JSON Schema's definition references for cleaner output. If you need fully inlined schemas, modify `lib/schemas.ts` to use `$refStrategy: 'none'`.

---

**Last Updated:** 2026-01-25
**Generated By:** `npm run generate-schemas`
