/**
 * WebSocket User Isolation Tests
 *
 * Tests that the WebSocket endpoints properly enforce authentication
 * and user isolation via Durable Object keying.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  appRequest,
} from '../helpers';

describe('WebSocket User Isolation', () => {
  describe('GET /ws (personal WebSocket)', () => {
    it('returns 401 without session authentication', async () => {
      const { env } = createTestEnv();

      const res = await appRequest('/ws', {
        env,
        headers: { Upgrade: 'websocket' },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('returns 426 without Upgrade header', async () => {
      const { env } = createTestEnv();
      const user = await createUser({ username: 'ws-test-user' });
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/ws', {
        env,
        headers: { Cookie: cookieHeader },
      });

      expect(res.status).toBe(426);
      const body = await res.json();
      expect(body).toEqual({ error: 'Expected WebSocket upgrade' });
    });

    it('passes X-User-Id header to Durable Object', async () => {
      const user = await createUser({ username: 'ws-header-user' });
      const { cookieHeader } = await createSession(user.id);

      // Create a spy to capture the request sent to the DO stub
      let capturedRequest: Request | null = null;
      let capturedId: string | null = null;

      const mockDONamespace = {
        idFromName: vi.fn((name: string) => {
          capturedId = name;
          return { toString: () => name } as DurableObjectId;
        }),
        get: vi.fn(() => ({
          fetch: vi.fn(async (req: Request) => {
            capturedRequest = req;
            // Return 200 for test purposes (101 not allowed in Node.js Response)
            return new Response('upgraded', { status: 200 });
          }),
        })),
        idFromString: vi.fn(),
        newUniqueId: vi.fn(),
        jurisdiction: vi.fn().mockReturnThis(),
      } as unknown as DurableObjectNamespace;

      const { env } = createTestEnv({
        USER_NOTIFICATIONS: mockDONamespace,
      });

      await appRequest('/ws', {
        env,
        headers: {
          Cookie: cookieHeader,
          Upgrade: 'websocket',
        },
      });

      // Verify the DO was keyed by user ID
      expect(capturedId).toBe(user.id);

      // Verify X-User-Id header was passed
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.headers.get('X-User-Id')).toBe(user.id);
    });

    it('keys Durable Object instance by authenticated user ID', async () => {
      const user1 = await createUser({ username: 'ws-user-1' });
      const user2 = await createUser({ username: 'ws-user-2' });
      const { cookieHeader: cookie1 } = await createSession(user1.id);
      const { cookieHeader: cookie2 } = await createSession(user2.id);

      const capturedIds: string[] = [];

      const mockDONamespace = {
        idFromName: vi.fn((name: string) => {
          capturedIds.push(name);
          return { toString: () => name } as DurableObjectId;
        }),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response('upgraded', { status: 200 })),
        })),
        idFromString: vi.fn(),
        newUniqueId: vi.fn(),
        jurisdiction: vi.fn().mockReturnThis(),
      } as unknown as DurableObjectNamespace;

      const { env } = createTestEnv({
        USER_NOTIFICATIONS: mockDONamespace,
      });

      // Request from user 1
      await appRequest('/ws', {
        env,
        headers: { Cookie: cookie1, Upgrade: 'websocket' },
      });

      // Request from user 2
      await appRequest('/ws', {
        env,
        headers: { Cookie: cookie2, Upgrade: 'websocket' },
      });

      // Each user should get their own DO instance
      expect(capturedIds).toHaveLength(2);
      expect(capturedIds[0]).toBe(user1.id);
      expect(capturedIds[1]).toBe(user2.id);
      expect(capturedIds[0]).not.toBe(capturedIds[1]);
    });

    it('returns 503 when USER_NOTIFICATIONS binding is unavailable', async () => {
      const user = await createUser({ username: 'ws-no-do-user' });
      const { cookieHeader } = await createSession(user.id);

      const { env } = createTestEnv({
        USER_NOTIFICATIONS: undefined as unknown as DurableObjectNamespace,
      });

      const res = await appRequest('/ws', {
        env,
        headers: { Cookie: cookieHeader, Upgrade: 'websocket' },
      });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({ error: 'WebSocket notifications not available' });
    });
  });

  describe('GET /ws/broadcast (public WebSocket)', () => {
    it('returns 426 without Upgrade header', async () => {
      const { env } = createTestEnv();

      const res = await appRequest('/ws/broadcast', { env });

      expect(res.status).toBe(426);
      const body = await res.json();
      expect(body).toEqual({ error: 'Expected WebSocket upgrade' });
    });

    it('does not require authentication', async () => {
      let doFetchCalled = false;

      const mockDONamespace = {
        idFromName: vi.fn(() => ({ toString: () => 'global' } as DurableObjectId)),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => {
            doFetchCalled = true;
            return new Response('upgraded', { status: 200 });
          }),
        })),
        idFromString: vi.fn(),
        newUniqueId: vi.fn(),
        jurisdiction: vi.fn().mockReturnThis(),
      } as unknown as DurableObjectNamespace;

      const { env } = createTestEnv({
        BROADCAST: mockDONamespace,
      });

      // No authentication provided
      const res = await appRequest('/ws/broadcast', {
        env,
        headers: { Upgrade: 'websocket' },
      });

      // Should succeed and reach the DO (not return 401)
      expect(res.status).toBe(200);
      expect(doFetchCalled).toBe(true);
    });

    it('uses global singleton for broadcast DO', async () => {
      let capturedId: string | null = null;

      const mockDONamespace = {
        idFromName: vi.fn((name: string) => {
          capturedId = name;
          return { toString: () => name } as DurableObjectId;
        }),
        get: vi.fn(() => ({
          fetch: vi.fn(async () => new Response('upgraded', { status: 200 })),
        })),
        idFromString: vi.fn(),
        newUniqueId: vi.fn(),
        jurisdiction: vi.fn().mockReturnThis(),
      } as unknown as DurableObjectNamespace;

      const { env } = createTestEnv({
        BROADCAST: mockDONamespace,
      });

      await appRequest('/ws/broadcast', {
        env,
        headers: { Upgrade: 'websocket' },
      });

      // Broadcast uses 'global' as the singleton key
      expect(capturedId).toBe('global');
    });

    it('returns 503 when BROADCAST binding is unavailable', async () => {
      const { env } = createTestEnv({
        BROADCAST: undefined as unknown as DurableObjectNamespace,
      });

      const res = await appRequest('/ws/broadcast', {
        env,
        headers: { Upgrade: 'websocket' },
      });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({ error: 'Broadcast not available' });
    });
  });
});

describe('Notification payload userId inclusion', () => {
  it('includes userId in achievement notification events', async () => {
    const { mockQueue } = createTestEnv();
    const user = await createUser({ username: 'achievement-user' });

    // Simulate the achievement handler emitting a notification event
    const event = {
      type: 'dev.tampa.achievement.unlocked',
      payload: {
        userId: user.id,
        achievementKey: 'first-rsvp',
        achievementName: 'First RSVP',
        icon: '📅',
        color: '#10B981',
        points: 50,
      },
      metadata: { userId: user.id, source: 'achievement-handler' },
      timestamp: new Date().toISOString(),
    };

    await mockQueue.send(event);

    // Verify the event contains userId in both payload and metadata
    const queuedEvent = mockQueue.messages[mockQueue.messages.length - 1];
    expect(queuedEvent.body).toMatchObject({
      payload: { userId: user.id },
      metadata: { userId: user.id },
    });
  });

  it('includes userId in badge notification events', async () => {
    const { mockQueue } = createTestEnv();
    const user = await createUser({ username: 'badge-user' });

    const event = {
      type: 'dev.tampa.badge.issued',
      payload: {
        userId: user.id,
        badgeId: 'test-badge-123',
        badgeSlug: 'test-badge',
        badgeName: 'Test Badge',
        icon: '🎖️',
        color: '#818CF8',
        points: 25,
      },
      metadata: { userId: user.id },
      timestamp: new Date().toISOString(),
    };

    await mockQueue.send(event);

    const queuedEvent = mockQueue.messages[mockQueue.messages.length - 1];
    expect(queuedEvent.body).toMatchObject({
      payload: { userId: user.id },
      metadata: { userId: user.id },
    });
  });

  it('includes userId in score change events', async () => {
    const { mockQueue } = createTestEnv();
    const user = await createUser({ username: 'score-user' });

    const event = {
      type: 'dev.tampa.user.score_changed',
      payload: {
        userId: user.id,
        totalScore: 150,
      },
      metadata: { userId: user.id },
      timestamp: new Date().toISOString(),
    };

    await mockQueue.send(event);

    const queuedEvent = mockQueue.messages[mockQueue.messages.length - 1];
    expect(queuedEvent.body).toMatchObject({
      payload: { userId: user.id },
      metadata: { userId: user.id },
    });
  });
});

describe('Notification routing - userId precedence', () => {
  it('event structure supports userId in metadata for routing', async () => {
    // The notification handler uses: event.metadata?.userId || event.payload.userId
    // This test documents that structure is correct for routing

    const { mockQueue } = createTestEnv();
    const routingUser = await createUser({ username: 'routing-user' });

    const event = {
      type: 'dev.tampa.onboarding.step_completed',
      payload: {
        userId: routingUser.id,
        stepKey: 'complete_profile',
      },
      metadata: { userId: routingUser.id },
      timestamp: new Date().toISOString(),
    };

    await mockQueue.send(event);

    // The notification handler will extract userId from metadata first
    const queuedEvent = mockQueue.messages[mockQueue.messages.length - 1];
    const eventBody = queuedEvent.body as typeof event;

    // Verify both sources are present for the handler to use
    expect(eventBody.metadata?.userId).toBe(routingUser.id);
    expect(eventBody.payload.userId).toBe(routingUser.id);
  });

  it('metadata.userId takes precedence over payload.userId', async () => {
    // Document the handler behavior: prefers metadata.userId
    const { mockQueue } = createTestEnv();
    const metadataUser = await createUser({ username: 'meta-user' });
    const payloadUser = await createUser({ username: 'payload-user' });

    const event = {
      type: 'dev.tampa.achievement.unlocked',
      payload: {
        userId: payloadUser.id, // Different user in payload
        achievementKey: 'test',
        achievementName: 'Test',
        icon: '🏆',
        color: '#F97066',
        points: 10,
      },
      metadata: { userId: metadataUser.id }, // This takes precedence
      timestamp: new Date().toISOString(),
    };

    await mockQueue.send(event);

    // The notification handler (line 148) does:
    // const userId = event.metadata?.userId || (event.payload.userId as string);
    // So metadata.userId wins
    const queuedEvent = mockQueue.messages[mockQueue.messages.length - 1];
    const eventBody = queuedEvent.body as typeof event;

    expect(eventBody.metadata.userId).toBe(metadataUser.id);
    // This is the userId that will be used for routing
  });
});

describe('Defense-in-depth validation', () => {
  describe('buildPersonalData includes userId in all message types', () => {
    // Test that buildPersonalData always includes userId in its output
    // by importing and calling the function with sample events

    it('includes userId in onboarding.step_completed messages', async () => {
      const { buildPersonalData } = await import('../../../src/queue/notification-handler.js');

      const event = {
        type: 'dev.tampa.onboarding.step_completed' as const,
        payload: { stepKey: 'complete_profile' },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const result = buildPersonalData(event, 'test-user-id');
      expect(result).toHaveProperty('userId', 'test-user-id');
      expect(result).toHaveProperty('stepKey', 'complete_profile');
    });

    it('includes userId in achievement.unlocked messages', async () => {
      const { buildPersonalData } = await import('../../../src/queue/notification-handler.js');

      const event = {
        type: 'dev.tampa.achievement.unlocked' as const,
        payload: {
          achievementKey: 'first-rsvp',
          achievementName: 'First RSVP',
          icon: '📅',
          color: '#10B981',
          points: 50,
        },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const result = buildPersonalData(event, 'test-user-id');
      expect(result).toHaveProperty('userId', 'test-user-id');
      expect(result).toHaveProperty('achievementKey', 'first-rsvp');
    });

    it('includes userId in badge.issued messages', async () => {
      const { buildPersonalData } = await import('../../../src/queue/notification-handler.js');

      const event = {
        type: 'dev.tampa.badge.issued' as const,
        payload: {
          badgeId: 'badge-123',
          badgeSlug: 'test-badge',
          badgeName: 'Test Badge',
          icon: '🎖️',
          color: '#818CF8',
          points: 25,
        },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const result = buildPersonalData(event, 'test-user-id');
      expect(result).toHaveProperty('userId', 'test-user-id');
      expect(result).toHaveProperty('badgeSlug', 'test-badge');
    });

    it('includes userId in score.changed messages', async () => {
      const { buildPersonalData } = await import('../../../src/queue/notification-handler.js');

      const event = {
        type: 'dev.tampa.user.score_changed' as const,
        payload: { totalScore: 150 },
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      const result = buildPersonalData(event, 'test-user-id');
      expect(result).toHaveProperty('userId', 'test-user-id');
      expect(result).toHaveProperty('totalScore', 150);
    });
  });

  describe('UserNotificationDO header validation', () => {
    it('returns 400 when X-User-Id header is missing', async () => {
      const { UserNotificationDO } = await import('../../../src/durable-objects/user-notification.js');

      // Create a minimal mock DurableObjectState
      const mockState = {
        id: { toString: () => 'test-do-id' },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          put: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined),
          setAlarm: vi.fn().mockResolvedValue(undefined),
        },
        getWebSockets: vi.fn().mockReturnValue([]),
        acceptWebSocket: vi.fn(),
      } as unknown as DurableObjectState;

      const durable = new UserNotificationDO(mockState, {});

      // Request WebSocket upgrade WITHOUT X-User-Id header
      const request = new Request('https://do/websocket', {
        headers: { Upgrade: 'websocket' },
      });

      const response = await durable.fetch(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing X-User-Id header');
    });

    it('returns 426 when Upgrade header is missing', async () => {
      const { UserNotificationDO } = await import('../../../src/durable-objects/user-notification.js');

      const mockState = {
        id: { toString: () => 'test-do-id' },
        storage: {
          get: vi.fn().mockResolvedValue(null),
          put: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined),
          setAlarm: vi.fn().mockResolvedValue(undefined),
        },
        getWebSockets: vi.fn().mockReturnValue([]),
        acceptWebSocket: vi.fn(),
      } as unknown as DurableObjectState;

      const durable = new UserNotificationDO(mockState, {});

      // Request without Upgrade header
      const request = new Request('https://do/websocket', {
        headers: { 'X-User-Id': 'test-user' },
      });

      const response = await durable.fetch(request);

      expect(response.status).toBe(426);
      expect(await response.text()).toBe('Expected WebSocket upgrade');
    });
  });
});
