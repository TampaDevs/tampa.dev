#!/usr/bin/env tsx
/**
 * Provider Test Script
 *
 * Usage:
 *   npm run test:providers                           # List configured providers
 *   npm run test:providers -- meetup tampadevs      # Test Meetup with tampadevs group
 *   npm run test:providers -- eventbrite 12345      # Test Eventbrite with organizer ID
 *   npm run test:providers -- luma cal_xxx          # Test Luma with calendar ID
 *   npm run test:providers -- all                   # Test all configured providers
 *
 * Options:
 *   --verbose, -v    Show full event details
 *   --limit N        Limit number of events to fetch (default: 10)
 *   --json           Output raw JSON
 *
 * This script tests the new provider adapters by:
 *   1. Loading credentials from .dev.vars
 *   2. Initializing the specified provider
 *   3. Fetching events and displaying results
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DEV_VARS_FILE = path.join(ROOT_DIR, '.dev.vars');
const OUTPUT_FILE = path.join(ROOT_DIR, '.provider-test-output.json');

// Parse command line args
const args = process.argv.slice(2);
const isVerbose = args.includes('--verbose') || args.includes('-v');
const isJson = args.includes('--json');
const limitIndex = args.findIndex(a => a === '--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1], 10) : 10;

// Remove flags from args to get positional arguments
const positionalArgs = args.filter((a, i) =>
  !a.startsWith('-') &&
  (limitIndex < 0 || i !== limitIndex + 1)
);

/**
 * Load environment variables from .dev.vars file
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
  }

  return vars;
}

/**
 * Create env object from dev vars
 */
function createEnv(devVars: Record<string, string>) {
  return {
    // Meetup
    MEETUP_CLIENT_KEY: process.env.MEETUP_CLIENT_KEY || devVars.MEETUP_CLIENT_KEY,
    MEETUP_SIGNING_KEY: process.env.MEETUP_SIGNING_KEY || devVars.MEETUP_SIGNING_KEY,
    MEETUP_MEMBER_ID: process.env.MEETUP_MEMBER_ID || devVars.MEETUP_MEMBER_ID,
    // Eventbrite
    EVENTBRITE_PRIVATE_TOKEN: process.env.EVENTBRITE_PRIVATE_TOKEN || devVars.EVENTBRITE_PRIVATE_TOKEN,
    // Luma
    LUMA_API_KEY: process.env.LUMA_API_KEY || devVars.LUMA_API_KEY,
    // Mock bindings (not used by providers)
    kv: {} as KVNamespace,
    DB: {} as D1Database,
  };
}

/**
 * Format a date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Print usage help
 */
function printUsage() {
  console.log(`
Usage: npm run test:providers -- [platform] [identifier]

Platforms:
  meetup       Test Meetup adapter (identifier = group urlname)
  eventbrite   Test Eventbrite adapter (identifier = organizer ID)
  luma         Test Luma adapter (identifier = calendar ID)
  all          Test all configured providers with sample identifiers

Options:
  --verbose, -v    Show full event details
  --limit N        Limit number of events (default: 10)
  --json           Output raw JSON

Examples:
  npm run test:providers                              # Show configured providers
  npm run test:providers -- meetup tampadevs         # Test Meetup
  npm run test:providers -- eventbrite 12345678      # Test Eventbrite
  npm run test:providers -- luma cal_abcdefg         # Test Luma
  npm run test:providers -- all                      # Test all providers
`);
}

