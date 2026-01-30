/**
 * Achievement Processing Handler
 *
 * Processes domain events to update achievement progress.
 * When achievements are completed, auto-awards badges and entitlements.
 */

import { registerHandler } from './handler.js';
import { createDatabase } from '../db/index.js';
import { achievementProgress, badges, userBadges } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { EVENT_TO_ACHIEVEMENT, getAchievement } from '../lib/achievements.js';
import { grantEntitlement } from '../lib/entitlements.js';
import type { DomainEvent } from '../lib/event-bus.js';
import type { Env } from '../../types/worker.js';

/**
 * Increment achievement progress for a user and check for completion
 */
async function incrementAchievement(
  env: Env,
  userId: string,
  achievementKey: string
): Promise<void> {
  const achievement = getAchievement(achievementKey);
  if (!achievement) return;

  const db = createDatabase(env.DB);

  // Get or create progress record
  let progress = await db.query.achievementProgress.findFirst({
    where: and(
      eq(achievementProgress.userId, userId),
      eq(achievementProgress.achievementKey, achievementKey)
    ),
  });

  if (!progress) {
    // Create new progress record
    const id = crypto.randomUUID();
    await db.insert(achievementProgress).values({
      id,
      userId,
      achievementKey,
      currentValue: 1,
      targetValue: achievement.targetValue,
      updatedAt: new Date().toISOString(),
    });

    progress = {
      id,
      userId,
      achievementKey,
      currentValue: 1,
      targetValue: achievement.targetValue,
      completedAt: null,
      updatedAt: new Date().toISOString(),
    };
  } else if (!progress.completedAt) {
    // Increment existing progress
    const newValue = progress.currentValue + 1;
    await db
      .update(achievementProgress)
      .set({
        currentValue: newValue,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(achievementProgress.id, progress.id));

    progress = { ...progress, currentValue: newValue };
  } else {
    // Already completed, skip
    return;
  }

  // Check if achievement is now completed
  if (progress.currentValue >= achievement.targetValue && !progress.completedAt) {
    const now = new Date().toISOString();

    // Mark as completed
    await db
      .update(achievementProgress)
      .set({ completedAt: now, updatedAt: now })
      .where(eq(achievementProgress.id, progress.id));

    // Auto-award badge if defined
    if (achievement.badgeSlug) {
      const badge = await db.query.badges.findFirst({
        where: eq(badges.slug, achievement.badgeSlug),
      });

      if (badge) {
        // Check if badge already awarded
        const existing = await db.query.userBadges.findFirst({
          where: and(
            eq(userBadges.userId, userId),
            eq(userBadges.badgeId, badge.id)
          ),
        });

        if (!existing) {
          await db.insert(userBadges).values({
            id: crypto.randomUUID(),
            userId,
            badgeId: badge.id,
            awardedAt: now,
          });
        }
      }
    }

    // Auto-grant entitlement if defined
    if (achievement.entitlement) {
      await grantEntitlement(db, userId, achievement.entitlement, 'achievement');
    }
  }
}

/**
 * Handle domain events that affect achievement progress
 */
async function handleAchievementEvent(event: DomainEvent, env: Env): Promise<void> {
  const achievementKeys = EVENT_TO_ACHIEVEMENT[event.type];
  if (!achievementKeys || achievementKeys.length === 0) return;

  const userId = event.metadata?.userId || (event.payload.userId as string);
  if (!userId) return;

  await Promise.all(
    achievementKeys.map((key) => incrementAchievement(env, userId, key))
  );
}

/**
 * Register achievement handlers for relevant event types
 */
export function registerAchievementHandler(): void {
  // Register for each event type that has achievement mappings
  for (const eventType of Object.keys(EVENT_TO_ACHIEVEMENT)) {
    registerHandler(eventType, handleAchievementEvent);
  }
}
