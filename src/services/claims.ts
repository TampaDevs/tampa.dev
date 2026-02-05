/**
 * Badge Claim Service
 *
 * Shared business logic for viewing and claiming badges via claim links.
 * Handles expiration, usage limits, achievement completion, and custom events.
 * Used by both /v1/ API routes and session routes.
 */

import { eq, sql } from 'drizzle-orm';
import { badges, badgeClaimLinks, userBadges, achievements, achievementProgress, groups } from '../db/schema.js';
import type { DomainEvent } from '../lib/event-bus.js';
import { getEmojiUrl } from '../../lib/emoji.js';

type DB = ReturnType<typeof import('../db/index.js').createDatabase>;

// ============== Result Types ==============

export interface ClaimInfoResult {
  badge: {
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    iconUrl: string | null;
    color: string;
    points: number;
  };
  group: {
    id: string;
    name: string;
    urlname: string;
    photoUrl: string | null;
  } | null;
  claimable: boolean;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
}

export interface ClaimBadgeResult {
  badge: {
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    iconUrl: string | null;
    color: string;
    points: number;
  };
  events: Omit<DomainEvent, 'timestamp'>[];
}

// ============== Error Types ==============

export class ClaimError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'gone' | 'conflict',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ClaimError';
  }
}

// ============== Service Functions ==============

/**
 * Get badge claim info for a claim code.
 * Validates expiration and usage limits.
 */
export async function getClaimInfo(
  db: DB,
  code: string,
): Promise<ClaimInfoResult> {
  const claimLink = await db.query.badgeClaimLinks.findFirst({
    where: eq(badgeClaimLinks.code, code),
  });
  if (!claimLink) {
    throw new ClaimError('Claim link not found', 'not_found', 404);
  }

  // Check expiration
  if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
    throw new ClaimError('This claim link has expired', 'gone', 410);
  }

  // Check usage limit
  if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
    throw new ClaimError('This claim link has reached its usage limit', 'gone', 410);
  }

  const badge = await db.query.badges.findFirst({
    where: eq(badges.id, claimLink.badgeId),
  });
  if (!badge) {
    throw new ClaimError('Badge not found', 'not_found', 404);
  }

  let group = null;
  if (badge.groupId) {
    const g = await db.query.groups.findFirst({
      where: eq(groups.id, badge.groupId),
    });
    if (g) {
      group = {
        id: g.id,
        name: g.name,
        urlname: g.urlname,
        photoUrl: g.photoUrl,
      };
    }
  }

  return {
    badge: {
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      iconUrl: getEmojiUrl(badge.icon),
      color: badge.color,
      points: badge.points,
    },
    group,
    claimable: true,
    maxUses: claimLink.maxUses,
    currentUses: claimLink.currentUses,
    expiresAt: claimLink.expiresAt,
  };
}

/**
 * Claim a badge via a claim link.
 * Handles idempotency (409 if already claimed), usage increment,
 * achievement completion, and custom event emission.
 */
export async function claimBadge(
  db: DB,
  userId: string,
  code: string,
): Promise<ClaimBadgeResult> {
  const claimLink = await db.query.badgeClaimLinks.findFirst({
    where: eq(badgeClaimLinks.code, code),
  });
  if (!claimLink) {
    throw new ClaimError('Claim link not found', 'not_found', 404);
  }

  // Check expiration
  if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
    throw new ClaimError('This claim link has expired', 'gone', 410);
  }

  // Check usage limit
  if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
    throw new ClaimError('This claim link has reached its usage limit', 'gone', 410);
  }

  const badge = await db.query.badges.findFirst({
    where: eq(badges.id, claimLink.badgeId),
  });
  if (!badge) {
    throw new ClaimError('Badge not found', 'not_found', 404);
  }

  // Check if user already has this badge
  const existingBadge = await db.query.userBadges.findFirst({
    where: (ub, { and: andOp, eq: eqOp }) =>
      andOp(eqOp(ub.userId, userId), eqOp(ub.badgeId, badge.id)),
  });
  if (existingBadge) {
    throw new ClaimError('You already have this badge', 'conflict', 409);
  }

  // Award the badge
  await db.insert(userBadges).values({
    id: crypto.randomUUID(),
    userId,
    badgeId: badge.id,
    awardedAt: new Date().toISOString(),
  });

  // Atomically increment usage counter
  await db.update(badgeClaimLinks)
    .set({ currentUses: sql`${badgeClaimLinks.currentUses} + 1` })
    .where(eq(badgeClaimLinks.id, claimLink.id));

  const domainEvents: Omit<DomainEvent, 'timestamp'>[] = [
    {
      type: 'dev.tampa.user.badge_claimed',
      payload: {
        userId,
        badgeId: badge.id,
        badgeSlug: badge.slug,
        claimLinkId: claimLink.id,
        groupId: badge.groupId,
      },
      metadata: { userId, source: 'claim' },
    },
  ];

  // Handle achievement completion if configured
  if (claimLink.achievementId) {
    const achievement = await db.query.achievements.findFirst({
      where: eq(achievements.id, claimLink.achievementId),
    });
    if (achievement) {
      const now = new Date().toISOString();
      // Upsert achievement progress to completed
      const existingProgress = await db.query.achievementProgress.findFirst({
        where: (ap, { and: andOp, eq: eqOp }) =>
          andOp(eqOp(ap.userId, userId), eqOp(ap.achievementKey, achievement.key)),
      });

      if (existingProgress) {
        await db.update(achievementProgress)
          .set({
            currentValue: achievement.targetValue,
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(achievementProgress.id, existingProgress.id));
      } else {
        await db.insert(achievementProgress).values({
          id: crypto.randomUUID(),
          userId,
          achievementKey: achievement.key,
          currentValue: achievement.targetValue,
          targetValue: achievement.targetValue,
          completedAt: now,
          updatedAt: now,
        });
      }
    }
  }

  // Handle custom event emission if configured
  if (claimLink.emitEventType) {
    let customPayload: Record<string, unknown> = {};
    if (claimLink.emitEventPayload) {
      try {
        customPayload = JSON.parse(claimLink.emitEventPayload);
      } catch {
        // Ignore malformed payload
      }
    }
    domainEvents.push({
      type: claimLink.emitEventType,
      payload: {
        userId,
        badgeId: badge.id,
        badgeSlug: badge.slug,
        ...customPayload,
      },
      metadata: { userId, source: 'claim' },
    });
  }

  return {
    badge: {
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      iconUrl: getEmojiUrl(badge.icon),
      color: badge.color,
      points: badge.points,
    },
    events: domainEvents,
  };
}
