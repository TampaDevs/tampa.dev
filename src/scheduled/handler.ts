/**
 * Scheduled Event Handler
 *
 * Handles cron-triggered events to aggregate data from external sources
 * and perform periodic data maintenance.
 */

import { lt } from 'drizzle-orm';
import type { Env } from '../app.js';
import { createDatabase } from '../db/index.js';
import { syncLogs } from '../db/schema.js';
import { SyncService } from '../services/sync.js';
import { EventBus } from '../lib/event-bus.js';
import { providerRegistry } from '../providers/index.js';

/**
 * Handle scheduled (cron) events
 *
 * This is called by Cloudflare Workers when a cron trigger fires.
 * Dispatches to the appropriate handler based on the cron pattern.
 */
export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Scheduled event triggered at ${new Date(controller.scheduledTime).toISOString()}`);
  console.log(`Cron pattern: ${controller.cron}`);

  if (controller.cron === '0 3 * * *') {
    await handleTruncation(env);
  } else {
    await handleSync(env);
  }
}

/**
 * Sync handler — fetches events from all configured platforms
 */
async function handleSync(env: Env): Promise<void> {
  const db = createDatabase(env.DB);
  const syncService = new SyncService(db, providerRegistry, env);

  // Attach event bus if queue is available
  if (env.EVENTS_QUEUE) {
    syncService.setEventBus(new EventBus(env.EVENTS_QUEUE));
  }

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

  for (const groupResult of result.results) {
    if (groupResult.success) {
      console.log(`  ✓ ${groupResult.groupUrlname}: ${groupResult.eventsCreated} created, ${groupResult.eventsUpdated} updated`);
    } else {
      console.log(`  ✗ ${groupResult.groupUrlname}: ${groupResult.error}`);
    }
  }

  if (!result.success && result.succeeded === 0) {
    throw new Error(`Sync failed completely: no groups synced successfully`);
  }
}

/**
 * Truncation handler — deletes stale data
 * - sync_logs older than 30 days
 * - webhook_deliveries older than 7 days (added when webhooks table exists)
 */
async function handleTruncation(env: Env): Promise<void> {
  const db = createDatabase(env.DB);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const syncLogResult = await db
    .delete(syncLogs)
    .where(lt(syncLogs.startedAt, thirtyDaysAgo));

  console.log('Truncation complete: sync_logs older than 30 days deleted');

  // webhook_deliveries truncation will be added in WS5 when the table exists
}
