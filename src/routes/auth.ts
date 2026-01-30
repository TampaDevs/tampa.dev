/**
 * Authentication Routes
 *
 * Multi-provider OAuth flow for user authentication.
 * Sessions are stored in D1 and tracked via HTTP-only cookies.
 *
 * Supports GitHub (existing), Google, LinkedIn, and Slack.
 * New providers are configured via the oauth-providers registry.
 */

import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db';
import { users, userIdentities, sessions, UserRole } from '../db/schema';
import type { Env } from '../../types/worker';
import { getSessionCookieName } from '../lib/session';
import { getConfiguredProviders, getProvider } from '../lib/oauth-providers';
import { EventBus } from '../lib/event-bus.js';

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

/** Routes that should not be matched by the generic /:provider handler */
const RESERVED_AUTH_ROUTES = new Set(['me', 'providers', 'logout', 'dev', 'identities']);

// ─── Apple Sign-In helpers ──────────────────────────────────────────

/**
 * Generate Apple client_secret JWT.
 * Apple requires a signed JWT as the client_secret for token exchange.
 * See: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
async function generateAppleClientSecret(env: Env): Promise<string> {
  const teamId = env.APPLE_TEAM_ID!;
  const clientId = env.APPLE_CLIENT_ID!;
  const keyId = env.APPLE_KEY_ID!;
  const privateKeyPem = env.APPLE_PRIVATE_KEY!;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15777000; // ~6 months

  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  // Base64url encode
  const b64url = (data: Uint8Array | string): string => {
    const str = typeof data === 'string' ? data : String.fromCharCode(...data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the PEM private key
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = b64url(new Uint8Array(signature));
  return `${signingInput}.${sigB64}`;
}

/**
 * Parse Apple's id_token JWT to extract user sub and email.
 * We only decode the payload (no signature verification needed since
 * Apple's server just returned it to us over HTTPS).
 */
function parseAppleIdToken(idToken: string): { sub: string; email?: string } {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid id_token format');

  // Pad base64url to standard base64
  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (payload.length % 4 !== 0) payload += '=';

  const decoded = JSON.parse(atob(payload));
  return { sub: decoded.sub, email: decoded.email };
}

/**
 * Create auth routes
 */
