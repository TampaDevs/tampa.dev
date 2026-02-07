import { describe, it, expect } from 'vitest';
import { createTestEnv, createUser, appRequest } from '../helpers';

// ============== URL Validation (SSRF Prevention) ==============

import { validateWebhookUrl } from '../../../src/lib/url-validation';

describe('URL Validation (SSRF Prevention)', () => {
  describe('rejects private/internal addresses', () => {
    it('rejects http://localhost', () => {
      const result = validateWebhookUrl('http://localhost', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('rejects http://127.0.0.1', () => {
      const result = validateWebhookUrl('http://127.0.0.1', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('rejects http://10.0.0.1', () => {
      const result = validateWebhookUrl('http://10.0.0.1', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('rejects http://192.168.1.1', () => {
      const result = validateWebhookUrl('http://192.168.1.1', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('rejects http://172.16.0.1', () => {
      const result = validateWebhookUrl('http://172.16.0.1', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });
  });

  describe('rejects cloud metadata endpoints', () => {
    it('rejects http://169.254.169.254', () => {
      const result = validateWebhookUrl('http://169.254.169.254', { allowHttp: true });
      expect(result.valid).toBe(false);
    });
  });

  describe('rejects blocked ports', () => {
    it('rejects https://example.com:6379 (Redis)', () => {
      const result = validateWebhookUrl('https://example.com:6379');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('6379');
    });
  });

  describe('rejects IPv6 loopback', () => {
    it('rejects http://[::1]', () => {
      const result = validateWebhookUrl('http://[::1]', { allowHttp: true });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IPv6');
    });
  });

  describe('accepts valid public URLs', () => {
    it('accepts https://example.com', () => {
      const result = validateWebhookUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts https://hooks.slack.com/services/xxx', () => {
      const result = validateWebhookUrl('https://hooks.slack.com/services/xxx');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('requires HTTPS by default', () => {
    it('rejects plain HTTP when allowHttp is not set', () => {
      const result = validateWebhookUrl('http://example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('allows HTTP when allowHttp is explicitly set', () => {
      const result = validateWebhookUrl('http://example.com', { allowHttp: true });
      expect(result.valid).toBe(true);
    });
  });
});

// ============== Redirect Validation (Open Redirect Prevention) ==============

import { validateReturnTo } from '../../../src/lib/redirect-validation';

describe('Redirect Validation (Open Redirect Prevention)', () => {
  const fallback = '/';

  describe('trusted redirects', () => {
    it('trusts relative paths like /profile', () => {
      const result = validateReturnTo('/profile', fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe('/profile');
    });

    it('trusts https://events.tampa.dev/home', () => {
      const result = validateReturnTo('https://events.tampa.dev/home', fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe('https://events.tampa.dev/home');
    });

    it('trusts https://api.tampa.dev/callback', () => {
      const result = validateReturnTo('https://api.tampa.dev/callback', fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe('https://api.tampa.dev/callback');
    });
  });

  describe('untrusted redirects', () => {
    it('marks https://evil.com as untrusted', () => {
      const result = validateReturnTo('https://evil.com', fallback);
      expect(result.trusted).toBe(false);
      expect(result.url).toBe('https://evil.com');
    });

    it('marks //evil.com (protocol-relative) as untrusted', () => {
      const result = validateReturnTo('//evil.com', fallback);
      expect(result.trusted).toBe(false);
    });
  });

  describe('empty/null fallback behavior', () => {
    it('returns fallback as trusted when returnTo is null', () => {
      const result = validateReturnTo(null, fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe(fallback);
    });

    it('returns fallback as trusted when returnTo is undefined', () => {
      const result = validateReturnTo(undefined, fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe(fallback);
    });

    it('returns fallback as trusted when returnTo is empty string', () => {
      const result = validateReturnTo('', fallback);
      expect(result.trusted).toBe(true);
      expect(result.url).toBe(fallback);
    });
  });
});

// ============== Scope Hierarchy ==============

import { hasScope, expandScopes, ALL_SCOPES } from '../../../src/lib/scopes';

describe('Scope Hierarchy', () => {
  it('manage:groups implies read:groups', () => {
    expect(hasScope(['manage:groups'], 'read:groups')).toBe(true);
  });

  it('manage:events implies read:events', () => {
    expect(hasScope(['manage:events'], 'read:events')).toBe(true);
  });

  it('admin implies all scopes', () => {
    for (const scope of ALL_SCOPES) {
      expect(hasScope(['admin'], scope)).toBe(true);
    }
  });

  it('read:groups does NOT imply manage:groups', () => {
    expect(hasScope(['read:groups'], 'manage:groups')).toBe(false);
  });

  it('expandScopes includes child scopes', () => {
    const expanded = expandScopes(['manage:groups']);
    expect(expanded).toContain('manage:groups');
    expect(expanded).toContain('read:groups');
  });

  it('expandScopes for admin includes all scopes', () => {
    const expanded = expandScopes(['admin']);
    expect(expanded).toContain('admin');
    expect(expanded).toContain('read:events');
    expect(expanded).toContain('read:groups');
    expect(expanded).toContain('manage:groups');
    expect(expanded).toContain('manage:events');
    expect(expanded).toContain('user');
    expect(expanded).toContain('read:user');
  });
});

// ============== Rate Limiting ==============

import { Hono } from 'hono';
import { rateLimit } from '../../../src/middleware/rate-limit';
import type { Env } from '../../../types/worker';

describe('Rate Limiting', () => {
  it('returns 429 after max requests exceeded', async () => {
    // Build a small Hono app with the rate limiter middleware
    const app = new Hono<{ Bindings: Env }>();

    const kvStore = new Map<string, string>();
    const mockKv = {
      get: async (key: string) => kvStore.get(key) ?? null,
      put: async (key: string, value: string, _opts?: unknown) => {
        kvStore.set(key, value);
      },
    };

    app.use(
      '/limited',
      rateLimit({ prefix: 'test', maxRequests: 3, windowSeconds: 60 }),
    );
    app.get('/limited', (c) => c.json({ ok: true }));

    const makeReq = () => {
      const req = new Request('http://localhost/limited', {
        headers: { 'CF-Connecting-IP': '1.2.3.4' },
      });
      const env = { kv: mockKv } as unknown as Env;
      const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
      return app.fetch(req, env, ctx as ExecutionContext);
    };

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await makeReq();
      expect(res.status).toBe(200);
    }

    // 4th request should be rate limited
    const res = await makeReq();
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Too many requests');
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('passes through when KV is unavailable', async () => {
    const app = new Hono<{ Bindings: Env }>();

    app.use(
      '/limited',
      rateLimit({ prefix: 'test', maxRequests: 1, windowSeconds: 60 }),
    );
    app.get('/limited', (c) => c.json({ ok: true }));

    const makeReq = () => {
      const req = new Request('http://localhost/limited');
      // env.kv is undefined/null — KV unavailable
      const env = { kv: undefined } as unknown as Env;
      const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };
      return app.fetch(req, env, ctx as ExecutionContext);
    };

    // Even though maxRequests is 1, all requests should pass through
    // because KV is unavailable
    const res1 = await makeReq();
    expect(res1.status).toBe(200);

    const res2 = await makeReq();
    expect(res2.status).toBe(200);

    const res3 = await makeReq();
    expect(res3.status).toBe(200);
  });
});

// ============== Crypto (AES-256-GCM) ==============

import { encrypt, decrypt, decryptOrPassthrough } from '../../../src/lib/crypto';

describe('Crypto (AES-256-GCM)', () => {
  // Generate a deterministic test key: 32 bytes as base64
  // Using a known 32-byte value for reproducibility
  const TEST_KEY = btoa(
    String.fromCharCode(
      ...Array.from({ length: 32 }, (_, i) => (i * 7 + 13) % 256),
    ),
  );

  it('encrypt then decrypt returns original plaintext', async () => {
    const plaintext = 'super-secret-oauth-token-12345';
    const encrypted = await encrypt(plaintext, TEST_KEY);

    // Encrypted value should be in "iv:ciphertext" format
    expect(encrypted).toContain(':');
    expect(encrypted).not.toBe(plaintext);

    const decrypted = await decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt produces different ciphertexts for same plaintext (random IV)', async () => {
    const plaintext = 'same-input-different-output';
    const encrypted1 = await encrypt(plaintext, TEST_KEY);
    const encrypted2 = await encrypt(plaintext, TEST_KEY);

    // Each encryption should produce a different ciphertext due to random IV
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to the same plaintext
    expect(await decrypt(encrypted1, TEST_KEY)).toBe(plaintext);
    expect(await decrypt(encrypted2, TEST_KEY)).toBe(plaintext);
  });

  it('decryptOrPassthrough on plaintext returns plaintext unchanged', async () => {
    const plaintext = 'ghp_plainOAuthTokenFromGitHub';
    const result = await decryptOrPassthrough(plaintext, TEST_KEY);
    expect(result).toBe(plaintext);
  });

  it('decryptOrPassthrough on encrypted value decrypts correctly', async () => {
    const plaintext = 'secret-webhook-signing-key';
    const encrypted = await encrypt(plaintext, TEST_KEY);

    const result = await decryptOrPassthrough(encrypted, TEST_KEY);
    expect(result).toBe(plaintext);
  });

  it('decryptOrPassthrough on null returns null', async () => {
    const result = await decryptOrPassthrough(null, TEST_KEY);
    expect(result).toBeNull();
  });
});

// ============== Crypto Negative Tests ==============

describe('Crypto Negative Tests', () => {
  // Valid 32-byte test key
  const TEST_KEY = btoa(
    String.fromCharCode(
      ...Array.from({ length: 32 }, (_, i) => (i * 7 + 13) % 256),
    ),
  );

  // A different valid 32-byte key (different seed)
  const WRONG_KEY = btoa(
    String.fromCharCode(
      ...Array.from({ length: 32 }, (_, i) => (i * 11 + 37) % 256),
    ),
  );

  it('decrypt with wrong key should throw', async () => {
    const plaintext = 'secret-data-for-wrong-key-test';
    const encrypted = await encrypt(plaintext, TEST_KEY);

    // Decrypting with a different key should fail (AES-GCM auth tag mismatch)
    await expect(decrypt(encrypted, WRONG_KEY)).rejects.toThrow();
  });

  it('tampered ciphertext should throw', async () => {
    const plaintext = 'secret-data-for-tamper-test';
    const encrypted = await encrypt(plaintext, TEST_KEY);

    // Split into iv and ciphertext parts
    const colonIdx = encrypted.indexOf(':');
    const ivPart = encrypted.slice(0, colonIdx);
    const cipherPart = encrypted.slice(colonIdx + 1);

    // Tamper with the ciphertext by modifying a character
    // Find a base64 character to flip (change 'A' to 'B' or first char)
    const tamperedCipher = cipherPart.length > 2
      ? cipherPart[0] === 'A'
        ? 'B' + cipherPart.slice(1)
        : 'A' + cipherPart.slice(1)
      : cipherPart;

    const tampered = `${ivPart}:${tamperedCipher}`;

    // Tampered ciphertext should fail GCM authentication
    await expect(decrypt(tampered, TEST_KEY)).rejects.toThrow();
  });

  it('invalid key length (16 bytes instead of 32) should throw', async () => {
    // Create a 16-byte key (too short for AES-256)
    const shortKey = btoa(
      String.fromCharCode(
        ...Array.from({ length: 16 }, (_, i) => (i * 7 + 13) % 256),
      ),
    );

    await expect(encrypt('test-data', shortKey)).rejects.toThrow(
      'ENCRYPTION_KEY must be exactly 32 bytes',
    );
  });
});

// ============== URL Validation Additional Tests ==============

describe('URL Validation Additional Tests', () => {
  it('blocks 0.0.0.0', () => {
    const result = validateWebhookUrl('http://0.0.0.0/hook', { allowHttp: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('blocks IPv4-mapped IPv6 like ::ffff:127.0.0.1', () => {
    const result = validateWebhookUrl('http://[::ffff:127.0.0.1]/hook', { allowHttp: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('IPv6');
  });

  it('blocks URLs with userinfo like https://user@169.254.169.254', () => {
    const result = validateWebhookUrl('https://user@169.254.169.254');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('credentials');
  });

  it('accepts valid HTTPS URL with port https://example.com:8443/hook', () => {
    const result = validateWebhookUrl('https://example.com:8443/hook');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('blocks boundary IP 172.31.255.255 (end of 172.16-31 private range)', () => {
    const result = validateWebhookUrl('http://172.31.255.255/hook', { allowHttp: true });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('private');
  });
});

// ============== Redirect Validation Additional Tests ==============

describe('Redirect Validation Additional Tests', () => {
  const fallback = '/';

  it('javascript:alert(1) should return fallback (trusted), not the dangerous URI', () => {
    const result = validateReturnTo('javascript:alert(1)', fallback);
    expect(result.trusted).toBe(true);
    expect(result.url).toBe(fallback);
  });

  it('data:text/html,<script>alert(1)</script> should return fallback', () => {
    const result = validateReturnTo('data:text/html,<script>alert(1)</script>', fallback);
    expect(result.trusted).toBe(true);
    expect(result.url).toBe(fallback);
  });

  it('vbscript:msgbox should return fallback', () => {
    const result = validateReturnTo('vbscript:msgbox', fallback);
    expect(result.trusted).toBe(true);
    expect(result.url).toBe(fallback);
  });

  it('JAVASCRIPT:alert(1) (uppercase) should also return fallback', () => {
    const result = validateReturnTo('JAVASCRIPT:alert(1)', fallback);
    expect(result.trusted).toBe(true);
    expect(result.url).toBe(fallback);
  });

  it('subdomain spoofing: https://evil-tampa.dev should be untrusted', () => {
    const result = validateReturnTo('https://evil-tampa.dev', fallback);
    expect(result.trusted).toBe(false);
    expect(result.url).toBe('https://evil-tampa.dev');
  });
});

// ============== Legacy Scope Aliasing ==============

describe('Legacy Scope Aliasing', () => {
  it('profile scope should grant access to read:user (via alias to user)', () => {
    // 'profile' aliases to 'user', and 'user' implies 'read:user'
    expect(hasScope(['profile'], 'read:user')).toBe(true);
  });

  it('events:read should grant access to read:events', () => {
    expect(hasScope(['events:read'], 'read:events')).toBe(true);
  });

  it('groups:read should grant access to read:groups', () => {
    expect(hasScope(['groups:read'], 'read:groups')).toBe(true);
  });

  it('favorites:read should grant access to read:favorites', () => {
    expect(hasScope(['favorites:read'], 'read:favorites')).toBe(true);
  });

  it('favorites:write should grant access to write:favorites', () => {
    expect(hasScope(['favorites:write'], 'write:favorites')).toBe(true);
  });
});

// ============== Profile Visibility ==============

describe('Profile Visibility', () => {
  it('private users return 404 from GET /users/:username', async () => {
    const { env } = createTestEnv();

    // Create a user with private profile visibility
    const privateUser = await createUser({
      profileVisibility: 'private',
      username: 'secretuser',
    });

    const res = await appRequest(`/users/${privateUser.username}`, { env });
    expect(res.status).toBe(404);

    const body = await res.json() as { error: string };
    expect(body.error).toBe('User not found');
  });

  it('public users return 200 from GET /users/:username', async () => {
    const { env } = createTestEnv();

    // Create a user with public profile visibility
    const publicUser = await createUser({
      profileVisibility: 'public',
      username: 'publicuser',
    });

    const res = await appRequest(`/users/${publicUser.username}`, { env });
    expect(res.status).toBe(200);

    const body = await res.json() as { data: { username: string } };
    expect(body.data.username).toBe(publicUser.username);
  });
});
