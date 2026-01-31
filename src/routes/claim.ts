/**
 * Badge Claim Link Routes
 *
 * Public and authenticated endpoints for claiming badges via shareable links.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { badges, badgeClaimLinks, userBadges, achievementProgress, achievements, users, sessions } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { emitEvent } from '../lib/event-bus.js';

/**
 * Get current user from session cookie
 */
async function getCurrentUser(c: { env: Env; req: { raw: Request } }) {
  const cookieHeader = c.req.raw.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(c.env);
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionToken = sessionMatch?.[1];
  if (!sessionToken) return null;

  const db = createDatabase(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
}

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

    if (!claimLink) {
      return c.json({ error: 'Claim link not found' }, 404);
    }

    // Check expiration
    if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
      return c.json({ error: 'This claim link has expired' }, 410);
    }

    // Check max uses
    if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
      return c.json({ error: 'This claim link has reached its maximum uses' }, 410);
    }

    // Get badge info
    const badge = await db.query.badges.findFirst({
      where: eq(badges.id, claimLink.badgeId),
    });

    if (!badge) {
      return c.json({ error: 'Badge not found' }, 404);
    }

    return c.json({
      badge: {
        name: badge.name,
        slug: badge.slug,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        points: badge.points,
      },
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
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    const claimLink = await db.query.badgeClaimLinks.findFirst({
      where: eq(badgeClaimLinks.code, code),
    });

    if (!claimLink) {
      return c.json({ error: 'Claim link not found' }, 404);
    }

    // Check expiration
    if (claimLink.expiresAt && new Date(claimLink.expiresAt) < new Date()) {
      return c.json({ error: 'This claim link has expired' }, 410);
    }

    // Check max uses
    if (claimLink.maxUses !== null && claimLink.currentUses >= claimLink.maxUses) {
      return c.json({ error: 'This claim link has reached its maximum uses' }, 410);
    }

    // Check if user already has this badge
    const existingBadge = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, user.id), eq(userBadges.badgeId, claimLink.badgeId)),
    });

    if (existingBadge) {
      return c.json({ error: 'You already have this badge' }, 409);
    }

    // Award the badge
    await db.insert(userBadges).values({
      id: crypto.randomUUID(),
      userId: user.id,
      badgeId: claimLink.badgeId,
    });

    // Increment current_uses
    await db.update(badgeClaimLinks).set({
      currentUses: claimLink.currentUses + 1,
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

    return c.json({
      success: true,
      badge: badge ? {
        name: badge.name,
        slug: badge.slug,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        points: badge.points,
      } : null,
    });
  });

  return app;
}

export const claimRoutes = createClaimRoutes();
