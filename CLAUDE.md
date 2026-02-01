# CLAUDE.md -- AI Assistant Guidance for events.api.tampa.dev

This document provides essential context and rules for AI assistants working on this codebase. Read it before making changes.

Note to Agents: When working on tasks, attempt to parallelize work as much as possible. Design workstreams intentionally, with dependency ordering set up to establish clarity with precision, maximize throughput, and minimize contention. Working efficiently in this sense is what affords us the appropriate bandwidth to be thorough. Apply that thoroughness and focus to security, quality, reliability, and continued investments in achieving holistic excellence.


When running TypeScript type checks, do not use npm tsc. Instead, do a dry run build/deployment with wrangler. If you try to use npm tsc, it will take a long time before dying due to a MAX_HEAP error.

Integration test runs can cause Miniflare to die when all tests are run in a single process or with high parallelization. Test in smaller batches when you can, or target appropriately. Always make sure the full test suite has been invoked (all unit, integration, etc) before reporting success. Success requires the project to build successfully with a passing test suite.

---

## 1. Project Overview

### Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** [Hono](https://hono.dev/) (with `@hono/zod-openapi` for typed routes)
- **Database:** Cloudflare D1 (SQLite) via [Drizzle ORM](https://orm.drizzle.team/)
- **Frontend:** React Router app in `/web/` (separate build, served by a sibling Cloudflare Pages worker)
- **Storage:** Cloudflare R2 for user uploads (avatars, media)
- **KV:** Cloudflare KV for rate limiting and OAuth state
- **Queues:** Cloudflare Queues for domain event bus (achievements, webhooks, notifications)
- **Durable Objects:** `UserNotificationDO` and `BroadcastDO` for real-time WebSocket notifications
- **OAuth:** `@cloudflare/workers-oauth-provider` wrapping the Hono app to provide "Sign in with Tampa.dev"
- **Validation:** Zod for all input schemas
- **Testing:** Vitest (integration) + Mocha (unit), Miniflare for local D1/KV/R2 bindings

### Architecture

The application entry point is `src/index.ts`. It creates a Hono app, mounts all route modules (including the `/v1/` authenticated API), then wraps everything in an `OAuthProvider`. The OAuthProvider only handles OAuth protocol endpoints (`/oauth/token`, `/oauth/register`); all other requests -- including `/v1/` -- go directly to the Hono app. The worker exports three handlers:

- `fetch` -- HTTP requests (routed through OAuthProvider, then Hono)
- `scheduled` -- Cron triggers for event aggregation (`src/scheduled/handler.ts`)
- `queue` -- Cloudflare Queue consumer for domain events (`src/queue/handler.ts`)

### Directory Structure

```
src/
  index.ts              # Worker entry point, route mounting, OAuthProvider setup
  app.ts                # Hono app factory, security headers, CORS
  db/
    schema.ts           # All Drizzle table definitions
    index.ts            # createDatabase() helper
  routes/               # Route modules (one per domain area)
    v1.ts               # /v1/ authenticated API (third-party apps, PATs, OAuth)
    mcp.ts              # /mcp endpoint (MCP Streamable HTTP transport)
  mcp/                  # Model Context Protocol server
    server.ts           # JSON-RPC 2.0 dispatch, capability negotiation
    types.ts            # MCP protocol types (JSON-RPC, tools, resources, prompts)
    registry.ts         # Tool/resource/prompt registry with scope filtering
    resources.ts        # MCP resource definitions
    prompts.ts          # MCP prompt templates
    tools/              # Tool definitions (one file per domain)
  middleware/            # Hono middleware (auth, rate-limit)
  lib/                  # Shared utilities (auth, crypto, scopes, validation, responses)
  services/             # Business logic services (sync, RSVP, favorites, etc.)
  controllers/          # Controller classes (schemas)
  providers/            # External platform providers (Meetup, Eventbrite, Luma)
  queue/                # Queue event handlers (webhooks, achievements, notifications)
  scheduled/            # Cron job handlers
  durable-objects/      # Durable Object classes (WebSocket notifications)
  components/           # JSX components for server-rendered pages (admin, widgets)
  config/               # Configuration constants
web/                    # React Router frontend application
test/
  integration/          # Vitest integration tests with Miniflare
  routes/               # Mocha unit tests for route logic
  lib/                  # Unit tests for library modules
drizzle/
  migrations/           # SQL migration files applied by D1
wrangler.toml           # Cloudflare Workers configuration (bindings, routes, crons)
```

---

## 2. Authentication

### Tri-Auth System

This application supports three authentication methods, resolved in priority order:

1. **Personal Access Tokens (PATs):** `Authorization: Bearer td_pat_...` -- SHA-256 hashed and looked up in the `api_tokens` table. Returns scoped access.
2. **OAuth Access Tokens:** `Authorization: Bearer ...` (non-PAT) -- Decrypted via `OAUTH_PROVIDER.unwrapToken()`. Returns scoped access.
3. **Session Cookies:** Cookie-based sessions for the web UI. Returns `scopes: null` (unrestricted by scopes, governed by role checks instead).

### The Single Entry Point

**`getCurrentUser()` in `src/lib/auth.ts` is the ONLY function you should use to resolve the authenticated user in route handlers.** It returns an `AuthResult`:

```typescript
interface AuthResult {
  user: User;          // Full user record from the database
  scopes: string[] | null;  // null = session (unrestricted), [] = token with specific scopes
}
```

**Rules:**
- Never create local `getCurrentUser` or auth-resolution functions in route files.
- Never read the session cookie directly in route handlers -- always go through `getCurrentUser()`.
- The middleware in `src/middleware/auth.ts` (`requireAuth`, `requireAdmin`) is used for the web admin UI routes and returns a simpler `AuthUser` type. API routes should use `getCurrentUser()` from `src/lib/auth.ts` for full tri-auth support.

### Session vs Token Semantics

- `scopes === null` means the user authenticated via session cookie (first-party). Scope checks are bypassed; authorization is done via role checks (`isPlatformAdmin`, `requireGroupRole`).
- `scopes === string[]` means the user authenticated via a token (PAT or OAuth). The `requireScope()` function must be called to verify the token has the necessary permissions.

---

## 3. Security Best Practices

### Data Handling

- **PII awareness:** The `users` table contains email, name, location, and social links. The `profileVisibility` field (`'public'` or `'private'`) controls what is exposed. Always check `profileVisibility` before returning user data in public-facing endpoints.
- **Default to minimal data:** When building new endpoints, return only the fields the client needs. Never return entire user records to unauthenticated callers.

### Error Sanitization

- Never expose internal error messages, stack traces, or database errors to the client. Return generic error messages like `{ error: 'Internal server error' }` for 500s.
- Validation errors from Zod can be returned (they describe the input shape, not internal state).

### Encryption at Rest

All sensitive tokens and secrets stored in the database must be encrypted using `src/lib/crypto.ts`:

```typescript
import { encrypt, decrypt, decryptOrPassthrough } from '../lib/crypto.js';

// Encrypting before storage
const encryptedToken = await encrypt(plainToken, env.ENCRYPTION_KEY);

// Decrypting (handles both encrypted and legacy plaintext)
const plainToken = await decryptOrPassthrough(storedValue, env.ENCRYPTION_KEY);
```

- Uses AES-256-GCM with random 12-byte IVs.
- Output format: `base64(iv):base64(ciphertext+authTag)`.
- `decryptOrPassthrough()` handles migration from unencrypted legacy values.
- **Never store OAuth access tokens, refresh tokens, webhook secrets, or PAT values in plaintext.**

### Deploying Encryption (ENCRYPTION_KEY)

The `ENCRYPTION_KEY` environment variable enables at-rest encryption for OAuth tokens and webhook secrets. It is optional -- without it, the system operates in legacy plaintext mode.

**Generate a key:**

```bash
npm run generate:encryption-key
```

**Deploy the key per environment:**

| Environment | Method |
|-------------|--------|
| Local dev | Add `ENCRYPTION_KEY=<key>` to `.dev.vars` |
| Staging | `npx wrangler secret put ENCRYPTION_KEY --env staging` |
| Production | `npx wrangler secret put ENCRYPTION_KEY --env production` |

**Rolling out encryption:**

1. Generate separate keys for staging and production (they use different databases).
2. Deploy the key to the target environment using the methods above.
3. Deploy the updated worker code. From this point, all new token writes are encrypted.
4. Existing plaintext records are read transparently via `decryptOrPassthrough()`. They will be encrypted on next OAuth re-authentication or webhook secret rotation.
5. There is no bulk migration step required -- encryption is progressive.

**Key management rules:**

- All workers sharing a database must use the same key. Staging and production use different databases, so they use different keys.
- Back up the key securely (e.g., in a password manager or secrets vault). If the key is lost, encrypted data cannot be recovered.
- To rotate the key: deploy the new key, then trigger re-authentication for affected users or rotate webhook secrets. Old records encrypted with the previous key will fail to decrypt and fall through to plaintext passthrough.

### Token and Secret Hygiene

- Never log tokens, secrets, session IDs, or encryption keys.
- PATs are stored as SHA-256 hashes in `api_tokens.tokenHash` -- the raw token is never persisted.
- When returning token-related data to clients, return only the prefix (`td_pat_abc1...`), never the full value.

### SSRF Prevention

Webhook URLs must be validated using `validateWebhookUrl()` from `src/lib/url-validation.ts`:

```typescript
import { validateWebhookUrl } from '../lib/url-validation.js';

const result = validateWebhookUrl(userProvidedUrl);
if (!result.valid) {
  return c.json({ error: result.error }, 400);
}
```

This blocks:
- Private/internal IP addresses (10.x, 172.16-31.x, 192.168.x, 127.x)
- Localhost and loopback (including IPv6 `::1`)
- Cloud metadata endpoints (169.254.169.254)
- Common internal service ports (databases, message queues, etc.)
- IPv4-mapped IPv6 addresses embedding private IPs

Additionally, `wrangler.toml` has the `global_fetch_strictly_public` compatibility flag for runtime SSRF protection.

### Redirect Validation

Use `validateReturnTo()` from `src/lib/redirect-validation.ts` for any redirect/return-to URL from user input:

```typescript
import { validateReturnTo, renderRedirectInterstitial } from '../lib/redirect-validation.js';

const result = validateReturnTo(returnToParam, '/');
if (!result.trusted) {
  return c.html(renderRedirectInterstitial(result.url));
}
return c.redirect(result.url);
```

- Relative paths starting with `/` (but not `//`) are trusted.
- `*.tampa.dev` and `localhost` are trusted.
- All other destinations show an interstitial consent page.

---

## 4. Auth Patterns for Routes

### Admin Routes

Use `requireAdmin` middleware from `src/middleware/auth.ts` for admin-only routes:

```typescript
import { requireAdmin } from '../middleware/auth.js';

app.use('*', requireAdmin);  // All routes in this module require admin
```

This returns 401 if unauthenticated and 403 if the user is not an admin or superadmin.

### Scope Checking for API Tokens

Use `requireScope()` from `src/lib/auth.ts` in any endpoint accessible via tokens:

```typescript
import { getCurrentUser, requireScope } from '../lib/auth.js';

app.get('/resource', async (c) => {
  const auth = await getCurrentUser(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);

  const scopeError = requireScope(auth, 'read:events', c);
  if (scopeError) return scopeError;

  // Proceed with the request...
});
```

Session-authenticated users (scopes === null) bypass scope checks by design -- scopes only constrain API tokens.

### Group Role Authorization

Use `requireGroupRole()` from `src/lib/auth.ts` to check group membership roles:

```typescript
import { requireGroupRole } from '../lib/auth.js';

const { hasRole } = await requireGroupRole(db, user.id, groupId, GroupMemberRole.MANAGER, user);
if (!hasRole) return c.json({ error: 'Forbidden' }, 403);
```

Platform admins (`user.role === 'admin' | 'superadmin'`) bypass group role checks automatically.

### Rate Limiting

Use `rateLimit()` middleware from `src/middleware/rate-limit.ts` on endpoints susceptible to abuse:

```typescript
import { rateLimit } from '../middleware/rate-limit.js';

app.post('/resource',
  rateLimit({ prefix: 'create-resource', maxRequests: 10, windowSeconds: 60 }),
  async (c) => { /* ... */ }
);
```

Rate limits use KV-based sliding windows keyed by `CF-Connecting-IP`.

### Adding New Scopes

To add a new scope:

1. Add the scope key and description to the `SCOPES` object in `src/lib/scopes.ts`.
2. If the new scope is implied by a parent scope, add the relationship to `SCOPE_HIERARCHY`.
3. Add the scope string to the `SCOPES_SUPPORTED` array in `src/index.ts` (for the OAuth provider).
4. Use `requireScope(auth, 'your:scope', c)` in the relevant route handlers.
5. Update the OAuth consent screen in `web/app/routes/oauth.authorize.tsx`:
   - Add the scope to `SCOPE_TO_GROUP` (map it to an existing group or create a new one).
   - If creating a new group, add a case in `getGroupDisplay()` and add the group key to `GROUP_DISPLAY_ORDER`.
   - If the scope changes the description for an existing group (e.g., adding write access), update the logic in the relevant `getGroupDisplay()` case.
6. Update `SCOPE_LABELS` in `web/app/routes/profile.tsx` (used in the Authorized Apps list on the user's profile).

---

## 5. Database

### Schema Location

All table definitions live in `src/db/schema.ts`. Use Drizzle's `sqliteTable` to define tables with proper types, defaults, and indexes.

### Parameterized Queries

Drizzle ORM handles SQL parameterization automatically. **Never construct raw SQL strings with user input.** If you must use `sql` template literals, always use Drizzle's parameter binding:

```typescript
import { sql } from 'drizzle-orm';

// GOOD: parameterized
db.select().from(users).where(sql`${users.email} = ${userEmail}`);

// BAD: string interpolation (SQL injection risk)
db.select().from(users).where(sql`email = '${userEmail}'`);
```

### Atomic Operations

For read-then-write patterns (e.g., checking if a record exists before inserting), use atomic SQL patterns:

- `INSERT ... ON CONFLICT DO NOTHING` for idempotent inserts
- `INSERT ... ON CONFLICT DO UPDATE` (upsert) for create-or-update
- Atomic `UPDATE ... SET count = count + 1` for incrementing counters

Example from the codebase (badge claim links):
```typescript
await db.update(badgeClaimLinks)
  .set({ currentUses: sql`${badgeClaimLinks.currentUses} + 1` })
  .where(eq(badgeClaimLinks.id, claimLink.id));
```

### Indexes

Always add indexes for columns used in `WHERE`, `JOIN`, or `ORDER BY` clauses. Define them in the table's third argument:

```typescript
export const myTable = sqliteTable('my_table', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').notNull(),
}, (table) => [
  index('my_table_user_idx').on(table.userId),
  index('my_table_status_idx').on(table.status),
]);
```

### Migration Workflow

1. Modify the schema in `src/db/schema.ts`.
2. Generate a migration: `npm run db:generate`
3. Apply locally: `npm run db:migrate:local`
4. Test locally: `npm run test:integration`
5. Apply to staging: `npm run db:migrate:staging`
6. Apply to production: `npm run db:migrate:remote`

Migration files live in `drizzle/migrations/` and are tracked by `drizzle/migrations/meta/_journal.json`.

---

## 6. Input Validation

### Zod Schemas for All Input

Every endpoint that accepts user input must validate it with a Zod schema. Use `@hono/zod-validator` for body validation or define schemas inline:

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const createResourceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional(),
});

