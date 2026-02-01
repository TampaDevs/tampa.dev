/**
 * MCP groups_list Tool Integration Tests
 *
 * Tests the enhanced groups_list MCP tool for keyword search (name/description),
 * tag filter, platform filter, displayOnSite filter, sort ordering, and pagination metadata.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
} from '../../helpers';
import { mcpToolCall } from '../../helpers/mcp';

/** Parse the JSON text from an MCP tool result */
function parseResult(result: { content: Array<{ type: string; text?: string }> }) {
  return JSON.parse(result.content[0].text!);
}

describe('groups_list MCP tool', () => {
  // ── Keyword search ──

  it('searches by group name', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Tampa React Devs', urlname: 'tampa-react' });
    await createGroup({ name: 'Tampa Rust Club', urlname: 'tampa-rust' });
    await createGroup({ name: 'Orlando Python', urlname: 'orlando-python' });

    const result = await mcpToolCall('groups_list', { search: 'Tampa' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(2);
    const names = data.entries.map((e: Record<string, unknown>) => e.name);
    expect(names).toContain('Tampa React Devs');
    expect(names).toContain('Tampa Rust Club');
    expect(names).not.toContain('Orlando Python');
  });

  it('searches by group description', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({
      name: 'Tech Meetup',
      urlname: 'tech-meetup-desc',
      description: 'A community focused on Kubernetes and cloud native technologies',
    });
    await createGroup({
      name: 'Game Night',
      urlname: 'game-night-desc',
      description: 'Board games and card games every Thursday',
    });

    const result = await mcpToolCall('groups_list', { search: 'Kubernetes' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].name).toBe('Tech Meetup');
  });

  // ── Tag filter ──

  it('filters by tag', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({
      name: 'Cloud Group',
      urlname: 'cloud-group',
      tags: JSON.stringify(['cloud', 'aws', 'devops']),
    });
    await createGroup({
      name: 'Frontend Group',
      urlname: 'frontend-group',
      tags: JSON.stringify(['react', 'javascript', 'css']),
    });

    const result = await mcpToolCall('groups_list', { tag: 'cloud' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].name).toBe('Cloud Group');
    expect(data.entries[0].tags).toContain('cloud');
  });

  // ── Platform filter ──

  it('filters by platform', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({
      name: 'Meetup Group',
      urlname: 'meetup-grp',
      platform: 'meetup',
    });
    await createGroup({
      name: 'Luma Group',
      urlname: 'luma-grp',
      platform: 'luma',
      platformId: 'luma-plat-1',
    });

    const result = await mcpToolCall('groups_list', { platform: 'luma' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].name).toBe('Luma Group');
    expect(data.entries[0].platform).toBe('luma');
  });

  // ── displayOnSite filter ──

  it('filters by display_on_site', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({
      name: 'Visible Group',
      urlname: 'visible-grp',
      displayOnSite: true,
    });
    await createGroup({
      name: 'Hidden Group',
      urlname: 'hidden-grp',
      displayOnSite: false,
    });

    const result = await mcpToolCall('groups_list', { display_on_site: true }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const names = data.entries.map((e: Record<string, unknown>) => e.name);
    expect(names).toContain('Visible Group');
    expect(names).not.toContain('Hidden Group');
  });

  // ── Sorting ──

  it('sorts by name ascending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Zebra Group', urlname: 'zebra-sort' });
    await createGroup({ name: 'Alpha Group', urlname: 'alpha-sort' });

    const result = await mcpToolCall('groups_list', {}, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const alphaIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Alpha Group');
    const zebraIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Zebra Group');
    expect(alphaIdx).toBeLessThan(zebraIdx);
  });

  it('sorts by member_count descending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Big Group', urlname: 'big-grp', memberCount: 500 });
    await createGroup({ name: 'Small Group', urlname: 'small-grp', memberCount: 10 });

    const result = await mcpToolCall('groups_list', { sort: 'member_count' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const bigIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Big Group');
    const smallIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Small Group');
    expect(bigIdx).toBeLessThan(smallIdx);
  });

  it('sorts by member_count ascending', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Big Group Asc', urlname: 'big-grp-asc', memberCount: 500 });
    await createGroup({ name: 'Small Group Asc', urlname: 'small-grp-asc', memberCount: 10 });

    const result = await mcpToolCall('groups_list', { sort: 'member_count', direction: 'asc' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const smallIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Small Group Asc');
    const bigIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Big Group Asc');
    expect(smallIdx).toBeLessThan(bigIdx);
  });

  it('sorts by name descending', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Zebra Desc', urlname: 'zebra-desc' });
    await createGroup({ name: 'Alpha Desc', urlname: 'alpha-desc' });

    const result = await mcpToolCall('groups_list', { sort: 'name', direction: 'desc' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const zebraIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Zebra Desc');
    const alphaIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Alpha Desc');
    expect(zebraIdx).toBeLessThan(alphaIdx);
  });

  it('sorts by created_at descending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Old Group', urlname: 'old-grp', createdAt: '2020-01-01T00:00:00Z' });
    await createGroup({ name: 'New Group', urlname: 'new-grp', createdAt: '2025-01-01T00:00:00Z' });

    const result = await mcpToolCall('groups_list', { sort: 'created_at' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const newIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'New Group');
    const oldIdx = data.entries.findIndex((e: Record<string, unknown>) => e.name === 'Old Group');
    expect(newIdx).toBeLessThan(oldIdx);
  });

  // ── Combined filters ──

  it('combines search + tag + platform filters', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    // Matches all filters
    await createGroup({
      name: 'Tampa Cloud Meetup',
      urlname: 'tampa-cloud-combo',
      platform: 'meetup',
      tags: JSON.stringify(['cloud', 'aws']),
    });

    // Wrong platform
    await createGroup({
      name: 'Tampa Cloud Luma',
      urlname: 'tampa-cloud-luma',
      platform: 'luma',
      platformId: 'luma-combo-1',
      tags: JSON.stringify(['cloud']),
    });

    // Wrong tag
    await createGroup({
      name: 'Tampa Frontend Meetup',
      urlname: 'tampa-frontend-combo',
      platform: 'meetup',
      tags: JSON.stringify(['react', 'javascript']),
    });

    // Wrong name
    await createGroup({
      name: 'Orlando Cloud Meetup',
      urlname: 'orlando-cloud-combo',
      platform: 'meetup',
      tags: JSON.stringify(['cloud']),
    });

    const result = await mcpToolCall('groups_list', {
      search: 'Tampa',
      tag: 'cloud',
      platform: 'meetup',
    }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].name).toBe('Tampa Cloud Meetup');
  });

  // ── Pagination metadata ──

  it('returns pagination metadata (total, hasMore)', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    for (let i = 0; i < 5; i++) {
      await createGroup({ name: `Paginated Group ${i}`, urlname: `paginated-grp-${i}` });
    }

    const page1 = await mcpToolCall('groups_list', { limit: 2, offset: 0 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data1 = parseResult(page1);
    expect(data1.entries.length).toBe(2);
    expect(data1.limit).toBe(2);
    expect(data1.offset).toBe(0);
    expect(data1.total).toBe(5);
    expect(data1.hasMore).toBe(true);

    const page3 = await mcpToolCall('groups_list', { limit: 2, offset: 4 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data3 = parseResult(page3);
    expect(data3.entries.length).toBe(1);
    expect(data3.offset).toBe(4);
    expect(data3.hasMore).toBe(false);
  });

  // ── Featured/active filters still work ──

  it('filters by featured status', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Featured Grp', urlname: 'featured-test', isFeatured: true });
    await createGroup({ name: 'Normal Grp', urlname: 'normal-test', isFeatured: false });

    const result = await mcpToolCall('groups_list', { featured: true }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const names = data.entries.map((e: Record<string, unknown>) => e.name);
    expect(names).toContain('Featured Grp');
    expect(names).not.toContain('Normal Grp');
  });

  it('filters by active status', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Active Grp', urlname: 'active-test', isActive: true });
    await createGroup({ name: 'Inactive Grp', urlname: 'inactive-test', isActive: false });

    const result = await mcpToolCall('groups_list', { active: false }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const names = data.entries.map((e: Record<string, unknown>) => e.name);
    expect(names).toContain('Inactive Grp');
    expect(names).not.toContain('Active Grp');
  });

  // ── Empty results ──

  it('returns empty entries for non-matching search', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createGroup({ name: 'Some Group', urlname: 'some-group-empty' });

    const result = await mcpToolCall('groups_list', { search: 'zzzznonexistent' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });
});
