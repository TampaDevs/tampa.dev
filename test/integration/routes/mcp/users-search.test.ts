/**
 * MCP users_search Tool Integration Tests
 *
 * Tests the users_search MCP tool for fuzzy name/username search,
 * badge filtering, XP thresholds, and sort ordering.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createBadge,
  awardBadge,
} from '../../helpers';
import { mcpToolCall } from '../../helpers/mcp';

/** Parse the JSON text from an MCP tool result */
function parseResult(result: { content: Array<{ type: string; text?: string }> }) {
  return JSON.parse(result.content[0].text!);
}

describe('users_search MCP tool', () => {
  // ── Basic search ──

  it('returns public users with no filters', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createUser({ username: 'alice', name: 'Alice Smith', profileVisibility: 'public' });
    await createUser({ username: 'bob', name: 'Bob Jones', profileVisibility: 'public' });

    const result = await mcpToolCall('users_search', {}, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBeGreaterThanOrEqual(3); // caller + alice + bob
    expect(data.total).toBeGreaterThanOrEqual(3);
    expect(data.hasMore).toBeDefined();

    // Verify returned fields (no email, no id, no role)
    const alice = data.entries.find((e: Record<string, unknown>) => e.username === 'alice');
    expect(alice).toBeDefined();
    expect(alice.name).toBe('Alice Smith');
    expect(alice.xp).toBeDefined();
    expect(alice.badgeCount).toBeDefined();
    expect(alice.badges).toBeDefined();
    expect(alice.memberSince).toBeDefined();
    expect(alice.email).toBeUndefined();
    expect(alice.id).toBeUndefined();
    expect(alice.role).toBeUndefined();
  });

  it('excludes private profiles', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createUser({ username: 'public-user', profileVisibility: 'public' });
    await createUser({ username: 'private-user', profileVisibility: 'private' });

    const result = await mcpToolCall('users_search', {}, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('public-user');
    expect(usernames).not.toContain('private-user');
  });

  it('excludes users without usernames', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createUser({ username: 'has-username', profileVisibility: 'public' });
    await createUser({ username: null as unknown as string, profileVisibility: 'public' });

    const result = await mcpToolCall('users_search', {}, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('has-username');
    // The null-username user should not appear
    expect(usernames.every((u: unknown) => u !== null)).toBe(true);
  });

  // ── Name/username search ──

  it('searches by name (fuzzy LIKE match)', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createUser({ username: 'john-doe', name: 'John Doe', profileVisibility: 'public' });
    await createUser({ username: 'jane-doe', name: 'Jane Doe', profileVisibility: 'public' });
    await createUser({ username: 'mike-smith', name: 'Mike Smith', profileVisibility: 'public' });

    const result = await mcpToolCall('users_search', { search: 'Doe' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('john-doe');
    expect(usernames).toContain('jane-doe');
    expect(usernames).not.toContain('mike-smith');
  });

  it('searches by username (fuzzy LIKE match)', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createUser({ username: 'dev-alice', name: 'Alice', profileVisibility: 'public' });
    await createUser({ username: 'dev-bob', name: 'Bob', profileVisibility: 'public' });
    await createUser({ username: 'zach', name: 'Zach', profileVisibility: 'public' });

    const result = await mcpToolCall('users_search', { search: 'dev-' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('dev-alice');
    expect(usernames).toContain('dev-bob');
    expect(usernames).not.toContain('zach');
  });

  // ── Badge filtering ──

  it('filters by single badge slug', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge = await createBadge({ slug: 'builder', points: 100 });
    const withBadge = await createUser({ username: 'badge-holder', profileVisibility: 'public' });
    const withoutBadge = await createUser({ username: 'no-badge', profileVisibility: 'public' });
    await awardBadge(withBadge.id, badge.id);

    const result = await mcpToolCall('users_search', { badge: 'builder' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('badge-holder');
    expect(usernames).not.toContain('no-badge');
  });

  it('filters by multiple badge slugs (AND logic)', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge1 = await createBadge({ slug: 'alpha', points: 50 });
    const badge2 = await createBadge({ slug: 'beta', points: 50 });

    const hasBoth = await createUser({ username: 'has-both', profileVisibility: 'public' });
    const hasOne = await createUser({ username: 'has-one', profileVisibility: 'public' });

    await awardBadge(hasBoth.id, badge1.id);
    await awardBadge(hasBoth.id, badge2.id);
    await awardBadge(hasOne.id, badge1.id);

    const result = await mcpToolCall('users_search', { badge: 'alpha,beta' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('has-both');
    expect(usernames).not.toContain('has-one');
  });

  // ── XP filtering ──

  it('filters by minimum XP', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const bigBadge = await createBadge({ slug: 'big-xp', points: 500 });
    const smallBadge = await createBadge({ slug: 'small-xp', points: 10 });

    const highXp = await createUser({ username: 'high-xp', profileVisibility: 'public' });
    const lowXp = await createUser({ username: 'low-xp', profileVisibility: 'public' });

    await awardBadge(highXp.id, bigBadge.id);
    await awardBadge(lowXp.id, smallBadge.id);

    const result = await mcpToolCall('users_search', { min_xp: 250 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('high-xp');
    expect(usernames).not.toContain('low-xp');
  });

  // ── Sorting ──

  it('sorts by XP descending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge100 = await createBadge({ slug: 'b100', points: 100 });
    const badge200 = await createBadge({ slug: 'b200', points: 200 });

    const user1 = await createUser({ username: 'low-scorer', profileVisibility: 'public' });
    const user2 = await createUser({ username: 'high-scorer', profileVisibility: 'public' });

    await awardBadge(user1.id, badge100.id);
    await awardBadge(user2.id, badge200.id);

    const result = await mcpToolCall('users_search', { sort: 'xp' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    // high-scorer (200xp) should come before low-scorer (100xp)
    const highIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'high-scorer');
    const lowIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'low-scorer');
    expect(highIdx).toBeLessThan(lowIdx);
  });

  it('sorts by XP ascending when direction=asc', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge100 = await createBadge({ slug: 'c100', points: 100 });
    const badge200 = await createBadge({ slug: 'c200', points: 200 });

    const user1 = await createUser({ username: 'low-asc', profileVisibility: 'public' });
    const user2 = await createUser({ username: 'high-asc', profileVisibility: 'public' });

    await awardBadge(user1.id, badge100.id);
    await awardBadge(user2.id, badge200.id);

    const result = await mcpToolCall('users_search', { sort: 'xp', direction: 'asc' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const lowIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'low-asc');
    const highIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'high-asc');
    expect(lowIdx).toBeLessThan(highIdx);
  });

  it('sorts by badge count descending', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge1 = await createBadge({ slug: 'bc1', points: 10 });
    const badge2 = await createBadge({ slug: 'bc2', points: 10 });
    const badge3 = await createBadge({ slug: 'bc3', points: 10 });

    const manyBadges = await createUser({ username: 'many-badges', profileVisibility: 'public' });
    const fewBadges = await createUser({ username: 'few-badges', profileVisibility: 'public' });

    await awardBadge(manyBadges.id, badge1.id);
    await awardBadge(manyBadges.id, badge2.id);
    await awardBadge(manyBadges.id, badge3.id);
    await awardBadge(fewBadges.id, badge1.id);

    const result = await mcpToolCall('users_search', { sort: 'badge_count' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const manyIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'many-badges');
    const fewIdx = data.entries.findIndex((e: Record<string, unknown>) => e.username === 'few-badges');
    expect(manyIdx).toBeLessThan(fewIdx);
  });

  // ── Combined filters ──

  it('combines search + badge + min_xp filters', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge = await createBadge({ slug: 'combo-badge', points: 300 });

    // Matches all: name contains "John", has combo-badge, 300 XP
    const match = await createUser({ username: 'john-match', name: 'John Match', profileVisibility: 'public' });
    await awardBadge(match.id, badge.id);

    // Has badge but name doesn't match
    const wrongName = await createUser({ username: 'bob-match', name: 'Bob Match', profileVisibility: 'public' });
    await awardBadge(wrongName.id, badge.id);

    // Name matches but no badge
    await createUser({ username: 'john-nobadge', name: 'John NoBadge', profileVisibility: 'public' });

    const result = await mcpToolCall('users_search', {
      search: 'John',
      badge: 'combo-badge',
      min_xp: 250,
    }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const usernames = data.entries.map((e: Record<string, unknown>) => e.username);
    expect(usernames).toContain('john-match');
    expect(usernames).not.toContain('bob-match');
    expect(usernames).not.toContain('john-nobadge');
  });

  // ── Pagination ──

  it('supports pagination with limit and offset', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    // Create several users
    for (let i = 0; i < 5; i++) {
      await createUser({ username: `page-user-${i}`, profileVisibility: 'public' });
    }

    const page1 = await mcpToolCall('users_search', { limit: 3, offset: 0 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data1 = parseResult(page1);
    expect(data1.entries.length).toBe(3);
    expect(data1.limit).toBe(3);
    expect(data1.offset).toBe(0);
    expect(data1.total).toBeGreaterThanOrEqual(6); // 5 + caller
    expect(data1.hasMore).toBe(true);

    const page2 = await mcpToolCall('users_search', { limit: 3, offset: 3 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data2 = parseResult(page2);
    expect(data2.entries.length).toBeGreaterThanOrEqual(1);
    expect(data2.offset).toBe(3);
  });

  // ── Badges in results ──

  it('includes badge slugs in results', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const badge1 = await createBadge({ slug: 'result-badge-1', points: 50 });
    const badge2 = await createBadge({ slug: 'result-badge-2', points: 50 });

    const user = await createUser({ username: 'badge-user', profileVisibility: 'public' });
    await awardBadge(user.id, badge1.id);
    await awardBadge(user.id, badge2.id);

    const result = await mcpToolCall('users_search', { search: 'badge-user' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const entry = data.entries.find((e: Record<string, unknown>) => e.username === 'badge-user');
    expect(entry).toBeDefined();
    expect(entry.badges).toContain('result-badge-1');
    expect(entry.badges).toContain('result-badge-2');
    expect(entry.xp).toBe(100);
    expect(entry.badgeCount).toBe(2);
  });

  // ── Empty results ──

  it('returns empty entries for non-matching search', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const result = await mcpToolCall('users_search', { search: 'zzzznonexistent' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });
});