app.post('/', zValidator('json', createResourceSchema), async (c) => {
  const data = c.req.valid('json');
  // data is fully typed and validated
});
```

### String Length Limits

Always enforce maximum lengths on string fields. Key limits used in this codebase:

- Usernames: max 30 chars, alphanumeric + hyphens + underscores
- Bio: max 500 chars
- Group names: max 200 chars
- URL slugs: max 100 chars, lowercase alphanumeric + hyphens
- Descriptions: max 2000 chars (varies by context)

### URL Validation

- Webhook URLs: validated with `validateWebhookUrl()` (SSRF prevention)
- Return-to URLs: validated with `validateReturnTo()` (open redirect prevention)
- General URLs in user profiles: validated with `z.string().url()`

---

## 7. Testing Guidelines

### Test Types

- **Unit tests** (`test/routes/`, `test/lib/`): Mocha + Chai. Run with `npm test`.
- **Integration tests** (`test/integration/`): Vitest + Miniflare. Run with `npm run test:integration`.

Integration tests are the primary test suite. They spin up a real D1 database via Miniflare and test endpoints end-to-end.

### Test Helpers

All test helpers are in `test/integration/helpers/` and re-exported from `test/integration/helpers/index.ts`:

- **`createTestEnv(overrides?)`** -- Creates a full `Env` object with real D1/KV/R2 from Miniflare plus mocked Queue, DurableObjects, and OAuth bindings. Returns `{ env, mockQueue }`.
- **`createUser(overrides?)`** -- Inserts a test user with sensible defaults. Returns the full `User` record.
- **`createAdminUser(overrides?)`** -- Creates a user with `role: 'admin'`.
- **`createSession(userId)`** -- Creates a session and returns `{ session, cookieHeader }` ready to use in requests.
- **`createGroup(overrides?)`** -- Inserts a test group.
- **`createEvent(groupId, overrides?)`** -- Inserts a test event.
- **`createBadge(overrides?)`** -- Inserts a test badge.
- **`addGroupMember(groupId, userId, role?)`** -- Adds a user as a group member.
- **`grantEntitlement(userId, entitlement, source?)`** -- Grants a user entitlement.
- **`appRequest(path, options)`** -- Makes an HTTP request to the Hono app with the test environment. Handles JSON serialization.

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { createTestEnv, createUser, createSession, appRequest } from '../helpers';

describe('Resource API', () => {
  it('returns 401 without session cookie', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/resource', { env });
    expect(res.status).toBe(401);
  });

  it('returns data for authenticated user', async () => {
    const { env } = createTestEnv();
    const user = await createUser();
    const { cookieHeader } = await createSession(user.id);

    const res = await appRequest('/resource', {
      env,
      headers: { Cookie: cookieHeader },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Assert on response shape...
  });
});
```

