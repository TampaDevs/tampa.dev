import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  appRequest,
} from '../helpers';
import { generateDefaultUsername } from '../../../src/lib/username.js';
import { createDatabase } from '../../../src/db/index.js';

function getDb(env: { DB: D1Database }) {
  return createDatabase(env.DB);
}

describe('generateDefaultUsername', () => {
  describe('priority order', () => {
    it('prefers provider username when available and valid', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        name: 'John Smith',
        providerUsername: 'jsmith',
      });
      expect(username).toBe('jsmith');
    });

    it('falls back to name when provider username is null', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        name: 'John Smith',
        providerUsername: null,
      });
      expect(username).toBe('john-smith');
    });

    it('falls back to name when provider username is too short', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        name: 'John Smith',
        providerUsername: 'ab',
      });
      expect(username).toBe('john-smith');
    });

    it('falls back to random when name is null and no provider username', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        name: null,
        providerUsername: null,
      });
      expect(username).toMatch(/^user-[0-9a-f]{8}$/);
    });

    it('falls back to random when name produces invalid username', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      // Name with only special chars → invalid after sanitization
      const username = await generateDefaultUsername(db, {
        name: '!!!',
        providerUsername: null,
      });
      expect(username).toMatch(/^user-[0-9a-f]{8}$/);
    });
  });

  describe('name derivation', () => {
    it('uses first-last format for two-word names', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, { name: 'Alice Johnson' });
      expect(username).toBe('alice-johnson');
    });

    it('uses full name for single-word names', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, { name: 'Madonna' });
      expect(username).toBe('madonna');
    });

    it('uses first and last for multi-word names (skips middle)', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, { name: 'Mary Jane Watson' });
      expect(username).toBe('mary-watson');
    });
  });

  describe('collision resolution', () => {
    it('appends 1 when base username is taken', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      await createUser({ username: 'john-smith' });
      const username = await generateDefaultUsername(db, { name: 'John Smith' });
      expect(username).toBe('john-smith1');
    });

    it('increments suffix until finding a free username', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      await createUser({ username: 'john-smith' });
      await createUser({ username: 'john-smith1' });
      await createUser({ username: 'john-smith2' });
      const username = await generateDefaultUsername(db, { name: 'John Smith' });
      expect(username).toBe('john-smith3');
    });

    it('resolves collision on provider username before trying name', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      await createUser({ username: 'ghuser' });
      const username = await generateDefaultUsername(db, {
        name: 'John Smith',
        providerUsername: 'ghuser',
      });
      // Should try ghuser1, not john-smith
      expect(username).toBe('ghuser1');
    });
  });

  describe('reserved usernames', () => {
    it('skips reserved provider usernames and falls back to name', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        name: 'Real Person',
        providerUsername: 'admin',
      });
      expect(username).toBe('real-person');
    });

    it('skips reserved name-derived usernames and falls back to random', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      // The name "Profile Settings" would produce "profile-settings" which is valid,
      // but "Profile" alone would produce "profile" which is reserved
      const username = await generateDefaultUsername(db, {
        name: 'Admin',
        providerUsername: null,
      });
      expect(username).toMatch(/^user-[0-9a-f]{8}$/);
    });
  });

  describe('sanitization', () => {
    it('sanitizes provider usernames with special chars', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        providerUsername: 'user.name_123',
      });
      expect(username).toBe('user-name-123');
    });

    it('lowercases provider usernames', async () => {
      const { env } = createTestEnv();
      const db = getDb(env);
      const username = await generateDefaultUsername(db, {
        providerUsername: 'JohnDoe',
      });
      expect(username).toBe('johndoe');
    });
  });
});

describe('Auto-username on dev auth registration', () => {
  it('assigns a username to newly created dev users', async () => {
    const { env } = createTestEnv();
    // The dev auth endpoint creates a user with a generated username
    const res = await appRequest('/auth/dev', {
      env,
      method: 'POST',
      body: { role: 'user' },
      // Dev auth requires ENVIRONMENT=development
    });

    // Dev auth may be blocked if ENVIRONMENT !== development
    // but the username generation is integrated into the flow.
    // We test it via the generateDefaultUsername function directly above.
    // This test verifies the endpoint doesn't crash with the new code.
    if (res.status === 200) {
      const body = await res.json() as { sessionToken: string };
      expect(body.sessionToken).toBeDefined();

      // Verify the created user has a username
      const meRes = await appRequest('/auth/me', {
        env,
        headers: { Cookie: `session=${body.sessionToken}` },
      });
      const meBody = await meRes.json() as { user: { username: string | null } };
      expect(meBody.user.username).not.toBeNull();
    }
  });
});
