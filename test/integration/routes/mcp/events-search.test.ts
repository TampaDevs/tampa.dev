/**
 * MCP events_list Tool Integration Tests
 *
 * Tests the enhanced events_list MCP tool for keyword search (title/description),
 * city filter, event type, featured status, sort ordering, and pagination metadata.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
  createEvent,
  getDb,
} from '../../helpers';
import { mcpToolCall } from '../../helpers/mcp';
import { venues } from '../../../../src/db/schema';

/** Parse the JSON text from an MCP tool result */
function parseResult(result: { content: Array<{ type: string; text?: string }> }) {
  return JSON.parse(result.content[0].text!);
}

/** Insert a test venue directly */
async function createVenue(overrides: {
  id: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
}) {
  const db = getDb();
  await db.insert(venues).values({
    id: overrides.id,
    name: overrides.name,
    city: overrides.city ?? null,
    state: overrides.state ?? null,
    address: overrides.address ?? null,
  });
}

describe('events_list MCP tool', () => {
  // ── Keyword search ──

  it('searches by event title', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'React Meetup Night' });
    await createEvent(group.id, { title: 'Rust Workshop' });
    await createEvent(group.id, { title: 'Python Happy Hour' });

    const result = await mcpToolCall('events_list', { search: 'React' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('React Meetup Night');
    expect(data.total).toBe(1);
  });

  it('searches by event description', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, {
      title: 'Monthly Meetup',
      description: 'Join us for an evening of Kubernetes and cloud native discussions',
    });
    await createEvent(group.id, {
      title: 'Game Night',
      description: 'Casual board games and socializing',
    });

    const result = await mcpToolCall('events_list', { search: 'Kubernetes' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Monthly Meetup');
  });

  // ── City filter ──

  it('filters by venue city', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createVenue({ id: 'venue-tampa', name: 'Tampa Tech Hub', city: 'Tampa', state: 'FL' });
    await createVenue({ id: 'venue-orlando', name: 'Orlando Center', city: 'Orlando', state: 'FL' });

    const group = await createGroup();
    await createEvent(group.id, { title: 'Tampa Event', venueId: 'venue-tampa' });
    await createEvent(group.id, { title: 'Orlando Event', venueId: 'venue-orlando' });

    const result = await mcpToolCall('events_list', { city: 'Tampa' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Tampa Event');
    expect(data.entries[0].venue.city).toBe('Tampa');
  });

  // ── Event type filter ──

  it('filters by event type', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'In Person Talk', eventType: 'physical' });
    await createEvent(group.id, { title: 'Virtual Workshop', eventType: 'online' });
    await createEvent(group.id, { title: 'Hybrid Conference', eventType: 'hybrid' });

    const result = await mcpToolCall('events_list', { event_type: 'online' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Virtual Workshop');
    expect(data.entries[0].eventType).toBe('online');
  });

  // ── Featured filter ──

  it('filters by featured status', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Featured Event', isFeatured: true });
    await createEvent(group.id, { title: 'Regular Event', isFeatured: false });

    const result = await mcpToolCall('events_list', { featured: true }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Featured Event');
    expect(data.entries[0].isFeatured).toBe(true);
  });

  // ── Sorting ──

  it('sorts by start_time ascending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Later Event', startTime: '2025-06-15T18:00:00Z' });
    await createEvent(group.id, { title: 'Earlier Event', startTime: '2025-06-01T18:00:00Z' });

    const result = await mcpToolCall('events_list', {}, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const earlierIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Earlier Event');
    const laterIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Later Event');
    expect(earlierIdx).toBeLessThan(laterIdx);
  });

  it('sorts by title ascending', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Zebra Event' });
    await createEvent(group.id, { title: 'Alpha Event' });

    const result = await mcpToolCall('events_list', { sort: 'title', direction: 'asc' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const alphaIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Alpha Event');
    const zebraIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Zebra Event');
    expect(alphaIdx).toBeLessThan(zebraIdx);
  });

  it('sorts by rsvp_count descending by default', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Popular Event', rsvpCount: 100 });
    await createEvent(group.id, { title: 'Quiet Event', rsvpCount: 5 });

    const result = await mcpToolCall('events_list', { sort: 'rsvp_count' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const popularIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Popular Event');
    const quietIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Quiet Event');
    expect(popularIdx).toBeLessThan(quietIdx);
  });

  it('sorts by start_time descending', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Later Event', startTime: '2025-06-15T18:00:00Z' });
    await createEvent(group.id, { title: 'Earlier Event', startTime: '2025-06-01T18:00:00Z' });

    const result = await mcpToolCall('events_list', { sort: 'start_time', direction: 'desc' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    const laterIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Later Event');
    const earlierIdx = data.entries.findIndex((e: Record<string, unknown>) => e.title === 'Earlier Event');
    expect(laterIdx).toBeLessThan(earlierIdx);
  });

  // ── Combined filters ──

  it('combines search + city + event_type filters', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    await createVenue({ id: 'venue-tampa-combo', name: 'Tampa Hub', city: 'Tampa' });
    await createVenue({ id: 'venue-orlando-combo', name: 'Orlando Hub', city: 'Orlando' });

    const group = await createGroup();

    // Matches all filters: title contains "React", Tampa, physical
    await createEvent(group.id, {
      title: 'React Tampa Meetup',
      eventType: 'physical',
      venueId: 'venue-tampa-combo',
    });

    // Wrong city
    await createEvent(group.id, {
      title: 'React Orlando Meetup',
      eventType: 'physical',
      venueId: 'venue-orlando-combo',
    });

    // Wrong title
    await createEvent(group.id, {
      title: 'Python Tampa Meetup',
      eventType: 'physical',
      venueId: 'venue-tampa-combo',
    });

    // Wrong type
    await createEvent(group.id, {
      title: 'React Tampa Virtual',
      eventType: 'online',
      venueId: 'venue-tampa-combo',
    });

    const result = await mcpToolCall('events_list', {
      search: 'React',
      city: 'Tampa',
      event_type: 'physical',
    }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('React Tampa Meetup');
  });

  // ── Pagination metadata ──

  it('returns pagination metadata (total, hasMore)', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    for (let i = 0; i < 5; i++) {
      await createEvent(group.id, { title: `Paginated Event ${i}` });
    }

    const page1 = await mcpToolCall('events_list', { limit: 2, offset: 0 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data1 = parseResult(page1);
    expect(data1.entries.length).toBe(2);
    expect(data1.limit).toBe(2);
    expect(data1.offset).toBe(0);
    expect(data1.total).toBe(5);
    expect(data1.hasMore).toBe(true);

    const page3 = await mcpToolCall('events_list', { limit: 2, offset: 4 }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data3 = parseResult(page3);
    expect(data3.entries.length).toBe(1);
    expect(data3.offset).toBe(4);
    expect(data3.hasMore).toBe(false);
  });

  // ── Empty results ──

  it('returns empty entries for non-matching search', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Some Event' });

    const result = await mcpToolCall('events_list', { search: 'zzzznonexistent' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.hasMore).toBe(false);
  });

  // ── Group slug filter still works ──

  it('filters by group slug', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group1 = await createGroup({ urlname: 'group-alpha', name: 'Group Alpha' });
    const group2 = await createGroup({ urlname: 'group-beta', name: 'Group Beta' });

    await createEvent(group1.id, { title: 'Alpha Event' });
    await createEvent(group2.id, { title: 'Beta Event' });

    const result = await mcpToolCall('events_list', { group_slug: 'group-alpha' }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Alpha Event');
    expect(data.entries[0].group.urlname).toBe('group-alpha');
  });

  // ── Date range filters still work ──

  it('filters by after/before date range', async () => {
    const { env } = createTestEnv();
    const caller = await createUser({ username: 'caller', profileVisibility: 'public' });
    const { cookieHeader } = await createSession(caller.id);

    const group = await createGroup();
    await createEvent(group.id, { title: 'Past Event', startTime: '2025-01-01T18:00:00Z' });
    await createEvent(group.id, { title: 'Mid Event', startTime: '2025-06-15T18:00:00Z' });
    await createEvent(group.id, { title: 'Future Event', startTime: '2025-12-01T18:00:00Z' });

    const result = await mcpToolCall('events_list', {
      after: '2025-03-01T00:00:00Z',
      before: '2025-09-01T00:00:00Z',
    }, {
      env,
      headers: { Cookie: cookieHeader },
    });

    const data = parseResult(result);
    expect(data.entries.length).toBe(1);
    expect(data.entries[0].title).toBe('Mid Event');
  });
});