### Coverage Expectations

Every endpoint should have tests covering:

- **Happy path:** Authenticated request returns expected data (200/201).
- **401 Unauthorized:** Request without credentials is rejected.
- **400 Bad Request:** Invalid input is rejected with a clear error.
- **403 Forbidden:** Authenticated user without sufficient permissions is rejected.
- **404 Not Found:** Request for non-existent resource returns 404 (where applicable).

### Security Test Requirements

- Test that private user data is not returned for private profiles.
- Test that admin-only endpoints reject non-admin users.
- Test that group management endpoints reject users without the required group role.
- Test that domain events are emitted via the mock queue for observable side effects.

### Running Tests

```bash
npm test                       # Unit tests (Mocha)
npm run test:integration       # Integration tests (Vitest + Miniflare)
npm run test:integration:watch # Integration tests in watch mode
```

---

## 8. Security Review Guidance

### When to Review

Perform a security-focused review when changes involve:

- New API endpoints (especially ones that accept user input or return user data)
- Authentication or authorization logic changes
- Changes to data exposure (new fields returned in responses)
- External input processing (webhook URLs, redirect URLs, uploaded files)
- Database schema changes affecting PII or access control
- New dependencies or third-party integrations

### What to Check

**Injection:**
- All database queries use Drizzle ORM (parameterized by default). Verify no raw SQL string concatenation.
- HTML output is escaped (server-rendered pages use `escapeHtml()`).

