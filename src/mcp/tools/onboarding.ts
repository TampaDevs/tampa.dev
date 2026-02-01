/**
 * MCP Onboarding Tools
 *
 * Tools for querying and managing user onboarding step progress.
 * Uses the onboardingSteps and userOnboarding tables.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { defineTool } from '../registry.js';
import { createDatabase } from '../../db/index.js';
import { onboardingSteps, userOnboarding } from '../../db/schema.js';
import type { ToolResult } from '../types.js';

// ── onboarding_status ──

defineTool({
  name: 'onboarding_status',
  description: 'Get the current user\'s onboarding status. Returns all onboarding steps with their completion and dismissal state.',
  scope: 'user',
  inputSchema: z.object({}),
  handler: async (_args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;

    // Get all onboarding steps
    const steps = await db.query.onboardingSteps.findMany({
      orderBy: [onboardingSteps.sortOrder],
    });

    // Get user's onboarding progress
    const userProgress = await db.query.userOnboarding.findMany({
      where: eq(userOnboarding.userId, userId),
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
        completedAt: progress?.completedAt ?? null,
        dismissed: progress?.dismissed === 1,
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ steps: result }),
      }],
    };
  },
});

// ── onboarding_dismiss_step ──

defineTool({
  name: 'onboarding_dismiss_step',
  description: 'Dismiss a specific onboarding step for the current user. The step will no longer appear in the onboarding flow.',
  scope: 'user',
  inputSchema: z.object({
    step_key: z.string().min(1).max(100),
  }),
  handler: async (args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;

    // Verify step exists
    const step = await db.query.onboardingSteps.findFirst({
      where: eq(onboardingSteps.key, args.step_key),
    });
    if (!step) {
      return {
        content: [{ type: 'text', text: 'Error: Onboarding step not found' }],
        isError: true,
      };
    }

    // Check if user already has a record for this step
    const existing = await db.query.userOnboarding.findFirst({
      where: and(
        eq(userOnboarding.userId, userId),
        eq(userOnboarding.stepKey, args.step_key),
      ),
    });

    if (existing) {
      await db.update(userOnboarding).set({
        dismissed: 1,
      }).where(
        and(
          eq(userOnboarding.userId, userId),
          eq(userOnboarding.stepKey, args.step_key),
        ),
      );
    } else {
      await db.insert(userOnboarding).values({
        userId,
        stepKey: args.step_key,
        dismissed: 1,
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, stepKey: args.step_key }),
      }],
    };
  },
});

// ── onboarding_dismiss_all ──

defineTool({
  name: 'onboarding_dismiss_all',
  description: 'Dismiss all onboarding steps for the current user. All steps will be marked as dismissed.',
  scope: 'user',
  inputSchema: z.object({}),
  handler: async (_args, ctx): Promise<ToolResult> => {
    const db = createDatabase(ctx.env.DB);
    const userId = ctx.auth.user.id;

    // Get all onboarding steps
    const steps = await db.query.onboardingSteps.findMany();

    // Upsert dismissed for each step
    for (const step of steps) {
      const existing = await db.query.userOnboarding.findFirst({
        where: and(
          eq(userOnboarding.userId, userId),
          eq(userOnboarding.stepKey, step.key),
        ),
      });

      if (existing) {
        await db.update(userOnboarding).set({
          dismissed: 1,
        }).where(
          and(
            eq(userOnboarding.userId, userId),
            eq(userOnboarding.stepKey, step.key),
          ),
        );
      } else {
        await db.insert(userOnboarding).values({
          userId,
          stepKey: step.key,
          dismissed: 1,
        });
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, dismissed: steps.length }),
      }],
    };
  },
});
