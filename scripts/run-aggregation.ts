#!/usr/bin/env tsx
/**
 * Local Event Aggregation Script
 *
 * Usage: npm run aggregate
 *
 * This script tests provider connectivity and fetches events locally.
 * For full D1 sync testing, use `wrangler dev` and call the admin API.
 *
 * Required environment variables (in .dev.vars):
 *   MEETUP_CLIENT_KEY   - Meetup OAuth client key
 *   MEETUP_SIGNING_KEY  - Meetup OAuth private signing key (PEM format)
 *   MEETUP_MEMBER_ID    - Meetup member ID for the OAuth app
 *   EVENTBRITE_PRIVATE_TOKEN - Eventbrite private API token (optional)
 *   LUMA_API_KEY        - Luma API key (optional)
 *
 * Examples:
 *   npm run aggregate                    # Test all configured providers
 *   npm run aggregate -- --dry-run       # Validate config only
 *   npm run aggregate -- --provider meetup  # Test specific provider
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
const providerArg = args.find(a => a.startsWith('--provider='))?.split('=')[1]
  || (args.includes('--provider') ? args[args.indexOf('--provider') + 1] : null);

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
    EVENTBRITE_PRIVATE_TOKEN: process.env.EVENTBRITE_PRIVATE_TOKEN || devVars.EVENTBRITE_PRIVATE_TOKEN,
    LUMA_API_KEY: process.env.LUMA_API_KEY || devVars.LUMA_API_KEY,
  };

  // Import provider registry
  const { providerRegistry } = await import('../src/providers/index.js');

  // Check configured providers
  const configuredProviders = providerRegistry.getConfiguredAdapters(env as any);

  console.log('Provider Status:');
  for (const adapter of providerRegistry.getAllAdapters()) {
    const isConfigured = adapter.isConfigured(env as any);
    const status = isConfigured ? '✓ configured' : '✗ not configured';
    console.log(`  • ${adapter.name}: ${status}`);
  }
  console.log('');

  if (configuredProviders.length === 0) {
    console.error('❌ No providers configured. Check your .dev.vars file.\n');
    console.error('💡 Create a .dev.vars file with your credentials:');
    console.error('   cp .dev.vars.example .dev.vars');
    console.error('   # Then edit .dev.vars with your actual values\n');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('✓ Dry run complete - configuration is valid\n');
    console.log('To run a full sync with D1, use:');
    console.log('  npm start  # start local dev server');
    console.log('  curl -X POST http://localhost:8787/api/admin/sync/all\n');
    return;
  }

  // Filter providers if specified
  let providersToTest = configuredProviders;
  if (providerArg) {
    providersToTest = configuredProviders.filter(p => p.platform === providerArg);
    if (providersToTest.length === 0) {
      console.error(`❌ Provider "${providerArg}" is not configured or doesn't exist.\n`);
      process.exit(1);
    }
  }

  // Initialize and test each provider
  console.log('Testing providers...\n');
  const startTime = Date.now();

  const results: Record<string, any> = {};
  let totalEvents = 0;
  const errors: string[] = [];

  for (const adapter of providersToTest) {
    console.log(`\n─── ${adapter.name} ───`);

    try {
      // Initialize
      await adapter.initialize(env as any);
      console.log(`  ✓ Initialized`);

      // Get a sample group to test
      // For now, use hardcoded test groups
      const testGroups: Record<string, string> = {
        meetup: 'tampadevs',
        eventbrite: '120311328021', // Spark Labs by Ark
        luma: 'tampa-devs', // example
      };

      const testGroup = testGroups[adapter.platform];
      if (testGroup) {
        console.log(`  Fetching: ${testGroup}`);
        const result = await adapter.fetchEvents(testGroup, { maxEvents: 10 });

        if (result.success && result.events) {
          console.log(`  ✓ Fetched ${result.events.length} events`);
          results[adapter.platform] = {
            group: result.group,
            events: result.events,
          };
          totalEvents += result.events.length;

          if (isVerbose && result.events.length > 0) {
            console.log('  Events:');
            for (const event of result.events.slice(0, 3)) {
              console.log(`    • ${event.title} (${event.startTime})`);
            }
            if (result.events.length > 3) {
              console.log(`    ... and ${result.events.length - 3} more`);
            }
          }
        } else {
          console.log(`  ✗ Failed: ${result.error}`);
          errors.push(`${adapter.name}: ${result.error}`);
        }
      } else {
        console.log(`  ⚠ No test group configured for ${adapter.platform}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Error: ${errorMsg}`);
      errors.push(`${adapter.name}: ${errorMsg}`);
      if (isVerbose && error instanceof Error && error.stack) {
        console.log(error.stack);
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Save results
  if (totalEvents > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n✓ Saved results to ${OUTPUT_FILE}`);
  }

  // Summary
  console.log('\n╭──────────────────────────────────────────╮');
  console.log('│              Test Results                │');
  console.log('╰──────────────────────────────────────────╯\n');

  console.log(`  Providers tested: ${providersToTest.length}`);
  console.log(`  Total events:     ${totalEvents}`);
  console.log(`  Duration:         ${duration}s`);
  console.log(`  Errors:           ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n  Errors:');
    for (const err of errors) {
      console.log(`    • ${err}`);
    }
  }

  console.log('\n💡 For full D1 sync, start the dev server and use the admin API:');
  console.log('   npm start');
  console.log('   curl -X POST http://localhost:8787/api/admin/sync/all\n');

  process.exit(errors.length === providersToTest.length ? 1 : 0);
}

main();