export function createAuthRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  // ─── Providers endpoint ───────────────────────────────────────────

  /**
   * GET /auth/providers - Return list of configured auth providers
   */
  app.get('/providers', async (c) => {
    const configured = getConfiguredProviders(c.env);
    return c.json({
      providers: configured.map(p => ({
        name: p.name,
        provider: p.provider,
        authUrl: `/auth/${p.provider}`,
      })),
    });
  });

  // ─── GitHub-specific routes (kept for backward compatibility) ─────

  /**
   * GET /auth/github - Redirect to GitHub OAuth
   */
  app.get('/github', async (c) => {
    const clientId = c.env.GITHUB_CLIENT_ID;
    const redirectUri = c.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return c.json({ error: 'GitHub OAuth not configured' }, 500);
    }

    const returnTo = c.req.query('returnTo');
    const linkUserId = c.req.query('linkUserId');

    const csrf = generateSessionToken().slice(0, 32);
    const stateData: Record<string, string> = { csrf };
    if (returnTo) stateData.returnTo = returnTo;
    if (linkUserId) stateData.linkUserId = linkUserId;
    const state = btoa(JSON.stringify(stateData));

    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
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
    const origin = new URL(c.req.url).origin;

    deleteCookie(c, 'oauth_state', { path: '/' });

    // Parse state
    let stateData: { csrf: string; returnTo?: string; linkUserId?: string } | null = null;
    let returnTo: string | undefined;

    try {
      if (state && storedState) {
        stateData = JSON.parse(atob(state));
        const storedStateData = JSON.parse(atob(storedState));
        returnTo = stateData?.returnTo;

        if (stateData?.csrf !== storedStateData?.csrf) {
          return c.redirect(`${origin}/login?error=invalid_state`);
        }
      }
    } catch {
      if (state !== storedState) {
        return c.redirect(`${origin}/login?error=invalid_state`);
      }
    }

    if (!code) {
      return c.redirect(`${origin}/login?error=no_code`);
    }

    const clientId = c.env.GITHUB_CLIENT_ID;
    const clientSecret = c.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return c.redirect(`${origin}/login?error=not_configured`);
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
        console.error('GitHub token exchange failed:', tokenData.error || 'missing access_token');
        return c.redirect(`${origin}/login?error=token_exchange_failed`);
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
        return c.redirect(`${origin}/login?error=no_email`);
      }

      const db = createDatabase(c.env.DB);
      const now = new Date().toISOString();
      const isLinkMode = !!stateData?.linkUserId;

      let user;

      if (isLinkMode) {
        // Link mode: verify session and attach to existing user
        const sessionToken = getCookie(c, getSessionCookieName(c.env));
        if (!sessionToken) {
          return c.redirect(`${origin}/login?error=session_required`);
        }
        const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionToken) });
        if (!session || session.userId !== stateData!.linkUserId!) {
          return c.redirect(`${origin}/profile?error=unauthorized_link`);
        }
        user = await db.query.users.findFirst({ where: eq(users.id, stateData!.linkUserId!) });
        if (!user) {
          return c.redirect(`${origin}/profile?error=link_failed`);
        }

        // Check if this identity is already linked to a different user
        const conflictIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, 'github'),
            eq(userIdentities.providerUserId, String(githubUser.id))
          ),
        });
        if (conflictIdentity && conflictIdentity.userId !== user.id) {
          return c.redirect(`${origin}/profile?error=identity_already_linked`);
        }
      } else {
        // Sign-in mode: identity lookup → email lookup → create
        const existingIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, 'github'),
            eq(userIdentities.providerUserId, String(githubUser.id))
          ),
        });

        if (existingIdentity) {
          user = await db.query.users.findFirst({ where: eq(users.id, existingIdentity.userId) });
        } else {
          // Auto-link by email
          user = await db.query.users.findFirst({ where: eq(users.email, email) });
        }

        if (!user) {
          // Create new user
          const allowlist = c.env.ADMIN_ALLOWLIST?.split(',').map((s) => s.trim().toLowerCase()) || [];
          const isOnAllowlist = allowlist.includes(githubUser.login.toLowerCase());
          const role = isOnAllowlist ? UserRole.ADMIN : UserRole.USER;
          const userId = crypto.randomUUID();

          await db.insert(users).values({
            id: userId,
            email,
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            role,
            createdAt: now,
            updatedAt: now,
          });

          user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        } else {
          // Update user info on login
          await db.update(users).set({
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            updatedAt: now,
          }).where(eq(users.id, user.id));
        }
      }

      if (!user) {
        return c.redirect(`${origin}/login?error=user_creation_failed`);
      }

      // Upsert identity
      const existingIdentity = await db.query.userIdentities.findFirst({
        where: and(
          eq(userIdentities.provider, 'github'),
          eq(userIdentities.providerUserId, String(githubUser.id))
        ),
      });

      if (existingIdentity) {
        await db.update(userIdentities).set({
          providerUsername: githubUser.login,
          accessToken: tokenData.access_token,
          providerEmail: email,
        }).where(eq(userIdentities.id, existingIdentity.id));
      } else {
        await db.insert(userIdentities).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: 'github',
          providerUserId: String(githubUser.id),
          providerUsername: githubUser.login,
          accessToken: tokenData.access_token,
          providerEmail: email,
          createdAt: now,
        });

        // Emit event for achievement tracking
        if (c.env.EVENTS_QUEUE) {
          const eventBus = new EventBus(c.env.EVENTS_QUEUE);
          eventBus.publish({
            type: 'user.identity_linked',
            payload: { userId: user.id, provider: 'github' },
            metadata: { userId: user.id, source: 'auth' },
          }).catch(() => {});
        }
      }

      // Create session (skip if link mode — already has session)
      if (!isLinkMode) {
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

        await db.insert(sessions).values({
          id: sessionToken,
          userId: user.id,
          expiresAt,
          createdAt: now,
        });

        setCookie(c, getSessionCookieName(c.env), sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          maxAge: SESSION_DURATION_MS / 1000,
          path: '/',
          domain: '.tampa.dev',
        });
      }

      const redirectUrl = isLinkMode ? `${origin}/profile` : (returnTo || `${origin}/`);
      return c.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub OAuth error:', error instanceof Error ? error.message : 'unknown error');
      return c.redirect(`${origin}/login?error=oauth_failed`);
    }
  });

  // ─── Session endpoints ────────────────────────────────────────────

  /**
   * GET /auth/me - Get current authenticated user
   */
  app.get('/me', async (c) => {
    const sessionToken = getCookie(c, getSessionCookieName(c.env));

    if (!sessionToken) {
      return c.json({ user: null }, 200);
    }

    const db = createDatabase(c.env.DB);

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionToken),
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
      deleteCookie(c, getSessionCookieName(c.env), { path: '/', domain: '.tampa.dev' });
      return c.json({ user: null }, 200);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      deleteCookie(c, getSessionCookieName(c.env), { path: '/', domain: '.tampa.dev' });
      return c.json({ user: null }, 200);
    }

    // Get all identities for this user
    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, user.id),
    });

    const githubIdentity = identities.find(i => i.provider === 'github');

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        showAchievements: user.showAchievements,
        githubUsername: githubIdentity?.providerUsername, // backwards compat
        identities: identities.map(i => ({
          provider: i.provider,
          username: i.providerUsername,
          email: i.providerEmail,
        })),
      },
    });
  });

  /**
   * POST /auth/logout - Log out current user
   */
  app.post('/logout', async (c) => {
    const sessionToken = getCookie(c, getSessionCookieName(c.env));

    if (sessionToken) {
      const db = createDatabase(c.env.DB);
      await db.delete(sessions).where(eq(sessions.id, sessionToken));
    }

    deleteCookie(c, getSessionCookieName(c.env), { path: '/', domain: '.tampa.dev' });

    const origin = new URL(c.req.url).origin;
    return c.redirect(`${origin}/`);
  });

  // ─── Identity management ──────────────────────────────────────────

  /**
   * DELETE /auth/identities/:provider - Unlink an identity
   */
  app.delete('/identities/:provider', async (c) => {
    const sessionToken = getCookie(c, getSessionCookieName(c.env));
    if (!sessionToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDatabase(c.env.DB);

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionToken),
    });
    if (!session || new Date(session.expiresAt) < new Date()) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const provider = c.req.param('provider');

    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, user.id),
    });

    if (identities.length <= 1) {
      return c.json({ error: 'Cannot unlink your last sign-in method' }, 400);
    }

    const identity = identities.find(i => i.provider === provider);
    if (!identity) {
      return c.json({ error: 'Identity not found' }, 404);
    }

    await db.delete(userIdentities).where(eq(userIdentities.id, identity.id));

    return c.json({ success: true });
  });

  // ─── Development auth ─────────────────────────────────────────────

  /**
   * POST /auth/dev - Development-only auth bypass
   */
  app.post('/dev', async (c) => {
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

    const validRoles = ['user', 'admin', 'superadmin'];
    const role = validRoles.includes(requestedRole) ? requestedRole : 'admin';

    const db = createDatabase(c.env.DB);
    const now = new Date().toISOString();

    const devEmail = `dev-${role}@tampa.dev`;

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

  // ─── Generic OAuth routes (Google, LinkedIn, Slack, etc.) ─────────

  /**
   * GET /auth/:provider - Redirect to any configured OAuth provider
   */
  app.get('/:provider', async (c) => {
    const providerKey = c.req.param('provider');

    if (RESERVED_AUTH_ROUTES.has(providerKey) || providerKey === 'github') {
      return c.notFound();
    }

    const providerConfig = getProvider(providerKey);
    if (!providerConfig) {
      return c.json({ error: 'Unknown provider' }, 404);
    }

    const creds = providerConfig.getCredentials(c.env);
    if (!creds) {
      return c.json({ error: `${providerConfig.name} OAuth not configured` }, 500);
    }

    const returnTo = c.req.query('returnTo');
    const linkUserId = c.req.query('linkUserId');

    const csrf = generateSessionToken().slice(0, 32);
    const stateData: Record<string, string> = { csrf, provider: providerKey };
    if (returnTo) stateData.returnTo = returnTo;
    if (linkUserId) stateData.linkUserId = linkUserId;
    const state = btoa(JSON.stringify(stateData));

    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 600,
      path: '/',
    });

    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      scope: providerConfig.scopes.join(' '),
      state,
      response_type: 'code',
    });

    // Add provider-specific auth params (e.g., Slack user_scope)
    if (providerConfig.authParams) {
      for (const [key, value] of Object.entries(providerConfig.authParams)) {
        params.set(key, value);
      }
    }

    return c.redirect(`${providerConfig.authUrl}?${params}`);
  });

  /**
   * POST /auth/apple/callback - Handle Apple Sign-In callback (form_post)
   *
   * Apple uses response_mode=form_post, so the callback is a POST with
   * form-encoded body containing code, state, and optionally user info.
   * Apple only sends user info (name) on the FIRST sign-in.
   */
  app.post('/apple/callback', async (c) => {
    const body = await c.req.parseBody();
    const code = body['code'] as string | undefined;
    const state = body['state'] as string | undefined;
    const storedState = getCookie(c, 'oauth_state');
    const origin = new URL(c.req.url).origin;

    // Apple sends user info as a JSON string on first sign-in only
    let appleUserInfo: { name?: { firstName?: string; lastName?: string }; email?: string } | null = null;
    if (body['user']) {
      try {
        appleUserInfo = JSON.parse(body['user'] as string);
      } catch { /* ignore parse errors */ }
    }

    deleteCookie(c, 'oauth_state', { path: '/' });

    // Verify CSRF state
    let stateData: { csrf: string; returnTo?: string; linkUserId?: string } | null = null;
    try {
      if (state && storedState) {
        stateData = JSON.parse(atob(state));
        const storedStateData = JSON.parse(atob(storedState));
        if (stateData?.csrf !== storedStateData?.csrf) {
          return c.redirect(`${origin}/login?error=invalid_state`);
        }
      } else {
        return c.redirect(`${origin}/login?error=invalid_state`);
      }
    } catch {
      return c.redirect(`${origin}/login?error=invalid_state`);
    }

    if (!code) {
      return c.redirect(`${origin}/login?error=no_code`);
    }

    const env = c.env;
    if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_REDIRECT_URI) {
      return c.redirect(`${origin}/login?error=not_configured`);
    }

    try {
      // Generate client_secret JWT for Apple
      const clientSecret = await generateAppleClientSecret(env);

      // Exchange code for tokens
      const tokenBody = new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        redirect_uri: env.APPLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString();

      const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      });

      const tokenData = await tokenResponse.json() as {
        access_token?: string;
        id_token?: string;
        error?: string;
      };

      if (!tokenData.id_token) {
        console.error('Apple token exchange failed:', tokenData.error || 'missing id_token');
        return c.redirect(`${origin}/login?error=token_exchange_failed`);
      }

      // Parse id_token to get user sub + email
      const idTokenPayload = parseAppleIdToken(tokenData.id_token);
      const appleUserId = idTokenPayload.sub;
      const email = idTokenPayload.email || appleUserInfo?.email;

      if (!email) {
        return c.redirect(`${origin}/login?error=no_email`);
      }

      // Build display name from Apple's first-sign-in user info
      const appleName = appleUserInfo?.name
        ? [appleUserInfo.name.firstName, appleUserInfo.name.lastName].filter(Boolean).join(' ')
        : undefined;

      const db = createDatabase(c.env.DB);
      const now = new Date().toISOString();
      const isLinkMode = !!stateData?.linkUserId;

      let user;

      if (isLinkMode) {
        const sessionToken = getCookie(c, getSessionCookieName(c.env));
        if (!sessionToken) {
          return c.redirect(`${origin}/login?error=session_required`);
        }
        const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionToken) });
        if (!session || session.userId !== stateData!.linkUserId!) {
          return c.redirect(`${origin}/profile?error=unauthorized_link`);
        }
        user = await db.query.users.findFirst({ where: eq(users.id, stateData!.linkUserId!) });
        if (!user) {
          return c.redirect(`${origin}/profile?error=link_failed`);
        }

        const conflictIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, 'apple'),
            eq(userIdentities.providerUserId, appleUserId)
          ),
        });
        if (conflictIdentity && conflictIdentity.userId !== user.id) {
          return c.redirect(`${origin}/profile?error=identity_already_linked`);
        }
      } else {
        const existingIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, 'apple'),
            eq(userIdentities.providerUserId, appleUserId)
          ),
        });

        if (existingIdentity) {
          user = await db.query.users.findFirst({ where: eq(users.id, existingIdentity.userId) });
        } else {
          user = await db.query.users.findFirst({ where: eq(users.email, email) });
        }

        if (!user) {
          const userId = crypto.randomUUID();
          await db.insert(users).values({
            id: userId,
            email,
            name: appleName || email,
            role: UserRole.USER,
            createdAt: now,
            updatedAt: now,
          });
          user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        } else if (appleName) {
          // Update name if Apple provided it and user doesn't have one
          if (!user.name || user.name === user.email) {
            await db.update(users).set({ name: appleName, updatedAt: now }).where(eq(users.id, user.id));
          }
        }
      }

      if (!user) {
        return c.redirect(`${origin}/login?error=user_creation_failed`);
      }

      // Upsert identity
      const existingIdentity = await db.query.userIdentities.findFirst({
        where: and(
          eq(userIdentities.provider, 'apple'),
          eq(userIdentities.providerUserId, appleUserId)
        ),
      });

      if (existingIdentity) {
        await db.update(userIdentities).set({
          accessToken: tokenData.access_token || null,
          providerEmail: email,
        }).where(eq(userIdentities.id, existingIdentity.id));
      } else {
        await db.insert(userIdentities).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: 'apple',
          providerUserId: appleUserId,
          providerUsername: null,
          accessToken: tokenData.access_token || null,
          providerEmail: email,
          createdAt: now,
        });

        // Emit event for achievement tracking
        if (c.env.EVENTS_QUEUE) {
          const eventBus = new EventBus(c.env.EVENTS_QUEUE);
          eventBus.publish({
            type: 'user.identity_linked',
            payload: { userId: user.id, provider: 'apple' },
            metadata: { userId: user.id, source: 'auth' },
          }).catch(() => {});
        }
      }

      // Create session (skip if link mode)
      if (!isLinkMode) {
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

        await db.insert(sessions).values({
          id: sessionToken,
          userId: user.id,
          expiresAt,
          createdAt: now,
        });

        setCookie(c, getSessionCookieName(c.env), sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          maxAge: SESSION_DURATION_MS / 1000,
          path: '/',
          domain: '.tampa.dev',
        });
      }

      const redirectUrl = isLinkMode ? `${origin}/profile` : (stateData?.returnTo || `${origin}/`);
      return c.redirect(redirectUrl);
    } catch (error) {
      console.error('Apple Sign-In error:', error instanceof Error ? error.message : 'unknown error');
      return c.redirect(`${origin}/login?error=oauth_failed`);
    }
  });

  /**
   * GET /auth/:provider/callback - Handle OAuth callback for non-GitHub providers
   */
  app.get('/:provider/callback', async (c) => {
    const providerKey = c.req.param('provider');

    if (providerKey === 'github' || providerKey === 'apple') {
      // GitHub and Apple use their own specific callback handlers
      return c.notFound();
    }

    const providerConfig = getProvider(providerKey);
    if (!providerConfig) {
      return c.json({ error: 'Unknown provider' }, 404);
    }

    const { code, state } = c.req.query();
    const storedState = getCookie(c, 'oauth_state');
    const origin = new URL(c.req.url).origin;

    deleteCookie(c, 'oauth_state', { path: '/' });

    // Verify CSRF state
    let stateData: { csrf: string; returnTo?: string; linkUserId?: string; provider?: string } | null = null;
    try {
      if (state && storedState) {
        stateData = JSON.parse(atob(state));
        const storedStateData = JSON.parse(atob(storedState));
        if (stateData?.csrf !== storedStateData?.csrf) {
          return c.redirect(`${origin}/login?error=invalid_state`);
        }
      } else {
        return c.redirect(`${origin}/login?error=invalid_state`);
      }
    } catch {
      return c.redirect(`${origin}/login?error=invalid_state`);
    }

    if (!code) {
      return c.redirect(`${origin}/login?error=no_code`);
    }

    const creds = providerConfig.getCredentials(c.env);
    if (!creds) {
      return c.redirect(`${origin}/login?error=not_configured`);
    }

    try {
      // Exchange code for access token
      let tokenBody: string;
      let tokenHeaders: Record<string, string>;

      if (providerConfig.tokenRequestFormat === 'form') {
        tokenBody = new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code,
          redirect_uri: creds.redirectUri,
          grant_type: 'authorization_code',
        }).toString();
        tokenHeaders = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
      } else {
        tokenBody = JSON.stringify({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code,
        });
        tokenHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };
      }

      const tokenResponse = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: tokenHeaders,
        body: tokenBody,
      });

      const tokenData = await tokenResponse.json() as Record<string, any>;

      // Extract access token (supports nested paths like 'authed_user.access_token')
      let accessToken: string | undefined;
      if (providerConfig.tokenResponsePath) {
        const parts = providerConfig.tokenResponsePath.split('.');
        let obj: any = tokenData;
        for (const part of parts) {
          obj = obj?.[part];
        }
        accessToken = obj;
      } else {
        accessToken = tokenData.access_token;
      }

      if (!accessToken) {
        console.error(
          `${providerConfig.name} token exchange failed: missing access token (status ${tokenResponse.status})`
        );
        return c.redirect(`${origin}/login?error=token_exchange_failed`);
      }

      // Get user info
      const userInfoHeaders = providerConfig.userInfoHeaders
        ? providerConfig.userInfoHeaders(accessToken)
        : { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };

      const userInfoFetchOptions: RequestInit = { headers: userInfoHeaders };
      if (providerConfig.userInfoMethod === 'POST') {
        userInfoFetchOptions.method = 'POST';
        if (providerConfig.userInfoBody) {
          userInfoFetchOptions.body = providerConfig.userInfoBody;
        }
      }

      const userInfoResponse = await fetch(providerConfig.userInfoUrl, userInfoFetchOptions);
      const userInfoData = await userInfoResponse.json();
      const providerUser = providerConfig.parseUserInfo(userInfoData);

      if (!providerUser.email) {
        return c.redirect(`${origin}/login?error=no_email`);
      }

      const db = createDatabase(c.env.DB);
      const now = new Date().toISOString();
      const isLinkMode = !!stateData?.linkUserId;

      let user;

      if (isLinkMode) {
        // Link mode: verify session and attach to existing user
        const sessionToken = getCookie(c, getSessionCookieName(c.env));
        if (!sessionToken) {
          return c.redirect(`${origin}/login?error=session_required`);
        }
        const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionToken) });
        if (!session || session.userId !== stateData!.linkUserId!) {
          return c.redirect(`${origin}/profile?error=unauthorized_link`);
        }
        user = await db.query.users.findFirst({ where: eq(users.id, stateData!.linkUserId!) });
        if (!user) {
          return c.redirect(`${origin}/profile?error=link_failed`);
        }

        // Check if this identity is already linked to a different user
        const conflictIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, providerKey),
            eq(userIdentities.providerUserId, providerUser.id)
          ),
        });
        if (conflictIdentity && conflictIdentity.userId !== user.id) {
          return c.redirect(`${origin}/profile?error=identity_already_linked`);
        }
      } else {
        // Sign-in mode: identity lookup → email auto-link → create
        const existingIdentity = await db.query.userIdentities.findFirst({
          where: and(
            eq(userIdentities.provider, providerKey),
            eq(userIdentities.providerUserId, providerUser.id)
          ),
        });

        if (existingIdentity) {
          user = await db.query.users.findFirst({ where: eq(users.id, existingIdentity.userId) });
        } else {
          // Auto-link by email
          user = await db.query.users.findFirst({ where: eq(users.email, providerUser.email) });
        }

        if (!user) {
          // Create new user
          const userId = crypto.randomUUID();
          const allowlist = c.env.ADMIN_ALLOWLIST?.split(',').map(s => s.trim().toLowerCase()) || [];
          const isOnAllowlist = providerUser.username ? allowlist.includes(providerUser.username.toLowerCase()) : false;
          const role = isOnAllowlist ? UserRole.ADMIN : UserRole.USER;

          await db.insert(users).values({
            id: userId,
            email: providerUser.email,
            name: providerUser.name || providerUser.email,
            avatarUrl: providerUser.avatarUrl || null,
            role,
            createdAt: now,
            updatedAt: now,
          });

          user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        }
      }

      if (!user) {
        return c.redirect(`${origin}/login?error=user_creation_failed`);
      }

      // Upsert identity
      const existingIdentity = await db.query.userIdentities.findFirst({
        where: and(
          eq(userIdentities.provider, providerKey),
          eq(userIdentities.providerUserId, providerUser.id)
        ),
      });

      if (existingIdentity) {
        await db.update(userIdentities).set({
          providerUsername: providerUser.username || null,
          accessToken: accessToken,
          providerEmail: providerUser.email,
        }).where(eq(userIdentities.id, existingIdentity.id));
      } else {
        await db.insert(userIdentities).values({
          id: crypto.randomUUID(),
          userId: user.id,
          provider: providerKey,
          providerUserId: providerUser.id,
          providerUsername: providerUser.username || null,
          accessToken: accessToken,
          providerEmail: providerUser.email,
          createdAt: now,
        });

        // Emit event for achievement tracking
        if (c.env.EVENTS_QUEUE) {
          const eventBus = new EventBus(c.env.EVENTS_QUEUE);
          eventBus.publish({
            type: 'user.identity_linked',
            payload: { userId: user.id, provider: providerKey },
            metadata: { userId: user.id, source: 'auth' },
          }).catch(() => {});
        }
      }

      // Create session (skip if link mode — already has session)
      if (!isLinkMode) {
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

        await db.insert(sessions).values({
          id: sessionToken,
          userId: user.id,
          expiresAt,
          createdAt: now,
        });

        setCookie(c, getSessionCookieName(c.env), sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          maxAge: SESSION_DURATION_MS / 1000,
          path: '/',
          domain: '.tampa.dev',
        });
      }

      const redirectUrl = isLinkMode ? `${origin}/profile` : (stateData?.returnTo || `${origin}/`);
      return c.redirect(redirectUrl);
    } catch (error) {
      console.error(`${providerConfig.name} OAuth error:`, error instanceof Error ? error.message : 'unknown error');
      return c.redirect(`${origin}/login?error=oauth_failed`);
    }
  });

  return app;
}

export const authRoutes = createAuthRoutes();