**Broken Authentication:**
- Auth resolution goes through `getCurrentUser()` only.
- Session tokens are validated against expiration.
- PAT tokens are hashed before lookup (timing-safe by nature of hash comparison).

**Sensitive Data Exposure:**
- Check `profileVisibility` before returning user data in public endpoints.
- Verify that tokens, secrets, and encryption keys are never included in responses or logs.
- Webhook secrets are encrypted at rest via `src/lib/crypto.ts`.

**SSRF:**
- Any endpoint that makes outbound HTTP requests to user-provided URLs must use `validateWebhookUrl()`.
- The `global_fetch_strictly_public` compatibility flag provides runtime SSRF protection as a second layer.

**Broken Access Control:**
- Admin endpoints use `requireAdmin` middleware.
- Group management endpoints use `requireGroupRole()`.
- API token endpoints use `requireScope()`.
- Verify that new endpoints cannot be used to escalate privileges.

**Open Redirects:**
- All redirect URLs from user input go through `validateReturnTo()`.
- Untrusted destinations show an interstitial page.

**Mass Assignment:**
- Zod schemas whitelist which fields can be set by the client. Verify that role, ID, and other protected fields are not accepted from input.

---

## 9. Code Quality

### Feature Surface Checklist

Domain features in this codebase are exposed through multiple layers. When adding or modifying a field, resource, or behavior, audit **every surface** that touches the affected domain. Forgetting one creates inconsistencies that are harder to catch later.

