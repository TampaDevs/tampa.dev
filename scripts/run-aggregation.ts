#!/usr/bin/env tsx
/**
 * Local Event Aggregation Script
 *
 * Usage: npm run aggregate
 *
 * This script runs the event aggregation process locally for testing.
 * It reads secrets from environment variables or a .dev.vars file.
 *
 * Required environment variables:
 *   MEETUP_CLIENT_KEY   - Meetup OAuth client key
 *   MEETUP_SIGNING_KEY  - Meetup OAuth private signing key (PEM format)
 *   MEETUP_MEMBER_ID    - Meetup member ID for the OAuth app
 *
 * The script will:
 *   1. Load credentials from environment or .dev.vars
 *   2. Run the aggregation against live Meetup API
 *   3. Save results to .aggregation-output.json for inspection
 *
 * Examples:
 *   npm run aggregate
 *   npm run aggregate -- --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DEV_VARS_FILE = path.join(ROOT_DIR, '.dev.vars');
const OUTPUT_FILE = path.join(ROOT_DIR, '.aggregation-output.json');

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose') || args.includes('-v');

/**
 * Load environment variables from .dev.vars file
 * Format: KEY=value (one per line)
 */
function loadDevVars(): Record<string, string> {
  const vars: Record<string, string> = {};

  if (fs.existsSync(DEV_VARS_FILE)) {
    const content = fs.readFileSync(DEV_VARS_FILE, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          // Convert literal \n to actual newlines (for PEM keys)
          value = value.replace(/\\n/g, '\n');
          vars[key] = value;
        }
      }
    }
    console.log(`✓ Loaded ${Object.keys(vars).length} variables from .dev.vars\n`);
  }

  return vars;
}

/**
 * Create a mock KV namespace that stores data in memory
 * and writes to a file on put()
 */
function createMockKV(): KVNamespace {
  const store: Record<string, string> = {};

  return {
    get: async (key: string) => store[key] || null,
    put: async (key: string, value: string) => {
      store[key] = value;
      // Write to file for inspection
      const data = JSON.parse(value);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log(`\n✓ Saved aggregation output to ${OUTPUT_FILE}`);
    },
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

async function main() {
  console.log('╭──────────────────────────────────────────╮');
  console.log('│     Event Aggregation - Local Runner     │');
  console.log('╰──────────────────────────────────────────╯\n');

  if (isDryRun) {
    console.log('🔍 Dry run mode - will validate config without fetching\n');
  }

  // Load environment variables
  const devVars = loadDevVars();
  const env = {
    MEETUP_CLIENT_KEY: process.env.MEETUP_CLIENT_KEY || devVars.MEETUP_CLIENT_KEY,
    MEETUP_SIGNING_KEY: process.env.MEETUP_SIGNING_KEY || devVars.MEETUP_SIGNING_KEY,
    MEETUP_MEMBER_ID: process.env.MEETUP_MEMBER_ID || devVars.MEETUP_MEMBER_ID,
    kv: createMockKV(),
    CF_VERSION_METADATA: { id: 'local', tag: 'dev', timestamp: new Date().toISOString() },
  };

  // Check required credentials
  const requiredVars = ['MEETUP_CLIENT_KEY', 'MEETUP_SIGNING_KEY', 'MEETUP_MEMBER_ID'];
  const missing = requiredVars.filter(v => !env[v as keyof typeof env]);

  if (missing.length > 0) {
    console.error('❌ Missing required credentials:\n');
    for (const v of missing) {
      console.error(`   • ${v}`);
    }
    console.error('\n💡 Create a .dev.vars file with your credentials:');
    console.error('   cp .dev.vars.example .dev.vars');
    console.error('   # Then edit .dev.vars with your actual values\n');
    process.exit(1);
  }

  console.log('✓ All required credentials found\n');

  // Import and run aggregation
  const { runAggregation } = await import('../src/scheduled/aggregator.js');
  const { platformRegistry } = await import('../src/scheduled/platforms/base.js');
  const { getAllGroups } = await import('../src/scheduled/groups.js');

  // Show configuration
  const platforms = platformRegistry.getAll();
  const groups = getAllGroups();
  const configuredPlatforms = platformRegistry.getConfigured(env as any);

  console.log('Configuration:');
  console.log(`  • Platforms: ${platforms.map(p => p.name).join(', ')}`);
  console.log(`  • Configured: ${configuredPlatforms.map(p => p.name).join(', ') || 'none'}`);
  console.log(`  • Groups: ${groups.length}`);
  console.log('');

  if (isDryRun) {
    console.log('✓ Dry run complete - configuration is valid\n');
    if (isVerbose) {
      console.log('Groups to fetch:');
      groups.forEach(g => console.log(`  • ${g.urlname} (${g.platform})`));
    }
    return;
  }

  // Run aggregation
  console.log('Starting aggregation...\n');
  const startTime = Date.now();

  try {
    const result = await runAggregation(env as any);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╭──────────────────────────────────────────╮');
    console.log('│              Aggregation Results         │');
    console.log('╰──────────────────────────────────────────╯\n');

    console.log(`  Status:      ${result.success ? '✓ Success' : '✗ Failed'}`);
    console.log(`  Processed:   ${result.groupsProcessed} groups`);
    console.log(`  Failed:      ${result.groupsFailed} groups`);
    console.log(`  Duration:    ${duration}s`);

    if (result.errors.length > 0) {
      console.log('\n  Errors:');
      result.errors.forEach(e => console.log(`    • ${e}`));
    }

    console.log('');

    if (result.success) {
      console.log(`💡 View the output: cat ${OUTPUT_FILE} | head -100\n`);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Aggregation failed with error:');
    console.error(error instanceof Error ? error.message : String(error));
    if (isVerbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
