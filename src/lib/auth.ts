/**
 * Shared Auth Helpers
 *
 * Central place for tri-auth (session, PAT, OAuth), group role checks,
 * and platform admin detection. Replaces per-file getCurrentUser
 * duplication in route modules.
 *
 * Auth resolution order:
 *   1. Authorization: Bearer td_pat_... → Personal Access Token
 *   2. Authorization: Bearer ...        → OAuth access token
 *   3. Session cookie                   → Session-based auth
 */

import { eq, and, gt } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, sessions, apiTokens, groupMembers, type User, type Session, type GroupMember, GroupMemberRole } from '../db/schema.js';
import { getSessionCookieName } from './session.js';
import { hasScope, type Scope } from './scopes.js';
import { scopeError } from './responses.js';
import type { Env } from '../../types/worker.js';

// ============== Auth Result ==============

/**
 * Result from getCurrentUser(). Wraps the user with optional scopes.
 * - scopes = null  → session auth (unrestricted, no scope enforcement)
 * - scopes = []    → token auth with specific scopes (PAT or OAuth)
 */
export interface AuthResult {
  user: User;
  scopes: string[] | null;
}

// ============== Auth Mode ==============

/**
 * Authentication mode for getCurrentUser().
 * - 'tri-auth': Accept PAT, OAuth, or session (default, for /v1/ public API)
 * - 'session-only': Accept only session cookies (for internal web routes)
 */
export type AuthMode = 'tri-auth' | 'session-only';

// ============== Role Hierarchy ==============

/**
 * Group role hierarchy from highest to lowest privilege.
 * owner > manager > volunteer > member
 */
export const ROLE_HIERARCHY: readonly string[] = [
  GroupMemberRole.OWNER,
  GroupMemberRole.MANAGER,
  GroupMemberRole.VOLUNTEER,
  GroupMemberRole.MEMBER,
] as const;

/**
 * Check if a given role meets or exceeds the minimum required role.
 * Returns true if userRole >= requiredRole in the hierarchy.
 */
export function hasMinRole(userRole: string, requiredRole: string): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userIdx === -1 || requiredIdx === -1) return false;
  // Lower index = higher privilege
  return userIdx <= requiredIdx;
}

// ============== Platform Admin Check ==============

/**
 * Check if a user is a platform admin (role = 'admin' or 'superadmin').
 * Platform admins bypass all group role checks.
 */
export function isPlatformAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === 'admin' || user.role === 'superadmin';
}

// ============== Scope Enforcement ==============

/**
 * Check if the auth result has the required scope.
 * Returns a 403 Response if the scope is missing, or null if OK.
 *
 * **Design note (F-02):** Session auth (scopes = null) intentionally bypasses
 * scope enforcement. This is NOT a bug — scopes constrain third-party API
 * tokens (PATs and OAuth apps), while session users are first-party and
 * authorized by role checks (requireGroupRole, isPlatformAdmin) at the
 * endpoint level. Sessions represent direct user login and should never be
 * restricted by API scopes.
 */
export function requireScope(
  auth: AuthResult,
  scope: Scope,
  c: { json: (data: unknown, status: number) => Response },
): Response | null {
  if (auth.scopes === null) return null; // session = unrestricted
  if (hasScope(auth.scopes, scope)) return null; // token has scope
  return scopeError(c as any, scope);
}

// ============== Tri-Auth ==============

/**
 * Get the current authenticated user from Bearer token or session cookie.
 *
 * Resolution order (when mode = 'tri-auth'):
 *   1. Authorization: Bearer td_pat_... → Personal Access Token
 *   2. Authorization: Bearer ...        → OAuth access token (via OAUTH_PROVIDER.unwrapToken)
 *   3. Session cookie                   → Session-based auth
 *
 * When mode = 'session-only', only session cookies are accepted.
 * Bearer tokens are ignored (not rejected with 401, just skipped).
 *
 * Returns null if not authenticated.
 *
 * @param c - Hono context with env, req, and optional executionCtx
 * @param mode - 'tri-auth' (default) or 'session-only'
 */
export async function getCurrentUser(
  c: { env: Env; req: { raw: Request }; executionCtx?: ExecutionContext },
  mode: AuthMode = 'tri-auth',
): Promise<AuthResult | null> {
  // Session-only mode: skip token checks entirely
  if (mode === 'session-only') {
    return resolveSession(c.env, c.req.raw);
  }

  // Tri-auth mode: check tokens first, then session
  // 1. Check for Bearer token
  const authHeader = c.req.raw.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    if (token.startsWith('td_pat_')) {
      // 1a. Personal Access Token
      return resolvePatToken(c.env, token, c.executionCtx);
    }

    // 1b. OAuth access token
    return resolveOAuthToken(c.env, token);
  }

  // 2. Fall back to session cookie
  return resolveSession(c.env, c.req.raw);
}

/**
 * Get the current authenticated user from session cookie only.
 * Convenience wrapper for getCurrentUser(c, 'session-only').
 *
 * Use this for internal web routes that should not accept API tokens.
 */
export async function getSessionUser(
  c: { env: Env; req: { raw: Request }; executionCtx?: ExecutionContext },
): Promise<AuthResult | null> {
  return getCurrentUser(c, 'session-only');
}

// ============== PAT Resolution ==============

