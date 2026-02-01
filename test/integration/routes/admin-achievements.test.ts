import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createAdminUser,
  createUser,
  createSession,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Admin Achievements API — enabled field', () => {
  describe('POST /admin/achievements', () => {
    it('creates an achievement with enabled=true by default', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_default_enabled',
          name: 'Test Default Enabled',
          description: 'Should be enabled by default',
          targetValue: 1,
          eventType: 'test.ping',
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { enabled: number } };
      expect(body.data.enabled).toBe(1);
    });

    it('creates an achievement with enabled=false', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_disabled',
          name: 'Test Disabled',
          description: 'Created as disabled',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: false,
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { enabled: number } };
      expect(body.data.enabled).toBe(0);
    });

    it('creates an achievement with enabled=true explicitly', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      const res = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_explicit_enabled',
          name: 'Test Explicit Enabled',
          description: 'Explicitly enabled',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: true,
        },
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { data: { enabled: number } };
      expect(body.data.enabled).toBe(1);
    });
  });

  describe('PATCH /admin/achievements/:id', () => {
    it('disables an enabled achievement', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      // Create an enabled achievement
      const createRes = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_toggle_off',
          name: 'Toggle Off',
          description: 'Will be disabled',
          targetValue: 1,
          eventType: 'test.ping',
        },
      });
      const created = await createRes.json() as { data: { id: string; enabled: number } };
      expect(created.data.enabled).toBe(1);

      // Disable it
      const patchRes = await appRequest(`/admin/achievements/${created.data.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { enabled: false },
      });
      expect(patchRes.status).toBe(200);
      const updated = await patchRes.json() as { data: { enabled: number } };
      expect(updated.data.enabled).toBe(0);
    });

    it('re-enables a disabled achievement', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      // Create a disabled achievement
      const createRes = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_toggle_on',
          name: 'Toggle On',
          description: 'Will be re-enabled',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: false,
        },
      });
      const created = await createRes.json() as { data: { id: string; enabled: number } };
      expect(created.data.enabled).toBe(0);

      // Re-enable it
      const patchRes = await appRequest(`/admin/achievements/${created.data.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { enabled: true },
      });
      expect(patchRes.status).toBe(200);
      const updated = await patchRes.json() as { data: { enabled: number } };
      expect(updated.data.enabled).toBe(1);
    });

    it('does not change enabled when not included in PATCH body', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      // Create a disabled achievement
      const createRes = await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'test_no_change',
          name: 'No Change',
          description: 'Enabled field unchanged',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: false,
        },
      });
      const created = await createRes.json() as { data: { id: string; enabled: number } };
      expect(created.data.enabled).toBe(0);

      // Update name only (enabled not in body)
      const patchRes = await appRequest(`/admin/achievements/${created.data.id}`, {
        env,
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
        body: { name: 'Updated Name' },
      });
      expect(patchRes.status).toBe(200);
      const updated = await patchRes.json() as { data: { enabled: number; name: string } };
      expect(updated.data.enabled).toBe(0);
      expect(updated.data.name).toBe('Updated Name');
    });
  });

  describe('GET /admin/achievements', () => {
    it('returns enabled field in achievement list', async () => {
      const { env } = createTestEnv();
      const admin = await createAdminUser();
      const { cookieHeader } = await createSession(admin.id);

      // Create one enabled and one disabled
      await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'list_enabled',
          name: 'Enabled One',
          description: 'Enabled',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: true,
        },
      });
      await appRequest('/admin/achievements', {
        env,
        method: 'POST',
        headers: { Cookie: cookieHeader },
        body: {
          key: 'list_disabled',
          name: 'Disabled One',
          description: 'Disabled',
          targetValue: 1,
          eventType: 'test.ping',
          enabled: false,
        },
      });

      const res = await appRequest('/admin/achievements', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { data: { key: string; enabled: number }[] };
      expect(body.data).toHaveLength(2);

      const enabledAch = body.data.find((a) => a.key === 'list_enabled');
      const disabledAch = body.data.find((a) => a.key === 'list_disabled');
      expect(enabledAch?.enabled).toBe(1);
      expect(disabledAch?.enabled).toBe(0);
    });
  });

  describe('Authorization', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const { env } = createTestEnv();

      const res = await appRequest('/admin/achievements', { env });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      const { env } = createTestEnv();
      const user = await createUser();
      const { cookieHeader } = await createSession(user.id);

      const res = await appRequest('/admin/achievements', {
        env,
        headers: { Cookie: cookieHeader },
      });
      expect(res.status).toBe(403);
    });
  });
});
