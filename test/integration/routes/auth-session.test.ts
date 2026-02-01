import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  appRequest,
} from '../helpers';

describe('GET /auth/me', () => {
  it('returns null user without session cookie', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/auth/me', { env });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('returns user data with valid session', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ name: 'Auth Test User', username: 'authtest' });
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { name: string; username: string } };
    expect(body.user).not.toBeNull();
    expect(body.user.name).toBe('Auth Test User');
    expect(body.user.username).toBe('authtest');
  });

  it('returns null user when session is expired', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id, {
      expiresAt: new Date(Date.now() - 60_000).toISOString(), // expired 1 minute ago
    });

    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it('returns null user with invalid session token', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/auth/me', {
      env,
      headers: { Cookie: 'session=invalid-token-that-does-not-exist' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });
});