async function main() {
  console.log('╭──────────────────────────────────────────╮');
  console.log('│       Provider Adapter Test Runner       │');
  console.log('╰──────────────────────────────────────────╯\n');

  // Load environment
  const devVars = loadDevVars();
  const env = createEnv(devVars);

  // Import providers
  const { providerRegistry } = await import('../src/providers/index.js');

  // Get configured providers
  const allAdapters = providerRegistry.getAllAdapters();
  const configuredAdapters = providerRegistry.getConfiguredAdapters(env as any);

  console.log('Registered Providers:');
  for (const adapter of allAdapters) {
    const isConfigured = configuredAdapters.includes(adapter);
    const status = isConfigured ? '✓' : '✗';
    console.log(`  ${status} ${adapter.name} (${adapter.platform})`);
  }
  console.log('');

  // If no args, show usage and exit
  if (positionalArgs.length === 0) {
    printUsage();
    return;
  }

  const [platform, identifier] = positionalArgs;

  // Handle "all" command
  if (platform === 'all') {
    await testAllProviders(env, configuredAdapters, limit);
    return;
  }

  // Find the requested adapter
  const adapter = allAdapters.find(a =>
    a.platform === platform || a.name.toLowerCase() === platform.toLowerCase()
  );

  if (!adapter) {
    console.error(`❌ Unknown platform: ${platform}`);
    console.error(`   Available: ${allAdapters.map(a => a.platform).join(', ')}`);
    process.exit(1);
  }

  if (!identifier) {
    console.error(`❌ Missing identifier for ${adapter.name}`);
    console.error(`   Usage: npm run test:providers -- ${platform} <identifier>`);
    process.exit(1);
  }

  if (!adapter.isConfigured(env as any)) {
    console.error(`❌ ${adapter.name} is not configured`);
    console.error(`   Missing required environment variables`);
    process.exit(1);
  }

  // Test the specific provider
  await testProvider(env, adapter, identifier, limit);
}

async function testProvider(
  env: ReturnType<typeof createEnv>,
  adapter: any,
  identifier: string,
  maxEvents: number
) {
  console.log(`Testing ${adapter.name} with identifier: ${identifier}\n`);

  try {
    // Initialize
    console.log('Initializing...');
    await adapter.initialize(env);
    console.log('✓ Initialized\n');

    // Fetch events
    console.log(`Fetching events (limit: ${maxEvents})...`);
    const startTime = Date.now();
    const result = await adapter.fetchEvents(identifier, { maxEvents });
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`\n❌ Fetch failed: ${result.error}`);
      if (result.rateLimited) {
        console.error(`   Rate limited. Retry after: ${result.retryAfter?.toISOString()}`);
      }
      process.exit(1);
    }

    console.log(`✓ Fetched in ${duration}ms\n`);

    // Output results
    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
      console.log(`\n✓ Saved to ${OUTPUT_FILE}`);
      return;
    }

    // Display group info
    if (result.group) {
      console.log('Group:');
      console.log(`  Name:    ${result.group.name}`);
      console.log(`  URL:     ${result.group.link}`);
      console.log(`  Members: ${result.group.memberCount}`);
      console.log('');
    }

    // Display events
    const events = result.events || [];
    console.log(`Events (${events.length}):`);

    if (events.length === 0) {
      console.log('  No upcoming events found');
    } else {
      for (const event of events) {
        console.log(`\n  ┌─ ${event.title}`);
        console.log(`  │  📅 ${formatDate(event.startTime)}`);
        console.log(`  │  📍 ${event.venue?.name || 'TBD'} (${event.eventType})`);
        console.log(`  │  👥 ${event.rsvpCount} RSVPs`);
        console.log(`  │  🔗 ${event.eventUrl}`);
        if (isVerbose) {
          console.log(`  │  ID: ${event.platformId}`);
          console.log(`  │  Status: ${event.status}`);
          if (event.description) {
            const desc = event.description.slice(0, 100) + (event.description.length > 100 ? '...' : '');
            console.log(`  │  Description: ${desc}`);
          }
        }
        console.log(`  └──`);
      }
    }

    // Save output
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n✓ Full output saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (isVerbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function testAllProviders(
  env: ReturnType<typeof createEnv>,
  adapters: any[],
  maxEvents: number
) {
  // Sample identifiers for each platform
  const sampleIdentifiers: Record<string, string> = {
    meetup: 'tampadevs',
    eventbrite: '', // User needs to provide
    luma: '', // User needs to provide
  };

  console.log('Testing all configured providers...\n');

  if (adapters.length === 0) {
    console.log('❌ No providers are configured');
    console.log('   Check your .dev.vars file');
    return;
  }

  for (const adapter of adapters) {
    const identifier = sampleIdentifiers[adapter.platform];

    if (!identifier) {
      console.log(`⏭  Skipping ${adapter.name} - no sample identifier configured`);
      console.log(`   To test, run: npm run test:providers -- ${adapter.platform} <identifier>\n`);
      continue;
    }

    console.log('─'.repeat(50));
    await testProvider(env, adapter, identifier, maxEvents);
    console.log('');
  }

  console.log('─'.repeat(50));
  console.log('✓ All provider tests complete');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
