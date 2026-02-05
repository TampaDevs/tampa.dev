/**
 * Badge Claim Link Routes
 *
 * Public and authenticated endpoints for claiming badges via shareable links.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { createDatabase } from '../db';
import { badges, badgeClaimLinks, userBadges, achievementProgress, achievements, groups } from '../db/schema';
import type { Env } from '../../types/worker';
import { getCurrentUser } from '../lib/auth.js';
import { emitEvent } from '../lib/event-bus.js';
import { ok, unauthorized, notFound, conflict, gone } from '../lib/responses.js';
import { getEmojiUrl } from '../../lib/emoji.js';

export function createClaimRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /claim/:code - Get badge info for a claim link (public, no auth needed)
   */
  app.get('/:code', async (c) => {
    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    const claimLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.code, code),
    });

    if (!claimLink) return notFound(c, 'Claim link not found');

    // Check expiration
    if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
      return gone(c, 'This claim link has expired');
    }

    // Check max uses
    if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
      return gone(c, 'This claim link has reached its maximum uses');
    }

    // Get badge info
    const badge = await db.query.badges.findFirst({
      where: eq(badges.id, claimLink.badgeId),
    });

    if (!badge) return notFound(c, 'Badge not found');

    // Include group info if badge is group-scoped
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

    return ok(c, {
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
    });
  });

  /**
   * POST /claim/:code - Claim a badge (auth required)
   */
  app.post('/:code', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);
    const { user } = auth;

    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    const claimLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.code, code),
    });

    if (!claimLink) return notFound(c, 'Claim link not found');

    // Check expiration
    if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
      return gone(c, 'This claim link has expired');
    }

    // Check max uses
    if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
      return gone(c, 'This claim link has reached its maximum uses');
    }

    // Check if user already has this badge
    const existingBadge = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, claimLink.badgeId)),
    });

    if (existingBadge) {
      return conflict(c, 'You already have this badge');
    }

    // Award the badge
    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId: user.id,
      badgeId: claimLink.badgeId,
    });

    // Atomic increment of current_uses
    await db.update(badgeClaimLinks).set({
      currentUses: sql`${badgeClaimLinks.currentUses} + 1`,
    }).where(eq(badgeClaimLinks.id, claimLink.id));

    // If linked to an achievement, complete it
    if (claimLink.achievementId) {
      const achievement = await db.query.achievements.findFirst({
        where: eq(achievements.id, claimLink.achievementId),
      });

      if (achievement) {
        const now = new Date().toISOString();
        const existingProgress = await db.query.achievementProgress.findFirst({
          where: and(
            eq(achievementProgress.userId, user.id),
            eq(achievementProgress.achievementKey, achievement.key),
          ),
        });

        if (existingProgress) {
          if (!existingProgress.completedAt) {
            await db.update(achievementProgress).set({
              currentValue: achievement.targetValue,
              completedAt: now,
              updatedAt: now,
            }).where(eq(achievementProgress.id, existingProgress.id));
          }
        } else {
          await db.insert(achievementProgress).values({
            id: crypto.randomUUID(),
            userId: user.id,
            achievementKey: achievement.key,
            currentValue: achievement.targetValue,
            targetValue: achievement.targetValue,
            completedAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Get badge info for the response
    const badge = await db.query.badges.findFirst({
      where: eq(badges.id, claimLink.badgeId),
    });

    // Emit event
    emitEvent(c, {
      type: 'dev.tampa.user.badge_claimed',
      payload: { userId: user.id, badgeId: claimLink.badgeId, claimLinkId: claimLink.id },
      metadata: { userId: user.id, source: 'claim' },
    });

    // Emit custom event if configured on the claim link (enables achievement triggers)
    if (claimLink.emitEventType) {
      let customPayload: Record<string, unknown> = {};
      if (claimLink.emitEventPayload) {
        try { customPayload = JSON.parse(claimLink.emitEventPayload); } catch { /* ignore invalid JSON */ }
      }
      emitEvent(c, {
        type: claimLink.emitEventType,
        payload: { userId: user.id, badgeId: claimLink.badgeId, claimLinkId: claimLink.id, ...customPayload },
        metadata: { userId: user.id, source: 'claim-link' },
      });
    }

    return ok(c, {
      badge: badge ? {
        name: badge.name,
        slug: badge.slug,
        description: badge.description,
        icon: badge.icon,
        iconUrl: getEmojiUrl(badge.icon),
        color: badge.color,
        points: badge.points,
      } : null,
    });
  });

  return app;
}

export const claimRoutes = createClaimRoutes();
