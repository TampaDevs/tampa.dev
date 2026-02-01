/**
 * WebSocket Message Protocol Types
 *
 * Shared type definitions for server-to-client WebSocket messages.
 * This is a copy of src/lib/ws-types.ts for frontend use.
 */

/** Personal message types (via UserNotificationDO → /ws) */
export type PersonalMessageType =
  | 'onboarding.step_completed'
  | 'achievement.unlocked'
  | 'badge.issued'
  | 'score.changed'
  | 'ping';

/** Broadcast message types (via BroadcastDO → /ws/broadcast) */
export type BroadcastMessageType =
  | 'favorite.count_changed'
  | 'ping';

/** All possible message types */
export type WSMessageType = PersonalMessageType | BroadcastMessageType;

/** Data payloads per message type */
export interface WSMessageDataMap {
  'onboarding.step_completed': { stepKey: string };
  'achievement.unlocked': { achievementKey: string; achievementName: string; icon: string; color: string; points: number };
  'badge.issued': { badgeId: string; badgeSlug: string; badgeName: string; icon: string; color: string; points: number };
  'score.changed': { totalScore: number };
  'favorite.count_changed': { groupSlug: string; favoriteCount: number };
  'ping': Record<string, never>;
}

/** Server-to-client message envelope */
export interface WSMessage<T extends WSMessageType = WSMessageType> {
  type: T;
  data: T extends keyof WSMessageDataMap ? WSMessageDataMap[T] : unknown;
  timestamp: string;
}

/** Client-to-server messages */
export interface WSClientMessage {
  type: 'pong';
}
