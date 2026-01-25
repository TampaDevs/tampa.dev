#!/usr/bin/env tsx
/**
 * Generate OpenAPI specification file
 *
 * Usage: npm run generate-openapi [url]
 *
 * This script fetches the OpenAPI 3.1 specification from a running server
 * and saves it to schemas/openapi.json. This file can be:
 * - Committed to the repository
 * - Used to generate client SDKs
 * - Imported into API testing tools
 * - Used for API documentation
 *
 * Arguments:
 *   url - The URL to fetch the spec from (default: http://localhost:8787/openapi.json)
 *
 * Examples:
 *   npm run generate-openapi
 *   npm run generate-openapi https://events.api.tampa.dev/openapi.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');
const OUTPUT_FILE = path.join(SCHEMAS_DIR, 'openapi.json');

const DEFAULT_URL = 'http://localhost:8787/openapi.json';
const url = process.argv[2] || DEFAULT_URL;

console.log('Generating OpenAPI specification...\n');
console.log(`Fetching from: ${url}\n`);

async function generateSpec() {
  try {
    // Fetch the spec from the running server
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const spec = await response.json();

    // Ensure schemas directory exists
    if (!fs.existsSync(SCHEMAS_DIR)) {
      fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
    }

    // Write the spec to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2));
    console.log(`✓ Generated openapi.json`);

    // Count paths and operations
    const paths = Object.keys(spec.paths || {});
    const operations = paths.reduce((count: number, path: string) => {
      return count + Object.keys(spec.paths[path]).filter((k: string) => !k.startsWith('$')).length;
    }, 0);

    console.log(`\n✨ OpenAPI specification generated at ${OUTPUT_FILE}`);
    console.log(`   ${paths.length} paths, ${operations} operations`);
    console.log('\n💡 Use this spec to generate client SDKs:');
    console.log('   npm install -g @openapitools/openapi-generator-cli');
    console.log('   openapi-generator-cli generate -i schemas/openapi.json -g typescript-axios -o clients/typescript\n');

  } catch (error) {
    console.error(`❌ Error fetching OpenAPI spec from ${url}`);
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n💡 Make sure the dev server is running:');
    console.error('   1. Start the server: npm start');
    console.error('   2. In another terminal: npm run generate-openapi\n');
    console.error('   Or fetch from production:');
    console.error('   npm run generate-openapi https://events.api.tampa.dev/openapi.json\n');
    process.exit(1);
  }
}

generateSpec();
