import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createGroup,
  createBadge,
  awardBadge,
  createFavorite,
  appRequest,
} from '../helpers';

describe('GET /users', () => {
  it('returns empty list when no public users exist', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/users', { env });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; pagination: { total: number } };
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it('only returns public users with usernames', async () => {
    const { env } = createTestEnv();
    await createUser({ profileVisibility: 'public', username: 'alice' });
    await createUser({ profileVisibility: 'private', username: 'bob' });
    await createUser({ profileVisibility: 'public', username: null });

    const res = await appRequest('/users', { env });
    const body = await res.json() as { data: { username: string }[]; pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].username).toBe('alice');
  });

  it('returns badges for users', async () => {
    const { env } = createTestEnv();
    const user = await createUser({ profileVisibility: 'public', username: 'badgeuser' });
    const badge = await createBadge({ name: 'Early Adopter', slug: 'early-adopter', icon: '🚀' });
    await awardBadge(user.id, badge.id);

    const res = await appRequest('/users', { env });
    const body = await res.json() as { data: { username: string; badges: { slug: string }[] }[] };
    expect(body.data[0].badges).toHaveLength(1);
    expect(body.data[0].badges[0].slug).toBe('early-adopter');
  });

  it('supports search filtering', async () => {
    const { env } = createTestEnv();
    await createUser({ profileVisibility: 'public', username: 'alice', name: 'Alice Smith' });
    await createUser({ profileVisibility: 'public', username: 'charlie', name: 'Charlie Brown' });

    const res = await appRequest('/users?search=alice', { env });
    const body = await res.json() as { data: { username: string }[]; pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].username).toBe('alice');
  });

  it('supports pagination with limit and offset', async () => {
    const { env } = createTestEnv();
    for (let i = 0; i < 5; i++) {
      await createUser({ profileVisibility: 'public', username: `pager${i}` });
    }

    const res = await appRequest('/users?limit=2&offset=0', { env });
    const body = await res.json() as { data: unknown[]; pagination: { total: number; limit: number; offset: number } };
    expect(body.pagination.total).toBe(5);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.offset).toBe(0);
  });

  it('does not expose private fields (email, id, role)', async () => {
    const { env } = createTestEnv();
    await createUser({ profileVisibility: 'public', username: 'exposed' });

    const res = await appRequest('/users', { env });
    const body = await res.json() as { data: Record<string, unknown>[] };
    const user = body.data[0];
    expect(user).not.toHaveProperty('id');
    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('role');
  });
});

describe('GET /users/:username', () => {
  it('returns 404 for non-existent user', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/users/nobody', { env });
    expect(res.status).toBe(404);
  });

  it('returns public profile with badges and favorite groups', async () => {
    const { env } = createTestEnv();
    const user = await createUser({
      profileVisibility: 'public',
      username: 'jane',
      name: 'Jane Doe',
      bio: 'Hello!',
    });
    const badge = await createBadge({ name: 'Contributor', slug: 'contributor', icon: '⭐', points: 25 });
    await awardBadge(user.id, badge.id);

    const group = await createGroup({ urlname: 'tampa-devs', name: 'Tampa Devs', displayOnSite: true });
    await createFavorite(user.id, group.id);

    const res = await appRequest('/users/jane', { env });
    expect(res.status).toBe(200);

    const body = await res.json() as {
      data: {
        username: string;
        name: string;
        bio: string;
        badges: { slug: string; points: number }[];
        favoriteGroups: { slug: string; name: string }[];
        xpScore: number;
      };
    };
    expect(body.data.username).toBe('jane');
    expect(body.data.name).toBe('Jane Doe');
    expect(body.data.bio).toBe('Hello!');
    expect(body.data.badges).toHaveLength(1);
    expect(body.data.badges[0].slug).toBe('contributor');
    expect(body.data.favoriteGroups).toHaveLength(1);
    expect(body.data.favoriteGroups[0].slug).toBe('tampa-devs');
    expect(body.data.xpScore).toBe(25);
  });

  it('does not expose private fields on profile endpoint', async () => {
    const { env } = createTestEnv();
    await createUser({ profileVisibility: 'public', username: 'safe' });

    const res = await appRequest('/users/safe', { env });
    const body = await res.json() as { data: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('id');
    expect(body.data).not.toHaveProperty('email');
    expect(body.data).not.toHaveProperty('role');
  });
});
