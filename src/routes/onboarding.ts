/**
 * Onboarding API Routes
 *
 * Endpoints for managing user onboarding step completion and dismissal.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { onboardingSteps, userOnboarding } from '../db/schema';
import type { Env } from '../../types/worker';
import { getCurrentUser } from '../lib/auth.js';

export function createOnboardingRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /me/onboarding - Get all steps with completion status for current user
   */
  app.get('/', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    // Get all onboarding steps
    const steps = await db.query.onboardingSteps.findMany({
      orderBy: [onboardingSteps.sortOrder],
    });

    // Get user's onboarding progress
    const userProgress = await db.query.userOnboarding.findMany({
      where: eq(userOnboarding.userId, user.id),
    });

    // Merge steps with user progress
    const result = steps.map((step) => {
      const progress = userProgress.find((p) => p.stepKey === step.key);
      return {
        key: step.key,
        title: step.title,
        description: step.description,
        sortOrder: step.sortOrder,
        completed: !!progress?.completedAt,
        completedAt: progress?.completedAt || null,
        dismissed: progress?.dismissed === 1,
      };
    });

    return c.json({ steps: result });
  });

  /**
   * POST /me/onboarding/:stepKey/dismiss - Mark a step as dismissed
   */
  app.post('/:stepKey/dismiss', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const { user } = auth;

    const stepKey = c.req.param('stepKey');
    const db = createDatabase(c.env.DB);

    // Verify step exists
    const step = await db.query.onboardingSteps.findFirst({
      where: eq(onboardingSteps.key, stepKey),
    });
    if (!step) {
      return c.json({ error: 'Onboarding step not found' }, 404);
    }

    // Check if already has a record
    const existing = await db.query.userOnboarding.findFirst({
      where: and(
        eq(userOnboarding.userId, user.id),
        eq(userOnboarding.stepKey, stepKey),
      ),
    });

    if (existing) {
      await db.update(userOnboarding).set({
        dismissed: 1,
      }).where(
        and(
          eq(userOnboarding.userId, user.id),
          eq(userOnboarding.stepKey, stepKey),
        ),
      );
    } else {
      await db.insert(userOnboarding).values({
        userId: user.id,
        stepKey,
        dismissed: 1,
      });
    }

    return c.json({ success: true });
  });

  /**
   * POST /me/onboarding/dismiss-all - Dismiss all onboarding steps
   */
  app.post('/dismiss-all', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const { user } = auth;

    const db = createDatabase(c.env.DB);

    // Get all onboarding steps
    const steps = await db.query.onboardingSteps.findMany();

    // Upsert dismissed for each step
    for (const step of steps) {
      const existing = await db.query.userOnboarding.findFirst({
        where: and(
          eq(userOnboarding.userId, user.id),
          eq(userOnboarding.stepKey, step.key),
        ),
      });

      if (existing) {
        await db.update(userOnboarding).set({
          dismissed: 1,
        }).where(
          and(
            eq(userOnboarding.userId, user.id),
            eq(userOnboarding.stepKey, step.key),
          ),
        );
      } else {
        await db.insert(userOnboarding).values({
          userId: user.id,
          stepKey: step.key,
          dismissed: 1,
        });
      }
    }

    return c.json({ success: true, dismissed: steps.length });
  });

  return app;
}

export const onboardingRoutes = createOnboardingRoutes();