| Surface | Location | What to update |
|---------|----------|----------------|
| **Database schema** | `src/db/schema.ts` | Column definition, defaults, indexes |
| **Migration** | `drizzle/migrations/` | Incremental ALTER TABLE or new table |
| **Queue handlers** | `src/queue/` | Filtering, event processing logic |
| **Admin API** | `src/routes/admin-api.ts` | Zod create/update schemas, handler insert/update logic |
| **Admin UI** | `web/app/routes/admin.*.tsx` | Form fields, card display, create/update actions |
| **MCP tools** | `src/mcp/tools/*.ts` | Tool input schemas, handler logic, user-facing filtering |
| **`/v1/` API** | `src/routes/v1.ts`, `v1-admin.ts`, `v1-manage.ts` | Endpoint schemas, response shapes |
| **OpenAPI spec** | `src/routes/v1-schemas.ts` | Request/response Zod schemas |
| **OAuth consent screen** | `web/app/routes/oauth.authorize.tsx` | `SCOPE_TO_GROUP` mapping, `getGroupDisplay()` descriptions |
| **Profile scope labels** | `web/app/routes/profile.tsx` | `SCOPE_LABELS` record for Authorized Apps display |
| **Integration tests** | `test/integration/` | Coverage for each affected surface |

**How to use this:** When planning a schema or feature change, enumerate which surfaces are affected before writing code. Include all surfaces in the task plan. A field added to the schema but missing from the MCP tools or `/v1/` API is an incomplete feature.

