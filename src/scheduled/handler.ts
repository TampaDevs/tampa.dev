/**
 * Scheduled Event Handler
 *
 * Handles cron-triggered events to aggregate data from external sources.
 */

import type { Env } from '../app.js';
import { runAggregation } from './aggregator.js';

/**
 * Handle scheduled (cron) events
 *
 * This is called by Cloudflare Workers when a cron trigger fires.
 * It fetches events from all configured platforms and stores them in KV.
 */
export async function handleScheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log(`Scheduled event triggered at ${new Date(controller.scheduledTime).toISOString()}`);
  console.log(`Cron pattern: ${controller.cron}`);

  const result = await runAggregation(env);

  console.log('Aggregation complete:', {
    success: result.success,
    groupsProcessed: result.groupsProcessed,
    groupsFailed: result.groupsFailed,
    durationMs: result.durationMs,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });

  // If aggregation had errors but some groups succeeded,
  // we don't throw - partial success is acceptable
  if (!result.success && result.groupsProcessed === 0) {
    throw new Error(`Aggregation failed completely: ${result.errors.join(', ')}`);
  }
}
