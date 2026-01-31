/**
 * Achievement Processing Handler
 *
 * Processes domain events to update achievement progress.
 * When achievements are completed, auto-awards badges and entitlements.
 *
 * Achievement definitions are read from the DB (achievements table)
 * and cached for the lifetime of each queue batch.
 */

import { registerHandler } from './handler.js';
import { createDatabase } from '../db/index.js';
import { achievements, achievementProgress, badges, userBadges, onboardingSteps, userOnboarding } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { grantEntitlement } from '../lib/entitlements.js';
import { NotificationService } from '../lib/event-bus.js';
import type { DomainEvent } from '../lib/event-bus.js';
import type { Env } from '../../types/worker.js';
import type { Achievement } from '../db/schema.js';

// Per-batch cache for achievement definitions
let cachedAchievements: Map<string, Achievement> | null = null;
let cachedEventMap: Map<string, string[]> | null = null;

/**
 * Load achievement definitions from DB and build lookup maps.
 * Cached for the lifetime of the current queue batch.
 */
async function loadAchievements(env: Env): Promise<void> {
  if (cachedAchievements && cachedEventMap) return;

  const db = createDatabase(env.DB);
  const all = await db.query.achievements.findMany();

  cachedAchievements = new Map();
  cachedEventMap = new Map();

  for (const a of all) {
    cachedAchievements.set(a.key, a);
    if (a.eventType) {
      const existing = cachedEventMap.get(a.eventType) || [];
      existing.push(a.key);
      cachedEventMap.set(a.eventType, existing);
    }
  }
}

/**
 * Increment achievement progress for a user and check for completion
 */
async function incrementAchievement(
  env: Env,
  userId: string,
  achievementKey: string
): Promise<void> {
  const achievement = cachedAchievements?.get(achievementKey);
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

    const notify = new NotificationService(env);

    // Emit achievement.unlocked webhook event
    await notify.emit({
      type: 'dev.tampa.achievement.unlocked',
      payload: { userId, achievementKey, achievementName: achievement.name, icon: achievement.icon || '🏆', color: achievement.color || '#E5574F', points: achievement.points },
      metadata: { userId, source: 'achievement-handler' },
    });

    // Auto-award badge if defined
    if (achievement.badgeSlug) {
      let badge = await db.query.badges.findFirst({
        where: eq(badges.slug, achievement.badgeSlug),
      });

      // Auto-create badge if it doesn't exist yet
      if (!badge) {
        const badgeId = crypto.randomUUID();
        await db.insert(badges).values({
          id: badgeId,
          name: achievement.name,
          slug: achievement.badgeSlug,
          description: achievement.description,
          icon: achievement.icon || '🏆',
          color: achievement.color || '#E5574F',
        });
        badge = await db.query.badges.findFirst({
          where: eq(badges.id, badgeId),
        });
      }

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

          // Emit badge.issued webhook event
          await notify.emit({
            type: 'dev.tampa.badge.issued',
            payload: { userId, badgeId: badge.id, badgeSlug: badge.slug, badgeName: badge.name, icon: badge.icon, color: badge.color, points: badge.points },
            metadata: { userId, source: 'achievement-handler' },
          });
        }
      }
    }

    // Compute user's total score and emit score_changed event
    const scoreResult = await db
      .select({ totalScore: sql<number>`COALESCE(SUM(${badges.points}), 0)` })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));

    const totalScore = scoreResult[0]?.totalScore ?? 0;

    await notify.emit({
      type: 'dev.tampa.user.score_changed',
      payload: { userId, totalScore, previousScore: 0 },
      metadata: { userId, source: 'achievement-handler' },
    });

    // Auto-grant entitlement if defined
    if (achievement.entitlement) {
      await grantEntitlement(db, userId, achievement.entitlement, 'achievement');
    }
  }
}

/**
 * Check if a domain event matches any onboarding step's event_key,
 * and if so mark that step complete for the user.
 */
async function checkOnboardingSteps(
  env: Env,
  userId: string,
  eventType: string,
): Promise<void> {
  const db = createDatabase(env.DB);

  // Find onboarding steps that match this event type
  const matchingSteps = await db.query.onboardingSteps.findMany({
    where: eq(onboardingSteps.eventKey, eventType),
  });

  if (matchingSteps.length === 0) return;

  for (const step of matchingSteps) {
    // Check if already completed
    const existing = await db.query.userOnboarding.findFirst({
      where: and(
        eq(userOnboarding.userId, userId),
        eq(userOnboarding.stepKey, step.key),
      ),
    });

    if (existing?.completedAt) continue;

    if (existing) {
      // Update existing record
      await db
        .update(userOnboarding)
        .set({ completedAt: new Date().toISOString() })
        .where(
          and(
            eq(userOnboarding.userId, userId),
            eq(userOnboarding.stepKey, step.key),
          ),
        );
    } else {
      // Insert new completion record
      await db.insert(userOnboarding).values({
        userId,
        stepKey: step.key,
        completedAt: new Date().toISOString(),
        dismissed: 0,
      });
    }

    // Emit onboarding step completed event for real-time WS notification
    const notify = new NotificationService(env);
    await notify.emit({
      type: 'dev.tampa.onboarding.step_completed',
      payload: { userId, stepKey: step.key },
      metadata: { userId, source: 'achievement-handler' },
    });

    // Check if ALL onboarding steps are now completed
    const allSteps = await db.query.onboardingSteps.findMany();
    const userProgress = await db.query.userOnboarding.findMany({
      where: eq(userOnboarding.userId, userId),
    });

    const completedKeys = new Set(
      userProgress.filter((p) => p.completedAt).map((p) => p.stepKey),
    );
    const allCompleted = allSteps.length > 0 && allSteps.every((s) => completedKeys.has(s.key));

    if (allCompleted) {
      await notify.emit({
        type: 'dev.tampa.onboarding.completed',
        payload: { userId, totalSteps: allSteps.length },
        metadata: { userId, source: 'achievement-handler' },
      });
    }
  }
}

/**
 * Register a wildcard achievement handler.
 * Uses DB-backed definitions so new achievements added via admin panel
 * work immediately without code changes.
 */
export function registerAchievementHandler(): void {
  registerHandler('*', async (event: DomainEvent, env: Env) => {
    const userId = event.metadata?.userId || (event.payload.userId as string);
    if (!userId) return;

    // Check and auto-complete matching onboarding steps
    await checkOnboardingSteps(env, userId, event.type);

    // Load/cache achievement definitions from DB
    await loadAchievements(env);

    const achievementKeys = cachedEventMap?.get(event.type);
    if (!achievementKeys || achievementKeys.length === 0) return;

    await Promise.all(
      achievementKeys.map((key) => incrementAchievement(env, userId, key))
    );
  });
}