### TypeScript

- TypeScript strict mode is enabled. Respect all strict checks.
- **No `any` in production code.** Use proper types, `unknown`, or generics. The only acceptable use of `any` is in Zod `.any()` for OpenAPI schema generation where the shape is truly dynamic.

### Async Patterns

- Use `Promise.allSettled()` for independent concurrent operations where one failure should not block others (e.g., sending notifications to multiple recipients).
- Use `Promise.all()` only when all operations must succeed together.
- Use `ctx.waitUntil()` for fire-and-forget background tasks (e.g., updating `lastUsedAt` on tokens).

### Route Handler Patterns

This codebase uses two route registration styles:

1. **Function-style (`registerXRoutes(app)`):** Used for OpenAPI-documented routes with `@hono/zod-openapi`. The function receives the app and registers routes with full OpenAPI metadata.

2. **Instance-style (exported Hono instance):** Used for most authenticated routes. Creates a new `Hono` instance, defines routes, and exports it for mounting in `src/index.ts`.

```typescript
// Instance-style pattern (preferred for new authenticated routes)
export function createMyRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  app.get('/', async (c) => {
    const auth = await getCurrentUser(c);
    if (!auth) return c.json({ error: 'Unauthorized' }, 401);

    // Business logic...
    return c.json({ data });
  });

  return app;
}

export const myRoutes = createMyRoutes();
```

### Business Logic Extraction

- Keep route handlers thin. Extract complex business logic into service functions (`src/services/`) or library modules (`src/lib/`).
- Route handlers should: validate input, authenticate, call business logic, format response.

### Domain Events

Use `emitEvent()` and `emitEvents()` from `src/lib/event-bus.ts` to publish domain events to the Cloudflare Queue:

```typescript
import { emitEvent } from '../lib/event-bus.js';

emitEvent(c, {
  type: 'dev.tampa.user.favorite_added',
  payload: { userId: user.id, groupId: group.id },
  metadata: { userId: user.id, source: 'favorites' },
});
```

Queue handlers in `src/queue/` process these events for achievements, webhook delivery, and notifications.

---

## 10. Community Trust

This platform serves real members of the Tampa.dev community. Every decision should be made with that responsibility in mind.

- **Security is non-negotiable.** Never cut corners on authentication, authorization, or data protection.
- **Default to returning less data.** If you are unsure whether a field should be public, make it private. It is easy to expose more data later; it is impossible to unexpose leaked data.
- **Always consider: "What if this data leaked?"** If a response includes email addresses, locations, or social links, verify that the requesting user is authorized to see them and that the profile owner has opted in.
- **Rate limit sensitive endpoints.** Login, registration, token creation, and any endpoint that triggers external requests (webhooks, sync) should be rate-limited.
- **Validate everything from the outside.** User input, URL parameters, headers, webhook payloads -- treat all external data as untrusted.

---

## 11. API Design Standards

### Two API Surfaces

This application has two API surfaces:

1. **`/v1/` API** (`src/routes/v1.ts`): The official authenticated API for third-party apps, PATs, and OAuth tokens. Uses standardized response envelopes. All new authenticated endpoints go here.

2. **Session routes** (`src/routes/*.ts`): Internal routes used by the first-party web frontend. These routes also support token auth via `getCurrentUser()` but are primarily designed for browser-based sessions.

Both surfaces use `getCurrentUser()` for authentication. The `/v1/` routes use standardized response envelopes from `src/lib/responses.ts`.

### OAuthProvider Architecture

The `OAuthProvider` from `@cloudflare/workers-oauth-provider` wraps the entire worker. It handles only OAuth protocol endpoints (`/oauth/token`, `/oauth/register`). All other requests -- including `/v1/` -- go to the Hono app via `defaultHandler`. The `/v1/` routes authenticate via `getCurrentUser()`, which independently validates PATs (SHA-256 hash lookup) and OAuth tokens (via `env.OAUTH_PROVIDER.unwrapToken()`).

