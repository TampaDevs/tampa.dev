/**
 * Achievement Definitions
 *
 * Defines all possible achievements with their targets and rewards.
 * When a user reaches the target value, the achievement is completed
 * and optional badges/entitlements are automatically awarded.
 */

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  targetValue: number;
  badgeSlug?: string;       // auto-award this badge on completion
  entitlement?: string;     // auto-grant this entitlement on completion
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'events_attended_5',
    name: 'Regular',
    description: 'RSVP to 5 events',
    targetValue: 5,
    badgeSlug: 'regular',
  },
  {
    key: 'events_attended_25',
    name: 'Devoted',
    description: 'RSVP to 25 events',
    targetValue: 25,
    badgeSlug: 'devoted',
  },
  {
    key: 'groups_favorited_3',
    name: 'Explorer',
    description: 'Favorite 3 groups',
    targetValue: 3,
    badgeSlug: 'explorer',
  },
  {
    key: 'providers_linked_3',
    name: 'Connected',
    description: 'Link 3 identity providers',
    targetValue: 3,
    badgeSlug: 'connected',
  },
  {
    key: 'portfolio_items_1',
    name: 'Builder',
    description: 'Add a portfolio item',
    targetValue: 1,
    badgeSlug: 'builder',
  },
];

/**
 * Map from event type to the achievement keys it can increment
 */
export const EVENT_TO_ACHIEVEMENT: Record<string, string[]> = {
  'user.favorite_added': ['groups_favorited_3'],
  'user.identity_linked': ['providers_linked_3'],
  'user.portfolio_item_created': ['portfolio_items_1'],
};

/**
 * Look up an achievement definition by key
 */
export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