/**
 * Resolve a Personal Access Token (td_pat_...) to an AuthResult.
 * Exported for reuse by OAuthProvider's resolveExternalToken callback
 * in src/index.ts. SHA-256 hashes the raw token to match stored hashes.
 */
export async function resolvePatToken(env: Env, token: string, ctx?: ExecutionContext): Promise<AuthResult | null> {
  const db = createDatabase(env.DB);

  // Hash the token with SHA-256 (matches how PATs are stored)
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const tokenRecord = await db.query.apiTokens.findFirst({
    where: eq(apiTokens.tokenHash, tokenHash),
  });
  if (!tokenRecord) return null;

  // Check expiration
  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) return null;

  // Look up the user
  const user = await db.query.users.findFirst({
    where: eq(users.id, tokenRecord.userId),
  });
  if (!user) return null;

  // Update last_used_at in the background
  const lastUsedUpdate = db.update(apiTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiTokens.id, tokenRecord.id))
    .execute()
    .catch(() => {});

  if (ctx) {
    ctx.waitUntil(lastUsedUpdate);
  }

  return { user, scopes: JSON.parse(tokenRecord.scopes) };
}

// ============== External Token Resolution (OAuthProvider) ==============

/**
 * Callback for OAuthProvider's resolveExternalToken option.
 *
 * The OAuthProvider intercepts all requests to apiRoute (/v1/) and validates
 * Bearer tokens. Native OAuth tokens are handled internally, but PATs
 * (td_pat_...) are "external" tokens that need this callback. Without it,
 * PATs are rejected with 401 before reaching the Hono app.
 *
 * The returned props are set on ctx.props by the OAuthProvider but are not
 * used downstream -- getCurrentUser() independently re-resolves auth in
 * route handlers.
 */
export async function resolveExternalToken(
  input: { token: string; request: Request; env: Env },
): Promise<{ props: Record<string, unknown> } | null> {
  if (!input.token.startsWith('td_pat_')) return null;

  const auth = await resolvePatToken(input.env, input.token);
  if (!auth) return null;

  return { props: { userId: auth.user.id } };
}

// ============== Internal: OAuth Token Resolution ==============

/**
 * Resolve an OAuth Bearer token to an AuthResult.
 * Uses the OAUTH_PROVIDER.unwrapToken() helper to decrypt the token
 * and extract user props + granted scopes.
 */
async function resolveOAuthToken(env: Env, token: string): Promise<AuthResult | null> {
  try {
    const tokenData = await env.OAUTH_PROVIDER.unwrapToken(token);
    if (!tokenData) return null;

    // Extract userId from the decrypted grant props
    const props = tokenData.grant.props as { userId?: string } | null;
    const userId = props?.userId;
    if (!userId) return null;

    // Look up the full user record
    const db = createDatabase(env.DB);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) return null;

    return { user, scopes: tokenData.grant.scope };
  } catch {
    // Invalid token format or decryption failure
    return null;
  }
}

// ============== Internal: Session Resolution ==============

/**
 * Look up a valid (non-expired) session and its associated user in a single
 * JOIN query, eliminating two sequential D1 round-trips.
 *
 * Exported so that src/routes/auth.ts (GET /auth/me) can reuse the same
 * optimised query instead of duplicating session + user lookups.
 */
export async function resolveSessionWithUser(
  db: ReturnType<typeof createDatabase>,
  sessionToken: string,
): Promise<{ user: User; session: Session } | null> {
  const now = new Date().toISOString();

  const result = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(
      eq(sessions.id, sessionToken),
      gt(sessions.expiresAt, now),
    ))
    .limit(1);

  if (result.length === 0) return null;
  return { user: result[0].users, session: result[0].sessions };
}

/**
 * Resolve a session cookie to an AuthResult.
 * Session auth returns scopes: null (unrestricted).
 */
async function resolveSession(env: Env, request: Request): Promise<AuthResult | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(env);
  // Safe cookie parsing: split on ';' then '=' instead of regex (avoids ReDoS)
  const sessionToken = parseCookieValue(cookieHeader, cookieName);
  if (!sessionToken) return null;

  const db = createDatabase(env.DB);
  const resolved = await resolveSessionWithUser(db, sessionToken);
  if (!resolved) return null;
  return { user: resolved.user, scopes: null };
}

// ============== Cookie Parsing ==============

/**
 * Safely parse a single cookie value from a Cookie header string.
 * Uses string splitting instead of regex to avoid ReDoS risks.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (key === name) {
      return pair.slice(eqIdx + 1).trim();
    }
  }
  return null;
}

// ============== Group Role Check ==============

export interface GroupRoleResult {
  member: GroupMember | null;
  hasRole: boolean;
}

/**
 * Check if a user has at least the given role in a group.
 * Platform admins (users.role = 'admin' | 'superadmin') always pass.
 *
 * Returns { member, hasRole } so callers can use the membership record.
 */
export async function requireGroupRole(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  groupId: string,
  minRole: string,
  user?: Pick<User, 'role'>,
): Promise<GroupRoleResult> {
  // Platform admins bypass group role checks
  if (user && isPlatformAdmin(user)) {
    // Still fetch the membership if it exists (for context), but always pass
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
      ),
    });
    return { member: member ?? null, hasRole: true };
  }

  const member = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
  });

  if (!member) {
    return { member: null, hasRole: false };
  }

  return { member, hasRole: hasMinRole(member.role, minRole) };
}