### Response Envelope Convention

All `/v1/` endpoints use standardized envelopes from `src/lib/responses.ts`:

```typescript
import { ok, created, list, success, apiError, scopeError, notFound, parsePagination } from '../lib/responses.js';

// Detail/mutation: { data: { ... } }
return ok(c, { id: '...', name: '...' });

// List with pagination: { data: [...], pagination: { total, limit, offset, hasMore } }
const { limit, offset } = parsePagination(c);
return list(c, items, { limit, offset, total: 42 });

// Action: { data: { success: true } }
return success(c);

// Error: { error: "message", code: "machine_code" }
return notFound(c, 'Group not found');
return scopeError(c, 'read:events');
```

### Error Code Catalog

Standard error codes (defined in `src/lib/responses.ts`):

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Authenticated but not authorized |
| `insufficient_scope` | 403 | Token lacks required scope |
| `not_found` | 404 | Resource does not exist |
| `conflict` | 409 | Duplicate or state conflict |
| `gone` | 410 | Resource expired or exhausted |
| `validation_error` | 400 | Invalid input |
| `bad_request` | 400 | Malformed request |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Server error (never expose details) |

### Adding New `/v1/` Endpoints

1. Add the route handler in `src/routes/v1.ts`.
2. Use `getCurrentUser()` + `requireScope()` for auth.
3. Use response helpers from `src/lib/responses.ts` for all responses.
4. Extract complex business logic into `src/services/` -- never duplicate logic between `/v1/` and session routes.
5. Add the endpoint to the OpenAPI spec (when using `@hono/zod-openapi`).
6. Write integration tests covering auth, scopes, happy path, and error cases.
7. Document the endpoint with request/response examples in the relevant MDX doc.

### Business Logic in Services

Route handlers should be thin. Complex logic lives in `src/services/`:

```typescript
// src/services/rsvp.ts -- shared between /v1/ and session routes
export async function createRsvp(db, userId, eventId) { /* ... */ }
export async function cancelRsvp(db, userId, eventId) { /* ... */ }

// src/routes/v1.ts -- thin handler
app.post('/events/:eventId/rsvp', async (c) => {
  const auth = await getCurrentUser(c);
  if (!auth) return unauthorized(c);
  const scopeErr = requireScope(auth, 'write:events', c);
  if (scopeErr) return scopeErr;
  const result = await createRsvp(db, auth.user.id, eventId);
  return created(c, result);
});
```

### OpenAPI Spec Maintenance

Every authenticated `/v1/` endpoint must appear in the OpenAPI spec at `/openapi.json`. When adding a new endpoint:

1. Define request/response Zod schemas in `src/routes/v1-schemas.ts`.
2. Use `createRoute()` + `app.openapi()` from `@hono/zod-openapi`.
3. Include `security: [{ BearerToken: [...requiredScopes] }]`.
4. Add descriptions and examples.
5. Group routes with OpenAPI tags (User, Events, Groups, Management, etc.).

---

## 12. MCP Server

### Overview

