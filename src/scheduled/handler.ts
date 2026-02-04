/**
 * Scheduled Event Handler
 *
 * Handles cron-triggered events to aggregate data from external sources
 * and perform periodic data maintenance.
 */

import { lt, sql, eq, and, or, isNull } from 'drizzle-orm';
import type { Env } from '../../types/worker.js';
import { createDatabase } from '../db/index.js';
import { syncLogs, badgeClaimLinks, eventCheckinCodes, eventCheckins, oauthClientRegistry } from '../db/schema.js';
import { SyncService } from '../services/sync.js';
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
    await handleSync(env, ctx);
  }
}

/**
 * Sync handler - fetches events from all configured platforms
 */
async function handleSync(env: Env, ctx: ExecutionContext): Promise<void> {
  const db = createDatabase(env.DB);
  const syncService = new SyncService(db, providerRegistry, env);

  // Attach event context for domain event emission
  syncService.setEventContext({ env, executionCtx: ctx });

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
 * Truncation handler - deletes stale data
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

  // Clean up expired badge claim links
  const now = new Date().toISOString();
  await db
    .delete(badgeClaimLinks)
    .where(sql`${badgeClaimLinks.expiresAt} IS NOT NULL AND ${badgeClaimLinks.expiresAt} < ${now}`);

  console.log('Truncation complete: expired badge claim links deleted');

  // Truncate checkin codes and checkins for events that ended > 1 hour ago.
  // We DELETE (not just expire) to keep the database clean over time.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await db
    .delete(eventCheckins)
    .where(sql`${eventCheckins.eventId} IN (
      SELECT id FROM events WHERE end_time IS NOT NULL AND end_time < ${oneHourAgo}
    )`);
  await db
    .delete(eventCheckinCodes)
    .where(sql`${eventCheckinCodes.eventId} IN (
      SELECT id FROM events WHERE end_time IS NOT NULL AND end_time < ${oneHourAgo}
    )`);

  console.log('Truncation complete: expired checkin data deleted');

  // Clean up stale OAuth client registrations
  await cleanupStaleOAuthClients(env);
}

/**
 * OAuth client cleanup - removes unused client registrations.
 *
 * Two-tier policy:
 * - DCR clients: removed if registered > 48 hours ago and never used to sign in
 * - Developer portal clients: removed if unused for > 1 year (or registered > 1 year ago and never used)
 *
 * Deleting a client from KV prevents new auth flows. Existing access tokens
 * expire via their natural TTL; refresh attempts fail because lookupClient()
 * returns null for deleted clients.
 */
async function cleanupStaleOAuthClients(env: Env): Promise<void> {
  const db = createDatabase(env.DB);
  const kv = env.OAUTH_KV;
  if (!kv) return;

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // Stale DCR clients: registered > 48h ago, never used to sign in.
  // Bounded to 500 per run to stay within Workers CPU limits.
  const staleDCR = await db.select({ clientId: oauthClientRegistry.clientId })
    .from(oauthClientRegistry)
    .where(and(
      eq(oauthClientRegistry.source, 'dcr'),
      isNull(oauthClientRegistry.lastGrantAt),
      lt(oauthClientRegistry.registeredAt, twoDaysAgo),
    ))
    .limit(500);

  // Stale developer portal clients: never used AND registered > 1 year ago,
  // OR last sign-in > 1 year ago.
  // Bounded to 500 per run; remainder caught on the next cron cycle.
  const staleDevPortal = await db.select({ clientId: oauthClientRegistry.clientId })
    .from(oauthClientRegistry)
    .where(and(
      eq(oauthClientRegistry.source, 'developer_portal'),
      or(
        and(isNull(oauthClientRegistry.lastGrantAt), lt(oauthClientRegistry.registeredAt, oneYearAgo)),
        lt(oauthClientRegistry.lastGrantAt, oneYearAgo),
      ),
    ))
    .limit(500);

  const allStale = [...staleDCR, ...staleDevPortal];
  let deleted = 0;

  for (const client of allStale) {
    try {
      // Delete D1 registry row first. If this fails, the row persists and
      // will be retried on the next cron run. KV remains intact so the
      // client is still functional until the next successful cleanup.
      await db.delete(oauthClientRegistry)
        .where(eq(oauthClientRegistry.clientId, client.clientId));
      // Delete from KV (prevents new auth flows). This is the
      // security-critical step that actually blocks further use.
      await kv.delete(`client:${client.clientId}`);
      deleted++;
    } catch (e) {
      console.error(`Failed to clean up OAuth client ${client.clientId}:`, e);
    }
  }

  console.log(`OAuth cleanup: ${deleted}/${allStale.length} stale clients removed (${staleDCR.length} DCR, ${staleDevPortal.length} dev portal)`);
}
