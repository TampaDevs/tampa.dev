/**
 * Event Bus
 *
 * Central event bus using Cloudflare Queues. Producers publish domain events
 * (e.g., event.created, sync.completed); consumers process them asynchronously.
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
