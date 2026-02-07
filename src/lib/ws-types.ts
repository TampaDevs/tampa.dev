/**
 * WebSocket Message Protocol Types
 *
 * Shared type definitions for server-to-client WebSocket messages.
 * Used by both Durable Object classes and frontend hooks.
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
  'onboarding.step_completed': { userId: string; stepKey: string };
  'achievement.unlocked': { userId: string; achievementKey: string; achievementName: string; icon: string; color: string; points: number };
  'badge.issued': { userId: string; badgeId: string; badgeSlug: string; badgeName: string; icon: string; color: string; points: number };
  'score.changed': { userId: string; totalScore: number };
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
