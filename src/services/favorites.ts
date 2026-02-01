/**
 * Favorites Service
 *
 * Shared business logic for managing user favorite groups.
 * Used by both /v1/ API routes and session routes.
 */

import { eq, and } from 'drizzle-orm';
import { groups, userFavorites } from '../db/schema.js';
import type { DomainEvent } from '../lib/event-bus.js';

type DB = ReturnType<typeof import('../db/index.js').createDatabase>;

// ============== Result Types ==============

export interface FavoriteItem {
  groupId: string;
  groupSlug: string;
  groupName: string;
  groupPhotoUrl: string | null;
  createdAt: string;
}

export interface AddFavoriteResult {
  alreadyExisted: boolean;
  events: Omit<DomainEvent, 'timestamp'>[];
}

export interface RemoveFavoriteResult {
  events: Omit<DomainEvent, 'timestamp'>[];
}

// ============== Error Types ==============

export class FavoriteError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'FavoriteError';
  }
}

// ============== Service Functions ==============

/**
 * List a user's favorite groups.
 */
export async function listFavorites(
  db: DB,
  userId: string,
): Promise<FavoriteItem[]> {
  const favorites = await db.query.userFavorites.findMany({
    where: eq(userFavorites.userId, userId),
  });

  if (favorites.length === 0) return [];

  // Enrich with group data
  const groupIds = favorites.map((f) => f.groupId);
  const groupsData = await db.query.groups.findMany({
    where: (g, { inArray }) => inArray(g.id, groupIds),
  });
  const groupMap = new Map(groupsData.map((g) => [g.id, g]));

  return favorites
    .map((f) => {
      const group = groupMap.get(f.groupId);
      if (!group) return null;
      return {
        groupId: group.id,
        groupSlug: group.urlname,
        groupName: group.name,
        groupPhotoUrl: group.photoUrl,
        createdAt: f.createdAt,
      };
    })
    .filter((f): f is FavoriteItem => f !== null);
}

/**
 * Add a group to a user's favorites by slug.
 */
export async function addFavorite(
  db: DB,
  userId: string,
  groupSlug: string,
): Promise<AddFavoriteResult> {
  const group = await db.query.groups.findFirst({
    where: eq(groups.urlname, groupSlug),
  });
  if (!group) {
    throw new FavoriteError('Group not found', 'not_found', 404);
  }

  // Check for existing favorite
  const existing = await db.query.userFavorites.findFirst({
    where: and(
      eq(userFavorites.userId, userId),
      eq(userFavorites.groupId, group.id),
    ),
  });
  if (existing) {
    return { alreadyExisted: true, events: [] };
  }

  await db.insert(userFavorites).values({
    id: crypto.randomUUID(),
    userId,
    groupId: group.id,
  });

  return {
    alreadyExisted: false,
    events: [
      {
        type: 'dev.tampa.user.favorite_added',
        payload: { userId, groupId: group.id, groupSlug: group.urlname },
        metadata: { userId, source: 'favorites' },
      },
    ],
  };
}

/**
 * Remove a group from a user's favorites by slug.
 */
export async function removeFavorite(
  db: DB,
  userId: string,
  groupSlug: string,
): Promise<RemoveFavoriteResult> {
  const group = await db.query.groups.findFirst({
    where: eq(groups.urlname, groupSlug),
  });
  if (!group) {
    throw new FavoriteError('Group not found', 'not_found', 404);
  }

  await db
    .delete(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.groupId, group.id),
      ),
    );

  return {
    events: [
      {
        type: 'dev.tampa.user.favorite_removed',
        payload: { userId, groupId: group.id, groupSlug: group.urlname },
        metadata: { userId, source: 'favorites' },
      },
    ],
  };
}
