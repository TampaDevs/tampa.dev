/**
 * Webhook Event Types
 *
 * Defines all event types that can trigger webhook deliveries,
 * and which event types require admin/superadmin to subscribe.
 */

/** All supported webhook event types */
export const ALL_WEBHOOK_EVENT_TYPES = [
  'dev.tampa.events.synced',
  'dev.tampa.sync.completed',
  'dev.tampa.user.favorite_added',
  'dev.tampa.user.favorite_removed',
  'dev.tampa.user.profile_updated',
  'dev.tampa.user.portfolio_item_created',
  'dev.tampa.user.identity_linked',
  'dev.tampa.user.registered',
  'dev.tampa.user.deleted',
  'dev.tampa.achievement.unlocked',
  'dev.tampa.badge.issued',
  'dev.tampa.user.score_changed',
  'dev.tampa.user.login',
  'dev.tampa.user.followed',
  'dev.tampa.developer.api_token_created',
  'dev.tampa.developer.webhook_created',
  'dev.tampa.developer.application_registered',
  'dev.tampa.onboarding.step_completed',
  'dev.tampa.onboarding.completed',
  // Group management events
  'dev.tampa.group.created',
  'dev.tampa.group.updated',
  'dev.tampa.group.member_added',
  'dev.tampa.group.member_removed',
  'dev.tampa.group.member_role_changed',
  'dev.tampa.group.claimed',
  'dev.tampa.group.creation_requested',
  // Group badge events
  'dev.tampa.group.badge_created',
  'dev.tampa.group.badge_updated',
  'dev.tampa.group.badge_deleted',
  // Event management events
  'dev.tampa.event.created',
  'dev.tampa.event.updated',
  'dev.tampa.event.cancelled',
  'dev.tampa.event.rsvp',
  'dev.tampa.event.rsvp_cancelled',
  'dev.tampa.event.checkin',
  'test.ping',
] as const;

export type WebhookEventType = typeof ALL_WEBHOOK_EVENT_TYPES[number];

/**
 * Event types that require admin/superadmin role to subscribe.
 * Regular users cannot create webhooks for these event types.
 */
export const ADMIN_RESTRICTED_EVENTS = new Set<string>([
  'dev.tampa.user.registered',
  'dev.tampa.user.deleted',
  'dev.tampa.user.identity_linked',
  'dev.tampa.achievement.unlocked',
  'dev.tampa.badge.issued',
  'dev.tampa.user.score_changed',
  'dev.tampa.onboarding.completed',
  // Group management events are admin-restricted
  'dev.tampa.group.created',
  'dev.tampa.group.updated',
  'dev.tampa.group.claimed',
  'dev.tampa.group.creation_requested',
  'dev.tampa.group.badge_created',
  'dev.tampa.group.badge_deleted',
]);

/** Check if any event types in the list are admin-restricted */
export function hasAdminRestrictedEvents(eventTypes: string[]): boolean {
  return eventTypes.some((et) => ADMIN_RESTRICTED_EVENTS.has(et));
}

/** Get the admin-restricted events from a list */
export function getAdminRestrictedFromList(eventTypes: string[]): string[] {
  return eventTypes.filter((et) => ADMIN_RESTRICTED_EVENTS.has(et));
}
