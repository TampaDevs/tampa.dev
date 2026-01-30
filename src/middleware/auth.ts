/**
 * Authentication Middleware
 *
 * Verifies session cookies and attaches user to context.
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, sessions, UserRole } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

/**
 * Get the current authenticated user from session cookie
 */
export async function getAuthUser(c: Context<{ Bindings: Env }>): Promise<AuthUser | null> {
  const sessionToken = getCookie(c, getSessionCookieName(c.env));

  if (!sessionToken) {
    return null;
  }

  const db = createDatabase(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

/**
 * Middleware to require authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const user = await getAuthUser(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Attach user to context for downstream handlers
  c.set('user', user);

  await next();
}

/**
 * Middleware to require admin role
 * Returns 401 if not authenticated, 403 if not admin
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = await getAuthUser(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  // Attach user to context for downstream handlers
  c.set('user', user);

  await next();
}

/**
 * Middleware to require superadmin role
 * Returns 401 if not authenticated, 403 if not superadmin
 */
export async function requireSuperAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = await getAuthUser(c);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (user.role !== UserRole.SUPERADMIN) {
    return c.json({ error: 'Forbidden: Superadmin access required' }, 403);
  }

  // Attach user to context for downstream handlers
  c.set('user', user);

  await next();
}
