/**
 * Event Bus
 *
 * Central event bus using Cloudflare Queues. Producers publish domain events
 * (e.g., dev.tampa.user.portfolio_item_created); consumers process them asynchronously.
 *
 * All events are namespaced under `dev.tampa.*` since the queue is shared
 * across multiple applications.
 */

export interface DomainEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  metadata?: { userId?: string; source?: string };
}

export class EventBus {
  constructor(private queue: Queue) {}

  async publish(event: Omit<DomainEvent, 'timestamp'>): Promise<void> {
    await this.queue.send({
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  async publishBatch(events: Omit<DomainEvent, 'timestamp'>[]): Promise<void> {
    if (events.length === 0) return;
    const messages = events.map((e) => ({
      body: { ...e, timestamp: new Date().toISOString() },
    }));
    await this.queue.sendBatch(messages);
  }
}

/**
 * Convenience service for emitting events from within queue handlers
 * (where there's no executionCtx / waitUntil). Guards against missing
 * EVENTS_QUEUE binding and swallows errors silently.
 */
export class NotificationService {
  constructor(private env: { EVENTS_QUEUE?: Queue }) {}

  async emit(event: Omit<DomainEvent, 'timestamp'>): Promise<void> {
    if (!this.env.EVENTS_QUEUE) return;
    const bus = new EventBus(this.env.EVENTS_QUEUE);
    await bus.publish(event).catch(() => {});
  }
}

/**
 * Emit a domain event via the queue, keeping the worker alive with waitUntil.
 * No-ops silently if EVENTS_QUEUE is not bound.
 */
export function emitEvent(
  ctx: { env: { EVENTS_QUEUE?: Queue }; executionCtx: { waitUntil: (p: Promise<unknown>) => void } },
  event: Omit<DomainEvent, 'timestamp'>,
): void {
  if (!ctx.env.EVENTS_QUEUE) return;
  const bus = new EventBus(ctx.env.EVENTS_QUEUE);
  ctx.executionCtx.waitUntil(bus.publish(event).catch(() => {}));
}

/**
 * Emit a batch of domain events via the queue.
 * No-ops silently if EVENTS_QUEUE is not bound or events is empty.
 */
export function emitEvents(
  ctx: { env: { EVENTS_QUEUE?: Queue }; executionCtx: { waitUntil: (p: Promise<unknown>) => void } },
  events: Omit<DomainEvent, 'timestamp'>[],
): void {
  if (!ctx.env.EVENTS_QUEUE || events.length === 0) return;
  const bus = new EventBus(ctx.env.EVENTS_QUEUE);
  ctx.executionCtx.waitUntil(bus.publishBatch(events).catch(() => {}));
}
