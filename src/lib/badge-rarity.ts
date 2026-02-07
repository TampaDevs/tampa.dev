/**
 * Badge Rarity Helpers
 *
 * Shared, KV-cached functions for badge rarity computation.
 * Caches total public user count and per-badge holder counts in KV
 * so that multiple endpoints don't repeat these aggregation queries.
 */

import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, userBadges } from '../db/schema.js';
import {
  KV_KEY_TOTAL_PUBLIC_USERS,
  KV_TTL_TOTAL_PUBLIC_USERS,
  KV_KEY_BADGE_HOLDER_COUNTS,
  KV_TTL_BADGE_HOLDER_COUNTS,
} from '../config/cache.js';

type D1Database = ReturnType<typeof createDatabase>;

export type RarityTier = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * Map a rarity percentage to a tier name.
 */
export function getRarityTierName(percentage: number): RarityTier {
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 50) return 'uncommon';
  return 'common';
}

/**
 * Compute rarity for a badge given totalUsers and awardedCount.
 */
export function computeRarity(totalUsers: number, awardedCount: number): { tier: RarityTier; percentage: number } {
  const rarityPercentage = totalUsers > 0 ? (awardedCount / totalUsers) * 100 : 100;
  return {
    tier: getRarityTierName(rarityPercentage),
    percentage: Math.round(rarityPercentage * 10) / 10,
  };
}

/**
 * Get total public users count, cached in KV.
 * Public users = profileVisibility='public' AND username IS NOT NULL.
 */
export async function getCachedTotalPublicUsers(
  db: D1Database,
  kv: KVNamespace | undefined,
): Promise<number> {
  // Try KV cache first
  if (kv) {
    try {
      const cached = await kv.get(KV_KEY_TOTAL_PUBLIC_USERS);
      if (cached !== null) return parseInt(cached, 10);
    } catch { /* KV miss or error — fall through to DB */ }
  }

  // Compute from DB
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(and(eq(users.profileVisibility, 'public'), sql`${users.username} IS NOT NULL`));
  const total = result[0]?.count ?? 0;

  // Store in KV (fire-and-forget)
  if (kv) {
    kv.put(KV_KEY_TOTAL_PUBLIC_USERS, String(total), {
      expirationTtl: KV_TTL_TOTAL_PUBLIC_USERS,
    }).catch(() => {});
  }

  return total;
}

/**
 * Get badge holder counts for a set of badge IDs, using KV-cached global counts.
 * Returns a Map<badgeId, holderCount>.
 *
 * Caches ALL badge holder counts in a single KV entry so that any endpoint
 * needing holder counts for any subset of badges benefits from the same cache.
 */
export async function getCachedBadgeHolderCounts(
  db: D1Database,
  kv: KVNamespace | undefined,
  badgeIds: string[],
): Promise<Map<string, number>> {
  if (badgeIds.length === 0) return new Map();

  // Try KV cache for the global counts map
  let globalMap: Map<string, number> | null = null;
  if (kv) {
    try {
      const cached = await kv.get(KV_KEY_BADGE_HOLDER_COUNTS);
      if (cached !== null) {
        globalMap = new Map(JSON.parse(cached) as [string, number][]);
      }
    } catch { /* KV miss or error — fall through */ }
  }

  if (globalMap) {
    // Return only the requested badge IDs from the cached map
    const result = new Map<string, number>();
    for (const id of badgeIds) {
      result.set(id, globalMap.get(id) ?? 0);
    }
    return result;
  }

  // Cache miss — compute ALL badge holder counts in a single query
  const holderCounts = await db
    .select({ badgeId: userBadges.badgeId, count: sql<number>`COUNT(*)` })
    .from(userBadges)
    .groupBy(userBadges.badgeId);

  const allCounts = new Map(holderCounts.map((h) => [h.badgeId, h.count]));

  // Store full map in KV (fire-and-forget)
  if (kv) {
    kv.put(KV_KEY_BADGE_HOLDER_COUNTS, JSON.stringify([...allCounts]), {
      expirationTtl: KV_TTL_BADGE_HOLDER_COUNTS,
    }).catch(() => {});
  }

  // Return only the requested badge IDs
  const result = new Map<string, number>();
  for (const id of badgeIds) {
    result.set(id, allCounts.get(id) ?? 0);
  }
  return result;
}