The platform exposes a first-party [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server at `POST /mcp`. This allows AI agents, personal assistants, and automation tools to interact with the Tampa.dev platform via a standardized JSON-RPC 2.0 interface.

The MCP implementation is custom (not using `@modelcontextprotocol/sdk`) to avoid Node.js dependencies incompatible with Cloudflare Workers. It supports **Streamable HTTP** transport (MCP spec version `2025-03-26`).

### Architecture

```
POST /mcp
  └── src/routes/mcp.ts (Hono route)
        └── src/mcp/server.ts (JSON-RPC dispatch)
              ├── initialize    → Capability negotiation
              ├── tools/list    → Scope-filtered tool catalog
              ├── tools/call    → Tool execution with Zod validation
              ├── resources/*   → Resource listing and reading
              ├── prompts/*     → Prompt template retrieval
              └── ping          → Health check
```

**Key components:**

| File | Purpose |
|------|---------|
| `src/mcp/types.ts` | Protocol types: JSON-RPC messages, tool/resource/prompt definitions, error codes |
| `src/mcp/registry.ts` | Central registry for tools, resources, prompts. `defineTool()` / `defineResource()` / `definePrompt()` registration functions. Scope-filtered discovery via `getAvailableTools(auth)` |
| `src/mcp/server.ts` | JSON-RPC 2.0 dispatcher. Handles batch requests (max 10), notifications, and all MCP protocol methods |
| `src/routes/mcp.ts` | Hono route handler. Authenticates via `getCurrentUser()`, validates Content-Type, dispatches to server |
| `src/mcp/tools/*.ts` | Tool definitions organized by domain (14 files) |
| `src/mcp/resources.ts` | Resource definitions with `tampadev://` URI scheme |
| `src/mcp/prompts.ts` | Prompt templates for common workflows |

### Authentication

MCP requests use the same tri-auth system as `/v1/`:

- Bearer tokens (OAuth or PAT) in `Authorization` header
- Session cookies for first-party web clients
- Unauthenticated requests receive 401

### Tool Definition Pattern

Tools are registered at import time using `defineTool()` from `src/mcp/registry.ts`. Each tool has a Zod input schema that is auto-converted to JSON Schema for MCP clients:

```typescript
import { z } from 'zod';
import { defineTool } from '../registry.js';

defineTool({
  name: 'events_list',
  description: 'List upcoming events in the Tampa Bay tech community',
  scope: 'read:events',
  inputSchema: z.object({
    group_slug: z.string().optional().describe('Filter by group slug'),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }),
  handler: async (args, context) => {
    // context.auth = AuthResult from getCurrentUser()
    // context.env = Env bindings
    // Call service layer directly -- no HTTP self-calls
    const db = createDatabase(context.env.DB);
    const events = await db.select().from(eventsTable)...;
    return { content: [{ type: 'text', text: JSON.stringify(events) }] };
  },
});
```

**Rules for tool handlers:**
- Call service-layer functions directly, not HTTP endpoints (avoid overhead, auth re-resolution, rate-limit self-hits)
- Scope enforcement happens in `server.ts` before the handler runs -- tools don't need to check scopes
- Group role checks (`requireGroupRole()`) must be done inside management tool handlers
- Return `{ content: [{ type: 'text', text: '...' }] }` for success
- Return `{ content: [{ type: 'text', text: '...' }], isError: true }` for domain errors

### Scope-Filtered Discovery

`tools/list` returns only tools the caller's token scopes allow. This enables agents to understand their capabilities:

- `scope: null` (public tools) -- visible to all authenticated users
- `scope: 'read:events'` -- visible only when token has `read:events` (or parent scope)
- Session users (`auth.scopes === null`) see all tools

### Adding New MCP Tools

1. Create or edit the appropriate file in `src/mcp/tools/`.
2. Use `defineTool()` with a Zod input schema and handler function.
3. Follow the naming convention: `{domain}_{action}` in snake_case (e.g., `events_list`, `manage_create_event`).
4. Set the `scope` field to the required scope (or `null` for public tools).
5. Import the tool file in `src/routes/mcp.ts` (side-effect import for registration).
6. Add integration tests in `test/integration/routes/mcp/`.
7. Document the tool in `web/app/content/docs/mcp-tools.mdx`.

### Adding New MCP Resources

Use `defineResource()` or `defineResourceTemplate()` in `src/mcp/resources.ts`:

```typescript
defineResource({
  uri: 'tampadev://scopes',
  name: 'OAuth Scopes',
  description: 'Available OAuth scopes and their descriptions',
  mimeType: 'application/json',
  scope: null, // public
  handler: async (context) => {
    return { contents: [{ uri: 'tampadev://scopes', text: JSON.stringify(SCOPES), mimeType: 'application/json' }] };
  },
});
```

### Adding New MCP Prompts

Use `definePrompt()` in `src/mcp/prompts.ts`:

```typescript
definePrompt({
  name: 'community_health_report',
  description: 'Generate a community health report for a group',
  arguments: [{ name: 'group_slug', description: 'Group slug', required: true }],
  handler: async (args, context) => {
    return {
      messages: [{ role: 'user', content: { type: 'text', text: '...' } }],
    };
  },
});
```

### MCP Test Helpers

MCP-specific test helpers are in `test/integration/helpers/mcp.ts`:

- `mcpRequest(method, params, options)` -- Send raw JSON-RPC to `/mcp`
- `mcpInitialize(options)` -- Send initialize and parse result
- `mcpToolCall(toolName, args, options)` -- Call a tool and parse result
- `mcpListTools(options)` -- List available tools
- `mcpListResources(options)` -- List available resources
- `mcpReadResource(uri, options)` -- Read a resource

Protocol integration tests are in `test/integration/routes/mcp/`.
