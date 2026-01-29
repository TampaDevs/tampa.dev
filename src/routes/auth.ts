/**
 * Authentication Routes
 *
 * GitHub OAuth flow for admin authentication.
 * Sessions are stored in D1 and tracked via HTTP-only cookies.
 */

import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, userIdentities, sessions, UserRole } from '../db/schema';
import type { Env } from '../../types/worker';

const SESSION_COOKIE = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create auth routes
 */
export function createAuthRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /auth/github - Redirect to GitHub OAuth
   */
  app.get('/github', async (c) => {
    const clientId = c.env.GITHUB_CLIENT_ID;
    const redirectUri = c.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return c.json({ error: 'GitHub OAuth not configured' }, 500);
    }

    // Get optional returnTo parameter (for OAuth consent flow)
    const returnTo = c.req.query('returnTo');

    // Generate state for CSRF protection
    // Include returnTo in state if provided (base64 encoded JSON)
    const csrf = generateSessionToken().slice(0, 32);
    const stateData = returnTo ? { csrf, returnTo } : { csrf };
    const state = btoa(JSON.stringify(stateData));

    // Store state in cookie for verification
    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  /**
   * GET /auth/github/callback - Handle GitHub OAuth callback
   */
  app.get('/github/callback', async (c) => {
    const { code, state } = c.req.query();
    const storedState = getCookie(c, 'oauth_state');

    // Clear the state cookie
    deleteCookie(c, 'oauth_state', { path: '/' });

    // Parse state to extract CSRF token and optional returnTo
    let stateData: { csrf: string; returnTo?: string } | null = null;
    let returnTo: string | undefined;

    try {
      if (state && storedState) {
        stateData = JSON.parse(atob(state));
        const storedStateData = JSON.parse(atob(storedState));
        returnTo = stateData?.returnTo;

        // Verify CSRF token
        if (stateData?.csrf !== storedStateData?.csrf) {
          return c.redirect('https://tampa.dev/login?error=invalid_state');
        }
      }
    } catch {
      // Legacy state format (plain string) - just compare directly
      // Note: If we're here, state and storedState exist (checked in try block)
      if (state !== storedState) {
        return c.redirect('https://tampa.dev/login?error=invalid_state');
      }
    }

    if (!code) {
      return c.redirect('https://tampa.dev/login?error=no_code');
    }

    const clientId = c.env.GITHUB_CLIENT_ID;
    const clientSecret = c.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return c.redirect('https://tampa.dev/login?error=not_configured');
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenResponse.json() as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        console.error('GitHub token exchange failed:', tokenData);
        return c.redirect('https://tampa.dev/login?error=token_exchange_failed');
      }

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
          'User-Agent': 'TampaDevs-Events-API',
        },
      });

      const githubUser = await userResponse.json() as {
        id: number;
        login: string;
        name?: string;
        email?: string;
        avatar_url?: string;
      };

      // Get email if not public
      let email = githubUser.email;
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'User-Agent': 'TampaDevs-Events-API',
          },
        });
        const emails = await emailsResponse.json() as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email;
      }

      if (!email) {
        return c.redirect('https://tampa.dev/login?error=no_email');
      }

      const db = createDatabase(c.env.DB);

      // Check if user is on admin allowlist (for role assignment, not login restriction)
      const allowlist = c.env.ADMIN_ALLOWLIST?.split(',').map((s) => s.trim().toLowerCase()) || [];
      const isOnAllowlist = allowlist.includes(githubUser.login.toLowerCase());

      // Find or create user
      let user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      const now = new Date().toISOString();

      if (!user) {
        // Create new user
        const userId = crypto.randomUUID();
        // Grant admin role only if user is on allowlist
        const role = isOnAllowlist ? UserRole.ADMIN : UserRole.USER;

        await db.insert(users).values({
          id: userId,
          email,
          name: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
          role,
          createdAt: now,
          updatedAt: now,
        });

        user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
      } else {
        // Update user info
        await db
          .update(users)
          .set({
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            updatedAt: now,
          })
          .where(eq(users.id, user.id));
      }

      if (!user) {
        return c.redirect('https://tampa.dev/login?error=user_creation_failed');
      }

      // Upsert identity
      const existingIdentity = await db.query.userIdentities.findFirst({
        where: and(
          eq(userIdentities.provider, 'github'),
          eq(userIdentities.providerUserId, String(githubUser.id))
        ),
      });

      if (existingIdentity) {
        await db
          .update(userIdentities)
          .set({
            providerUsername: githubUser.login,
            accessToken: tokenData.access_token,
          })
          .where(eq(userIdentities.id, existingIdentity.id));
      } else {
        await db.insert(userIdentities).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: 'github',
          providerUserId: String(githubUser.id),
          providerUsername: githubUser.login,
          accessToken: tokenData.access_token,
          createdAt: now,
        });
      }

      // Create session
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

      await db.insert(sessions).values({
        id: sessionToken,
        userId: user.id,
        expiresAt,
        createdAt: now,
      });

      // Set session cookie (domain allows sharing between tampa.dev subdomains)
      setCookie(c, SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: SESSION_DURATION_MS / 1000,
        path: '/',
        domain: '.tampa.dev',
      });

      // Redirect to returnTo URL if provided, otherwise home page
      const redirectUrl = returnTo || '/';
      return c.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return c.redirect('https://tampa.dev/login?error=oauth_failed');
    }
  });

  /**
   * GET /auth/me - Get current authenticated user
   */
  app.get('/me', async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE);

    if (!sessionToken) {
      return c.json({ user: null }, 200);
    }

    const db = createDatabase(c.env.DB);

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionToken),
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
      // Session expired or invalid
      deleteCookie(c, SESSION_COOKIE, { path: '/', domain: '.tampa.dev' });
      return c.json({ user: null }, 200);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      deleteCookie(c, SESSION_COOKIE, { path: '/', domain: '.tampa.dev' });
      return c.json({ user: null }, 200);
    }

    // Get GitHub identity for username
    const identity = await db.query.userIdentities.findFirst({
      where: and(
        eq(userIdentities.userId, user.id),
        eq(userIdentities.provider, 'github')
      ),
    });

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        githubUsername: identity?.providerUsername,
      },
    });
  });

  /**
   * POST /auth/logout - Log out current user
   */
  app.post('/logout', async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE);

    if (sessionToken) {
      const db = createDatabase(c.env.DB);
      await db.delete(sessions).where(eq(sessions.id, sessionToken));
    }

    deleteCookie(c, SESSION_COOKIE, { path: '/', domain: '.tampa.dev' });

    return c.json({ success: true });
  });

  /**
   * POST /auth/dev - Development-only auth bypass
   *
   * Creates a session for a dev user without GitHub OAuth.
   * Only works in local development (localhost/127.0.0.1).
   */
  app.post('/dev', async (c) => {
    // Check if this is a local development request
    const url = new URL(c.req.url);
    const isLocal = url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname.endsWith('.localhost') ||
      url.hostname.includes('local');

    if (!isLocal) {
      return c.json({ error: 'Dev auth only available in local development' }, 403);
    }

    const body = await c.req.json<{ role?: string }>().catch(() => ({} as { role?: string }));
    const requestedRole = body.role || 'admin';

    // Validate role
    const validRoles = ['user', 'admin', 'superadmin'];
    const role = validRoles.includes(requestedRole) ? requestedRole : 'admin';

    const db = createDatabase(c.env.DB);
    const now = new Date().toISOString();

    // Dev user email based on role
    const devEmail = `dev-${role}@tampa.dev`;

    // Find or create dev user
    let user = await db.query.users.findFirst({
      where: eq(users.email, devEmail),
    });

    if (!user) {
      const userId = crypto.randomUUID();

      await db.insert(users).values({
        id: userId,
        email: devEmail,
        name: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${role}`,
        role: role as typeof UserRole.USER | typeof UserRole.ADMIN | typeof UserRole.SUPERADMIN,
        createdAt: now,
        updatedAt: now,
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    }

    if (!user) {
      return c.json({ error: 'Failed to create dev user' }, 500);
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    await db.insert(sessions).values({
      id: sessionToken,
      userId: user.id,
      expiresAt,
      createdAt: now,
    });

    return c.json({ sessionToken });
  });

  return app;
}

export const authRoutes = createAuthRoutes();
