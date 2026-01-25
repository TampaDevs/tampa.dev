#!/usr/bin/env tsx
/**
 * Generate JSON Schema files from Zod schemas
 *
 * Usage: npm run generate-schemas
 *
 * This script generates JSON schema files for all model types
 * and saves them to the schemas/ directory. These files can be:
 * - Committed to the repository
 * - Used for validation in other tools
 * - Referenced in API documentation
 * - Served as static files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAllSchemas } from '../lib/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');
const MODELS_DIR = path.join(SCHEMAS_DIR, 'models');

// Ensure schemas directories exist
if (!fs.existsSync(SCHEMAS_DIR)) {
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
}
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

console.log('Generating JSON schemas from Zod schemas...\n');

const allSchemas = getAllSchemas();
let count = 0;

for (const [name, schemaInfo] of Object.entries(allSchemas)) {
  const filename = `${name}.schema.json`;
  const filepath = path.join(MODELS_DIR, filename);

  // Add metadata to the schema
  const schemaWithMeta = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://events.api.tampa.dev/2026-01-25/schemas/${name}`,
    title: schemaInfo.title,
    description: schemaInfo.description,
    ...schemaInfo.schema,
  };

  fs.writeFileSync(filepath, JSON.stringify(schemaWithMeta, null, 2));
  console.log(`✓ Generated ${filename}`);
  count++;
}

// Generate index file listing all schemas
const indexContent = {
  version: '2026-01-25',
  generated: new Date().toISOString(),
  schemas: Object.entries(allSchemas).map(([name, info]) => ({
    name,
    title: info.title,
    description: info.description,
    file: `models/${name}.schema.json`,
    url: `https://events.api.tampa.dev/2026-01-25/schemas/${name}`,
  })),
};

fs.writeFileSync(
  path.join(SCHEMAS_DIR, 'index.json'),
  JSON.stringify(indexContent, null, 2)
);
console.log(`✓ Generated index.json`);

// Generate README
const readme = `# JSON Schemas

Auto-generated JSON schemas for the Events API.

**Generated:** ${new Date().toISOString()}

## Directory Structure

- \`models/\` - JSON schemas for data models (Event, Group, Venue, Photo, Meetup)
- \`openapi.json\` - OpenAPI 3.1 specification for the entire API
- \`index.json\` - Index of all available schemas

## Model Schemas

${Object.entries(allSchemas).map(([name, info]) =>
  `### ${info.title}\n\n${info.description}\n\n- **File:** [\`models/${name}.schema.json\`](./models/${name}.schema.json)\n- **API URL:** \`/2026-01-25/schemas/${name}\``
).join('\n\n')}

## OpenAPI Specification

The complete API specification is available at:

- **File:** [openapi.json](./openapi.json)
- **Interactive Docs:** https://events.api.tampa.dev/docs
- **API URL:** https://events.api.tampa.dev/openapi.json

## Usage

### Validation

You can use these schemas to validate data in any JSON Schema validator:

\`\`\`bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s schemas/models/event.schema.json -d your-event-data.json
\`\`\`

### Documentation

Reference these schemas in your API documentation, OpenAPI specs, or TypeScript types.

### Regeneration

To regenerate these schemas from the Zod definitions:

\`\`\`bash
npm run generate-schemas
\`\`\`

This ensures the schemas stay in sync with the TypeScript models.
`;

fs.writeFileSync(path.join(SCHEMAS_DIR, 'README.md'), readme);
console.log(`✓ Generated README.md`);

console.log(`\n✨ Successfully generated ${count} model schemas in ${MODELS_DIR}`);
console.log(`📝 Run 'npm run generate-openapi' to generate the OpenAPI spec at schemas/openapi.json`);
