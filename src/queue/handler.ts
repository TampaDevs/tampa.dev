/**
 * Queue Consumer Handler
 *
 * Dispatches domain events from Cloudflare Queue to registered handlers.
 */

import type { DomainEvent } from '../lib/event-bus.js';
import type { Env } from '../../types/worker.js';

type EventHandler = (event: DomainEvent, env: Env) => Promise<void>;

const handlers: Record<string, EventHandler[]> = {};

/**
 * Register a handler for a specific event type.
 * Use '*' to handle all event types.
 */
export function registerHandler(eventType: string, handler: EventHandler): void {
  if (!handlers[eventType]) handlers[eventType] = [];
  handlers[eventType].push(handler);
}

/**
 * Process a batch of queue messages, dispatching each to registered handlers.
 */
export async function handleQueueBatch(
  batch: MessageBatch<DomainEvent>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    const event = msg.body;
    const specificHandlers = handlers[event.type] ?? [];
    const wildcardHandlers = handlers['*'] ?? [];
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      // No handlers registered - ack and move on
      msg.ack();
      continue;
    }

    try {
      await Promise.all(allHandlers.map((h) => h(event, env)));
      msg.ack();
    } catch (err) {
      console.error(`Failed to handle ${event.type}:`, err);
      msg.retry();
    }
  }
}
