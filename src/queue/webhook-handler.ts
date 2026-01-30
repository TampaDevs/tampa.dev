/**
 * Webhook Delivery Handler
 *
 * Processes domain events from the queue and delivers them to registered webhooks.
 * Signs payloads with HMAC-SHA256 and logs delivery results.
 */

import { registerHandler } from './handler.js';
import { createDatabase } from '../db/index.js';
import { webhooks, webhookDeliveries } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { DomainEvent } from '../lib/event-bus.js';
import type { Env } from '../../types/worker.js';

/**
 * Sign a payload with HMAC-SHA256
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deliver a domain event to a single webhook
 */
async function deliverToWebhook(
  webhook: typeof webhooks.$inferSelect,
  event: DomainEvent,
  env: Env
): Promise<void> {
  const db = createDatabase(env.DB);
  const deliveryId = crypto.randomUUID();

  const payload = JSON.stringify({
    id: deliveryId,
    type: event.type,
    timestamp: event.timestamp,
    data: event.payload,
  });

  const signature = await signPayload(payload, webhook.secret);

  let statusCode: number | null = null;
  let responseBody: string | null = null;

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Event-Type': event.type,
        'X-Delivery-ID': deliveryId,
        'User-Agent': 'TampaDevs-Webhooks/1.0',
      },
      body: payload,
    });

    statusCode = response.status;
    responseBody = await response.text().catch(() => null);

    // Truncate response body to 4KB
    if (responseBody && responseBody.length > 4096) {
      responseBody = responseBody.slice(0, 4096) + '... (truncated)';
    }
  } catch (err) {
    statusCode = 0;
    responseBody = err instanceof Error ? err.message : 'Network error';
  }

  // Log the delivery
  await db.insert(webhookDeliveries).values({
    id: deliveryId,
    webhookId: webhook.id,
    eventType: event.type,
    payload,
    statusCode,
    responseBody,
    attempt: 1,
    deliveredAt: new Date().toISOString(),
  });
}

/**
 * Handle a domain event by delivering it to all matching active webhooks
 */
async function handleWebhookDelivery(event: DomainEvent, env: Env): Promise<void> {
  const db = createDatabase(env.DB);

  // Get all active webhooks
  const activeWebhooks = await db.query.webhooks.findMany({
    where: eq(webhooks.isActive, true),
  });

  // Filter webhooks that subscribe to this event type
  const matchingWebhooks = activeWebhooks.filter((wh) => {
    const eventTypes = JSON.parse(wh.eventTypes) as string[];
    return eventTypes.includes('*') || eventTypes.includes(event.type);
  });

  // Deliver to each matching webhook
  await Promise.allSettled(
    matchingWebhooks.map((wh) => deliverToWebhook(wh, event, env))
  );
}

/**
 * Register the webhook handler for all event types (wildcard)
 */
export function registerWebhookHandler(): void {
  registerHandler('*', handleWebhookDelivery);
}
