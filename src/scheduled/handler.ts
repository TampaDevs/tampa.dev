/**
 * Scheduled Event Handler
 *
 * Handles cron-triggered events to aggregate data from external sources.
 */

import type { Env } from '../app.js';
import { createDatabase } from '../db/index.js';
import { SyncService } from '../services/sync.js';
import { providerRegistry } from '../providers/index.js';

/**
 * Handle scheduled (cron) events
 *
 * This is called by Cloudflare Workers when a cron trigger fires.
 * It fetches events from all configured platforms and stores them in D1.
 */
export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Scheduled event triggered at ${new Date(controller.scheduledTime).toISOString()}`);
  console.log(`Cron pattern: ${controller.cron}`);

  // Create database instance
  const db = createDatabase(env.DB);

  // Create sync service
  const syncService = new SyncService(db, providerRegistry, env);

  // Initialize all configured providers
  await providerRegistry.initializeAll(env);

  const configuredAdapters = providerRegistry.getConfiguredAdapters(env);
  console.log(`Configured adapters: ${configuredAdapters.map(a => a.name).join(', ') || 'none'}`);

  // Run sync for all active groups
  const result = await syncService.syncAllGroups({ concurrency: 5 });

  console.log('Sync complete:', {
    success: result.success,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    durationMs: result.durationMs,
  });

  // Log individual group results
  for (const groupResult of result.results) {
    if (groupResult.success) {
      console.log(`  ✓ ${groupResult.groupUrlname}: ${groupResult.eventsCreated} created, ${groupResult.eventsUpdated} updated`);
    } else {
      console.log(`  ✗ ${groupResult.groupUrlname}: ${groupResult.error}`);
    }
  }

  // If all groups failed, throw an error
  if (!result.success && result.succeeded === 0) {
    throw new Error(`Sync failed completely: no groups synced successfully`);
  }
}
