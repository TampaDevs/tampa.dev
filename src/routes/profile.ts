/**
 * User Profile API Routes
 *
 * Allows authenticated users to view and update their profile.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions } from '../db/schema';
import type { Env } from '../../types/worker';

// ============== Validation Schemas ==============

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// ============== Helper Functions ==============

/**
 * Get current user from session cookie
 */
async function getCurrentUser(c: { env: Env; req: { raw: Request } }) {
  const cookieHeader = c.req.raw.headers.get('Cookie');
  if (!cookieHeader) return null;

  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
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

// ============== Routes ==============

export function createProfileRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /api/profile - Get current user's profile
   */
  app.get('/', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    });
  });

  /**
   * PATCH /api/profile - Update current user's profile
   */
  app.patch('/', zValidator('json', updateProfileSchema), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updates = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    // Build update object
    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.avatarUrl !== undefined) {
      updateData.avatarUrl = updates.avatarUrl;
    }

    // Update user
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    // Fetch updated user
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    return c.json({
      id: updatedUser?.id,
      email: updatedUser?.email,
      name: updatedUser?.name,
      avatarUrl: updatedUser?.avatarUrl,
      role: updatedUser?.role,
      updatedAt: updatedUser?.updatedAt,
    });
  });

  return app;
}

export const profileRoutes = createProfileRoutes();
