/**
 * Achievement Definitions (DEPRECATED)
 *
 * Achievement definitions have moved to the `achievements` DB table.
 * The achievement handler now reads from DB instead of these constants.
 *
 * This file is kept temporarily for the AchievementDef interface export.
 * Do not add new achievements here — use the admin panel instead.
 *
 * @deprecated Use the `achievements` table in the database
 */

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  targetValue: number;
  badgeSlug?: string;
  entitlement?: string;
}

/**
 * @deprecated Achievements are now DB-backed. Use db.query.achievements instead.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
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
 * @deprecated Achievements are now DB-backed. Use db.query.achievements instead.
 */
export const EVENT_TO_ACHIEVEMENT: Record<string, string[]> = {
  'dev.tampa.user.favorite_added': ['groups_favorited_3'],
  'dev.tampa.user.identity_linked': ['providers_linked_3'],
  'dev.tampa.user.portfolio_item_created': ['portfolio_items_1'],
};

/**
 * @deprecated Achievements are now DB-backed. Use db.query.achievements instead.
 */
export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}
