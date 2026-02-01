/**
 * Test Environment Builder
 *
 * Assembles a full Env object from Miniflare bindings + mocks
 * for services that can't run outside Workers (Queue, DurableObjects, OAuth).
 */

import type { Env } from '../../../types/worker';

export interface CapturedMessage {
  body: unknown;
  contentType?: string;
}

export interface MockQueue {
  messages: CapturedMessage[];
  send(body: unknown, options?: { contentType?: string }): Promise<void>;
  sendBatch(messages: { body: unknown; contentType?: string }[]): Promise<void>;
}

function createMockQueue(): MockQueue {
  const messages: CapturedMessage[] = [];
  return {
    messages,
    async send(body: unknown, options?: { contentType?: string }) {
      messages.push({ body, contentType: options?.contentType });
    },
    async sendBatch(batch: { body: unknown; contentType?: string }[]) {
      for (const msg of batch) {
        messages.push({ body: msg.body, contentType: msg.contentType });
      }
    },
  };
}

/** Minimal DurableObjectNamespace mock — tests that need real DO behavior should use Miniflare DO bindings */
function createMockDONamespace(): DurableObjectNamespace {
  return {
    get() {
      return {
        fetch: async () => new Response('ok'),
      } as unknown as DurableObjectStub;
    },
    idFromName() {
      return {} as DurableObjectId;
    },
    idFromString() {
      return {} as DurableObjectId;
    },
    newUniqueId() {
      return {} as DurableObjectId;
    },
    jurisdiction() {
      return this;
    },
  } as unknown as DurableObjectNamespace;
}

export function createTestEnv(overrides?: Partial<Env>): { env: Env; mockQueue: MockQueue } {
  const { DB, kv, OAUTH_KV, UPLOADS_BUCKET } = globalThis.__TEST_ENV__;
  const mockQueue = createMockQueue();

  const env: Env = {
    // Real bindings from Miniflare
    DB,
    kv,
    OAUTH_KV,
    UPLOADS_BUCKET,

    // Mock bindings
    EVENTS_QUEUE: mockQueue as unknown as Queue,
    USER_NOTIFICATIONS: createMockDONamespace(),
    BROADCAST: createMockDONamespace(),
    OAUTH_PROVIDER: {} as Env['OAUTH_PROVIDER'],

    // Test config
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long',
    ENVIRONMENT: 'test',
    ADMIN_ALLOWLIST: 'testadmin',

    // Apply any overrides
    ...overrides,
  };

  return { env, mockQueue };
}
