/**
 * Notification Handler
 *
 * Wildcard queue handler that relays domain events to Durable Objects
 * for real-time WebSocket delivery. Two dispatch paths:
 *
 *   Personal → UserNotificationDO (per-user, auth required)
 *   Broadcast → BroadcastDO (singleton, public data only)
 *
 * Only events with a mapped WS message type are forwarded.
 * Unmapped events are silently skipped (noise reduction).
 */

import { registerHandler } from './handler.js';
import { createDatabase } from '../db/index.js';
import { userFavorites, groups } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { DomainEvent } from '../lib/event-bus.js';
import type { WSMessage, PersonalMessageType } from '../lib/ws-types.js';
import type { Env } from '../../types/worker.js';

/**
 * Mapping from domain event types to personal WS message types.
 */
const PERSONAL_EVENT_MAP: Record<string, PersonalMessageType> = {
  'dev.tampa.onboarding.step_completed': 'onboarding.step_completed',
  'dev.tampa.achievement.unlocked': 'achievement.unlocked',
  'dev.tampa.badge.issued': 'badge.issued',
  'dev.tampa.user.score_changed': 'score.changed',
};

/**
 * Domain event types that trigger broadcast messages.
 */
const BROADCAST_EVENTS = new Set([
  'dev.tampa.user.favorite_added',
  'dev.tampa.user.favorite_removed',
]);

/**
 * Send a personal notification to a user's DO instance.
 */
async function sendPersonalNotification(
  env: Env,
  userId: string,
  message: WSMessage,
): Promise<void> {
  if (!env.USER_NOTIFICATIONS) return;

  const id = env.USER_NOTIFICATIONS.idFromName(userId);
  const stub = env.USER_NOTIFICATIONS.get(id);

  await stub.fetch('https://do/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

/**
 * Send a broadcast message to the global BroadcastDO.
 */
async function sendBroadcastNotification(
  env: Env,
  message: WSMessage,
): Promise<void> {
  if (!env.BROADCAST) return;

  const id = env.BROADCAST.idFromName('global');
  const stub = env.BROADCAST.get(id);

  await stub.fetch('https://do/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

/**
 * Build WS message data for personal events.
 * Includes userId for frontend validation of notification ownership.
 * Exported for testing.
 */
export function buildPersonalData(event: DomainEvent, userId: string): Record<string, unknown> {
  const base = { userId };
  switch (event.type) {
    case 'dev.tampa.onboarding.step_completed':
      return { ...base, stepKey: event.payload.stepKey };
    case 'dev.tampa.achievement.unlocked':
      return {
        ...base,
        achievementKey: event.payload.achievementKey,
        achievementName: event.payload.achievementName,
        icon: event.payload.icon,
        color: event.payload.color,
        points: event.payload.points,
      };
    case 'dev.tampa.badge.issued':
      return {
        ...base,
        badgeId: event.payload.badgeId,
        badgeSlug: event.payload.badgeSlug,
        badgeName: event.payload.badgeName,
        icon: event.payload.icon,
        color: event.payload.color,
        points: event.payload.points,
      };
    case 'dev.tampa.user.score_changed':
      return { ...base, totalScore: event.payload.totalScore };
    default:
      return { ...base, ...event.payload };
  }
}

/**
 * Handle favorite events by querying D1 for current aggregate count
 * and broadcasting to all connected clients.
 */
async function handleFavoriteEvent(env: Env, event: DomainEvent): Promise<void> {
  const groupId = event.payload.groupId as string;
  if (!groupId) return;

  const db = createDatabase(env.DB);

  // Look up group slug
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!group) return;

  // Count current favorites for this group
  const countResult = await db
    .select({ count: groups.id })
    .from(userFavorites)
    .where(eq(userFavorites.groupId, groupId));

  const favoriteCount = countResult.length;

  const message: WSMessage = {
    type: 'favorite.count_changed',
    data: { groupSlug: group.urlname, favoriteCount },
    timestamp: new Date().toISOString(),
  };

  await sendBroadcastNotification(env, message);
}

/**
 * Register the notification handler as a wildcard queue consumer.
 */
export function registerNotificationHandler(): void {
  registerHandler('*', async (event: DomainEvent, env: Env) => {
    const userId = event.metadata?.userId || (event.payload.userId as string);

    // Personal notifications (require userId)
    const personalType = PERSONAL_EVENT_MAP[event.type];
    if (personalType && userId) {
      const message: WSMessage = {
        type: personalType,
        data: buildPersonalData(event, userId),
        timestamp: event.timestamp,
      };

      // Structured logging: trace notification routing
      const userIdShort = userId.slice(0, 8);
      console.log(`[ws:personal] ${personalType} → user:${userIdShort}...`);

      await sendPersonalNotification(env, userId, message).catch((err) => {
        console.error(`[ws:personal] FAILED ${personalType} → user:${userIdShort}...:`, err);
      });
    }

    // Broadcast notifications
    if (BROADCAST_EVENTS.has(event.type)) {
      console.log(`[ws:broadcast] ${event.type}`);
      await handleFavoriteEvent(env, event).catch((err) => {
        console.error(`[ws:broadcast] FAILED ${event.type}:`, err);
      });
    }
  });
}
