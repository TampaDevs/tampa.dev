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
import { parseConditions, evaluateConditions, getNestedValue } from '../lib/condition-evaluator.js';

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
 * Process an achievement for a user: evaluate conditions, update progress,
 * and check for completion. Supports both counter mode (increment by 1)
 * and gauge mode (set absolute value from event payload).
 */
async function processAchievement(
  env: Env,
  userId: string,
  achievementKey: string,
  event: DomainEvent
): Promise<void> {
  const achievement = cachedAchievements?.get(achievementKey);
  if (!achievement) return;

  // Evaluate payload conditions — skip if event doesn't match
  const conditions = parseConditions(achievement.conditions);
  if (!evaluateConditions(conditions, event.payload)) return;

  const isGauge = achievement.progressMode === 'gauge';
  const db = createDatabase(env.DB);

  // Atomic upsert: INSERT ... ON CONFLICT DO NOTHING to avoid race conditions
  let initialValue: number;
  if (isGauge && achievement.gaugeField) {
    const extracted = getNestedValue(event.payload, achievement.gaugeField);
    initialValue = typeof extracted === 'number' ? extracted : 0;
  } else {
    initialValue = 0; // counter mode: start at 0, the UPDATE below will increment to 1
  }

  const progressId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Try to insert — silently fails if row already exists (unique on userId+achievementKey)
  try {
    await db.insert(achievementProgress).values({
      id: progressId,
      userId,
      achievementKey,
      currentValue: initialValue,
      targetValue: achievement.targetValue,
      updatedAt: now,
    });
  } catch {
    // Unique constraint violation — row already exists, will update below
  }

  // Atomic increment/set for existing rows that aren't completed
  if (isGauge && achievement.gaugeField) {
    const extracted = getNestedValue(event.payload, achievement.gaugeField);
    const gaugeValue = typeof extracted === 'number' ? extracted : 0;
    await db
      .update(achievementProgress)
      .set({ currentValue: gaugeValue, updatedAt: now })
      .where(
        and(
          eq(achievementProgress.userId, userId),
          eq(achievementProgress.achievementKey, achievementKey),
          sql`${achievementProgress.completedAt} IS NULL`,
        ),
      );
  } else {
    // Counter mode: atomic increment
    await db
      .update(achievementProgress)
      .set({
        currentValue: sql`${achievementProgress.currentValue} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(achievementProgress.userId, userId),
          eq(achievementProgress.achievementKey, achievementKey),
          sql`${achievementProgress.completedAt} IS NULL`,
        ),
      );
  }

  // Read back the current state
  const progress = await db.query.achievementProgress.findFirst({
    where: and(
      eq(achievementProgress.userId, userId),
      eq(achievementProgress.achievementKey, achievementKey),
    ),
  });

  if (!progress || progress.completedAt) return;

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

    // Compute user's total platform score (exclude group-scoped badges) and emit score_changed event
    const scoreResult = await db
      .select({ totalScore: sql<number>`COALESCE(SUM(${badges.points}), 0)` })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(sql`${userBadges.userId} = ${userId} AND ${badges.groupId} IS NULL`);

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

    const results = await Promise.allSettled(
      achievementKeys.map((key) => processAchievement(env, userId, key, event))
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error(`Achievement processing failed:`, r.reason);
      }
    }
  });
}
