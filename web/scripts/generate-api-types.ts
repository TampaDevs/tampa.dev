#!/usr/bin/env npx tsx
/**
 * Generate TypeScript types from the OpenAPI spec
 *
 * Usage:
 *   npm run generate:types        # Uses production API
 *   npm run generate:types:local  # Uses local dev server
 */

import fs from "node:fs";
import path from "node:path";
import openapiTS, { astToString } from "openapi-typescript";

const PRODUCTION_URL = "https://events.api.tampa.dev/openapi.json";
const LOCAL_URL = "http://localhost:8787/openapi.json";

async function generateTypes() {
  const useLocal = process.argv.includes("--local");
  const specUrl = useLocal ? LOCAL_URL : PRODUCTION_URL;

  console.log(`Fetching OpenAPI spec from ${specUrl}...`);

  try {
    const ast = await openapiTS(new URL(specUrl));
    const contents = astToString(ast);

    // Add header comment
    const output = `/**
 * Auto-generated TypeScript types from OpenAPI spec
 * DO NOT EDIT MANUALLY
 *
 * Generated from: ${specUrl}
 * Generated at: ${new Date().toISOString()}
 *
 * Regenerate with: npm run generate:types
 */

${contents}`;

    const outputPath = path.join(
      import.meta.dirname,
      "../app/lib/api-types.generated.ts"
    );

    fs.writeFileSync(outputPath, output);
    console.log(`Types generated successfully: ${outputPath}`);
  } catch (error) {
    console.error("Failed to generate types:", error);
    process.exit(1);
  }
}

generateTypes();
