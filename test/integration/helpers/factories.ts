/**
 * Test Data Factories
 *
 * Drizzle-based factory functions that insert records and return them.
 * Each factory uses sensible defaults that can be overridden.
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../src/db/schema';
import type { Env } from '../../../types/worker';

export function getDb() {
  return drizzle(globalThis.__TEST_ENV__.DB, { schema });
}

let autoInc = 0;
function nextId(): string {
  autoInc += 1;
  return `test-${autoInc}-${Date.now()}`;
}

// ── Users ──────────────────────────────────────────────────────────

export async function createUser(overrides?: Partial<schema.NewUser>): Promise<schema.User> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewUser = {
    id,
    email: `user-${id}@test.local`,
    name: `Test User ${autoInc}`,
    username: `testuser${autoInc}`,
    role: 'user',
    profileVisibility: 'public',
    ...overrides,
  };
  await db.insert(schema.users).values(record);
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, record.id!),
  });
  return user!;
}

export async function createAdminUser(overrides?: Partial<schema.NewUser>): Promise<schema.User> {
  return createUser({
    role: 'admin',
    username: 'testadmin',
    ...overrides,
  });
}

// ── Sessions ───────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  overrides?: Partial<schema.NewSession>,
): Promise<{ session: schema.Session; cookieHeader: string }> {
  const db = getDb();
  const id = nextId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const record: schema.NewSession = {
    id,
    userId,
    expiresAt,
    ...overrides,
  };
  await db.insert(schema.sessions).values(record);

  const session = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, record.id!),
  });

  // Cookie name is 'session' when ENVIRONMENT !== 'staging'
  const cookieHeader = `session=${record.id}`;
  return { session: session!, cookieHeader };
}

// ── Groups ─────────────────────────────────────────────────────────

export async function createGroup(overrides?: Partial<schema.NewGroup>): Promise<schema.Group> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewGroup = {
    id,
    platform: 'meetup',
    platformId: `platform-${id}`,
    urlname: `test-group-${autoInc}`,
    name: `Test Group ${autoInc}`,
    link: `https://meetup.com/test-group-${autoInc}`,
    displayOnSite: true,
    isActive: true,
    ...overrides,
  };
  await db.insert(schema.groups).values(record);
  const group = await db.query.groups.findFirst({
    where: (g, { eq }) => eq(g.id, record.id!),
  });
  return group!;
}

// ── Events ─────────────────────────────────────────────────────────

export async function createEvent(
  groupId: string,
  overrides?: Partial<schema.NewEvent>,
): Promise<schema.Event> {
  const db = getDb();
  const id = nextId();
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const record: schema.NewEvent = {
    id,
    platform: 'meetup',
    platformId: `event-${id}`,
    groupId,
    title: `Test Event ${autoInc}`,
    eventUrl: `https://meetup.com/test-event-${autoInc}`,
    startTime: futureDate,
    timezone: 'America/New_York',
    status: 'active',
    eventType: 'physical',
    lastSyncAt: new Date().toISOString(),
    ...overrides,
  };
  await db.insert(schema.events).values(record);
  const event = await db.query.events.findFirst({
    where: (e, { eq }) => eq(e.id, record.id!),
  });
  return event!;
}

// ── Badges ─────────────────────────────────────────────────────────

export async function createBadge(overrides?: Partial<schema.NewBadge>): Promise<schema.Badge> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewBadge = {
    id,
    name: `Test Badge ${autoInc}`,
    slug: `test-badge-${autoInc}`,
    icon: '🏆',
    color: '#E5574F',
    points: 10,
    ...overrides,
  };
  await db.insert(schema.badges).values(record);
  const badge = await db.query.badges.findFirst({
    where: (b, { eq }) => eq(b.id, record.id!),
  });
  return badge!;
}

export async function awardBadge(
  userId: string,
  badgeId: string,
): Promise<schema.UserBadge> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewUserBadge = {
    id,
    userId,
    badgeId,
    awardedAt: new Date().toISOString(),
  };
  await db.insert(schema.userBadges).values(record);
  const userBadge = await db.query.userBadges.findFirst({
    where: (ub, { eq }) => eq(ub.id, record.id!),
  });
  return userBadge!;
}

// ── Group Members ─────────────────────────────────────────────────

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: string = 'member',
): Promise<schema.GroupMember> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewGroupMember = {
    id,
    groupId,
    userId,
    role,
  };
  await db.insert(schema.groupMembers).values(record);
  const member = await db.query.groupMembers.findFirst({
    where: (m, { eq }) => eq(m.id, record.id!),
  });
  return member!;
}

// ── Entitlements ──────────────────────────────────────────────────

export async function grantEntitlement(
  userId: string,
  entitlement: string,
  source: string = 'test',
): Promise<schema.UserEntitlement> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewUserEntitlement = {
    id,
    userId,
    entitlement,
    source,
    grantedAt: new Date().toISOString(),
  };
  await db.insert(schema.userEntitlements).values(record);
  const ent = await db.query.userEntitlements.findFirst({
    where: (e, { eq }) => eq(e.id, record.id!),
  });
  return ent!;
}

// ── PAT Tokens ────────────────────────────────────────────────────

export async function createPatToken(
  userId: string,
  scopes: string[],
  overrides?: Partial<schema.NewApiToken>,
): Promise<{ token: string; authHeader: string }> {
  const db = getDb();
  const id = nextId();

  // Generate a realistic PAT value
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const tokenSuffix = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const token = `td_pat_${tokenSuffix}`;

  // Hash with SHA-256 (same as production resolvePatToken)
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const record: schema.NewApiToken = {
    id,
    userId,
    name: `Test Token ${autoInc}`,
    tokenHash,
    tokenPrefix: token.slice(0, 12),
    scopes: JSON.stringify(scopes),
    ...overrides,
  };
  await db.insert(schema.apiTokens).values(record);

  return { token, authHeader: `Bearer ${token}` };
}

// ── User Follows ──────────────────────────────────────────────────

export async function createFollow(
  followerId: string,
  followedId: string,
): Promise<schema.UserFollow> {
  const db = getDb();
  const record: schema.NewUserFollow = {
    followerId,
    followedId,
  };
  await db.insert(schema.userFollows).values(record);
  const follow = await db.query.userFollows.findFirst({
    where: (f, { and, eq }) => and(eq(f.followerId, followerId), eq(f.followedId, followedId)),
  });
  return follow!;
}

// ── Favorites ──────────────────────────────────────────────────────

export async function createFavorite(
  userId: string,
  groupId: string,
): Promise<schema.UserFavorite> {
  const db = getDb();
  const id = nextId();
  const record: schema.NewUserFavorite = {
    id,
    userId,
    groupId,
  };
  await db.insert(schema.userFavorites).values(record);
  const favorite = await db.query.userFavorites.findFirst({
    where: (f, { eq }) => eq(f.id, record.id!),
  });
  return favorite!;
}
