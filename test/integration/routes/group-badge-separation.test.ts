/**
 * Group Badge Separation Integration Tests
 *
 * Verifies that platform badges and group badges are properly separated
 * across all API surfaces: leaderboards, profiles, user directory, and
 * badge claim links.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestEnv,
  createUser,
  createSession,
  createGroup,
  createBadge,
  awardBadge,
  appRequest,
  getDb,
} from '../helpers';
import * as schema from '../../../src/db/schema';

// ============== 1. Platform Leaderboard (GET /leaderboard) ==============

describe('Platform Leaderboard - Badge Separation', () => {
  it('user with only platform badges appears with correct score', async () => {
    const { env } = createTestEnv();
    const user = await createUser({
      profileVisibility: 'public',
      username: 'platformonly',
      showAchievements: true,
    });
    const badge1 = await createBadge({ name: 'Platform A', slug: 'platform-a', points: 20 });
    const badge2 = await createBadge({ name: 'Platform B', slug: 'platform-b', points: 30 });
    await awardBadge(user.id, badge1.id);
    await awardBadge(user.id, badge2.id);

    const res = await appRequest('/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        entries: { username: string; score: number; badges: { slug: string }[] }[];
        total: number;
      };
    };
    expect(body.data.entries).toHaveLength(1);
    expect(body.data.entries[0].username).toBe('platformonly');
    expect(body.data.entries[0].score).toBe(50);
    expect(body.data.entries[0].badges).toHaveLength(2);
  });

  it('user with only group badges does NOT appear on platform leaderboard', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'group-only-lb', name: 'Group Only LB' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'grouponlyuser',
      showAchievements: true,
    });
    const groupBadge = await createBadge({
      name: 'Group Badge',
      slug: 'group-badge-lb',
      points: 25,
      groupId: group.id,
    });
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { entries: { username: string }[]; total: number } };
    expect(body.data.total).toBe(0);
    expect(body.data.entries).toHaveLength(0);
  });

  it('user with both badge types: score only counts platform badge points', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'mixed-lb', name: 'Mixed LB' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'mixeduser',
      showAchievements: true,
    });

    const platformBadge = await createBadge({ name: 'Platform Badge', slug: 'plat-mixed', points: 20 });
    const groupBadge = await createBadge({
      name: 'Group Badge',
      slug: 'grp-mixed',
      points: 15,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        entries: { username: string; score: number; badges: { slug: string }[] }[];
      };
    };
    expect(body.data.entries).toHaveLength(1);
    expect(body.data.entries[0].score).toBe(20); // Only platform badge points
  });

  it('leaderboard badges list only includes platform badges', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'badge-list-lb', name: 'Badge List LB' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'badgelistuser',
      showAchievements: true,
    });

    const platformBadge = await createBadge({ name: 'Visible Platform', slug: 'visible-plat', points: 10 });
    const groupBadge = await createBadge({
      name: 'Hidden Group',
      slug: 'hidden-grp',
      points: 10,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        entries: { badges: { slug: string }[] }[];
      };
    };
    expect(body.data.entries).toHaveLength(1);
    const slugs = body.data.entries[0].badges.map((b) => b.slug);
    expect(slugs).toContain('visible-plat');
    expect(slugs).not.toContain('hidden-grp');
  });
});

// ============== 2. Group Leaderboard (GET /groups/:slug/leaderboard) ==============

describe('Group Leaderboard - Badge Separation', () => {
  it('returns 404 for non-existent group slug', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/groups/nonexistent-slug/leaderboard', { env });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/i);
  });

  it('user with group badges appears on group leaderboard with correct XP', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'grp-lb', name: 'Group LB' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'grplbuser',
    });

    const groupBadge1 = await createBadge({
      name: 'Group Badge 1',
      slug: 'grp-lb-badge1',
      points: 10,
      groupId: group.id,
    });
    const groupBadge2 = await createBadge({
      name: 'Group Badge 2',
      slug: 'grp-lb-badge2',
      points: 15,
      groupId: group.id,
    });
    await awardBadge(user.id, groupBadge1.id);
    await awardBadge(user.id, groupBadge2.id);

    const res = await appRequest('/groups/grp-lb/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        group: { id: string; name: string; urlname: string; photoUrl: string | null };
        entries: { username: string; score: number; badges: { slug: string }[] }[];
        total: number;
      };
    };
    expect(body.data.total).toBe(1);
    expect(body.data.entries).toHaveLength(1);
    expect(body.data.entries[0].username).toBe('grplbuser');
    expect(body.data.entries[0].score).toBe(25);
    expect(body.data.entries[0].badges).toHaveLength(2);
  });

  it('user with platform-only badges does NOT appear on group leaderboard', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'grp-no-plat', name: 'Group No Plat' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'platonlygrplb',
    });

    const platformBadge = await createBadge({ name: 'Platform Only', slug: 'plat-only-grplb', points: 30 });
    await awardBadge(user.id, platformBadge.id);

    const res = await appRequest('/groups/grp-no-plat/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        entries: { username: string }[];
        total: number;
      };
    };
    expect(body.data.total).toBe(0);
    expect(body.data.entries).toHaveLength(0);
  });

  it('includes group info (id, name, urlname, photoUrl) in response', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({
      urlname: 'grp-info-test',
      name: 'Group Info Test',
      photoUrl: 'https://example.com/photo.jpg',
    });

    const res = await appRequest('/groups/grp-info-test/leaderboard', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        group: { id: string; name: string; urlname: string; photoUrl: string | null };
      };
    };
    expect(body.data.group.id).toBe(group.id);
    expect(body.data.group.name).toBe('Group Info Test');
    expect(body.data.group.urlname).toBe('grp-info-test');
    expect(body.data.group.photoUrl).toBe('https://example.com/photo.jpg');
  });

  it('users from different groups do not appear in each other\'s leaderboard', async () => {
    const { env } = createTestEnv();
    const groupA = await createGroup({ urlname: 'group-a-cross', name: 'Group A Cross' });
    const groupB = await createGroup({ urlname: 'group-b-cross', name: 'Group B Cross' });

    const userA = await createUser({ profileVisibility: 'public', username: 'usera-cross' });
    const userB = await createUser({ profileVisibility: 'public', username: 'userb-cross' });

    const badgeA = await createBadge({
      name: 'Badge A',
      slug: 'badge-a-cross',
      points: 10,
      groupId: groupA.id,
    });
    const badgeB = await createBadge({
      name: 'Badge B',
      slug: 'badge-b-cross',
      points: 20,
      groupId: groupB.id,
    });

    await awardBadge(userA.id, badgeA.id);
    await awardBadge(userB.id, badgeB.id);

    // Group A leaderboard should only have userA
    const resA = await appRequest('/groups/group-a-cross/leaderboard', { env });
    expect(resA.status).toBe(200);
    const bodyA = (await resA.json()) as {
      data: {
        entries: { username: string; score: number }[];
        total: number;
      };
    };
    expect(bodyA.data.total).toBe(1);
    expect(bodyA.data.entries[0].username).toBe('usera-cross');
    expect(bodyA.data.entries[0].score).toBe(10);

    // Group B leaderboard should only have userB
    const resB = await appRequest('/groups/group-b-cross/leaderboard', { env });
    expect(resB.status).toBe(200);
    const bodyB = (await resB.json()) as {
      data: {
        entries: { username: string; score: number }[];
        total: number;
      };
    };
    expect(bodyB.data.total).toBe(1);
    expect(bodyB.data.entries[0].username).toBe('userb-cross');
    expect(bodyB.data.entries[0].score).toBe(20);
  });
});

// ============== 3. Public Profile (GET /users/:username) ==============

describe('Public Profile - Badge Separation', () => {
  it('badges array contains only platform badges (no groupId)', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'pub-prof-grp', name: 'Pub Prof Grp' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'pubprofuser',
    });

    const platformBadge = await createBadge({ name: 'Platform', slug: 'pub-prof-plat', points: 10 });
    const groupBadge = await createBadge({
      name: 'Group',
      slug: 'pub-prof-grp-badge',
      points: 15,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/users/pubprofuser', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        badges: { slug: string; groupId?: string | null }[];
        groupBadges: unknown[];
      };
    };

    // Platform badges only in `badges`
    expect(body.data.badges).toHaveLength(1);
    expect(body.data.badges[0].slug).toBe('pub-prof-plat');
    // Ensure no groupId leaks into platform badges
    for (const badge of body.data.badges) {
      expect(badge).not.toHaveProperty('groupId');
    }
  });

  it('groupBadges array contains group badges organized by group', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'grp-org', name: 'Group Organized', photoUrl: 'https://example.com/grp.jpg' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'grporguser',
    });

    const groupBadge1 = await createBadge({
      name: 'G Badge 1',
      slug: 'g-badge-org-1',
      points: 10,
      groupId: group.id,
    });
    const groupBadge2 = await createBadge({
      name: 'G Badge 2',
      slug: 'g-badge-org-2',
      points: 20,
      groupId: group.id,
    });

    await awardBadge(user.id, groupBadge1.id);
    await awardBadge(user.id, groupBadge2.id);

    const res = await appRequest('/users/grporguser', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        groupBadges: {
          group: { id: string; name: string; urlname: string; photoUrl: string | null };
          badges: { slug: string; points: number }[];
          xpSubtotal: number;
        }[];
      };
    };

    expect(body.data.groupBadges).toHaveLength(1);
    const entry = body.data.groupBadges[0];
    expect(entry.group.id).toBe(group.id);
    expect(entry.group.name).toBe('Group Organized');
    expect(entry.group.urlname).toBe('grp-org');
    expect(entry.group.photoUrl).toBe('https://example.com/grp.jpg');
    expect(entry.badges).toHaveLength(2);
    expect(entry.xpSubtotal).toBe(30);
  });

  it('xpScore only counts platform badges', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'xp-score-grp', name: 'XP Score Grp' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'xpscoreuser',
    });

    const platformBadge = await createBadge({ name: 'XP Platform', slug: 'xp-plat', points: 25 });
    const groupBadge = await createBadge({
      name: 'XP Group',
      slug: 'xp-grp',
      points: 15,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/users/xpscoreuser', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { xpScore: number } };
    expect(body.data.xpScore).toBe(25); // Only platform badge points
  });

  it('user with no group badges has empty groupBadges array', async () => {
    const { env } = createTestEnv();
    const user = await createUser({
      profileVisibility: 'public',
      username: 'nogrpuser',
    });

    const platformBadge = await createBadge({ name: 'Solo Platform', slug: 'solo-plat', points: 10 });
    await awardBadge(user.id, platformBadge.id);

    const res = await appRequest('/users/nogrpuser', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { groupBadges: unknown[] } };
    expect(body.data.groupBadges).toEqual([]);
  });
});

// ============== 4. Authenticated Profile (GET /profile) ==============

describe('Authenticated Profile - Badge Separation', () => {
  it('badges array contains only platform badges', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'auth-prof-grp', name: 'Auth Prof Grp' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'authprofuser',
    });
    const { cookieHeader } = await createSession(user.id);

    const platformBadge = await createBadge({ name: 'Auth Platform', slug: 'auth-plat', points: 10 });
    const groupBadge = await createBadge({
      name: 'Auth Group',
      slug: 'auth-grp-badge',
      points: 20,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/profile', { env, headers: { Cookie: cookieHeader } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        badges: { slug: string; groupId?: string | null }[];
        groupBadges: unknown[];
      };
    };

    // Only platform badges in `badges`
    expect(body.data.badges).toHaveLength(1);
    expect(body.data.badges[0].slug).toBe('auth-plat');
    // Ensure no groupId on platform badges
    for (const badge of body.data.badges) {
      expect(badge).not.toHaveProperty('groupId');
    }
  });

  it('groupBadges array contains group badges organized by group', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({
      urlname: 'auth-grp-org',
      name: 'Auth Group Org',
      photoUrl: 'https://example.com/auth-grp.jpg',
    });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'authgrporguser',
    });
    const { cookieHeader } = await createSession(user.id);

    const groupBadge = await createBadge({
      name: 'Auth GBadge',
      slug: 'auth-g-badge',
      points: 15,
      groupId: group.id,
    });

    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/profile', { env, headers: { Cookie: cookieHeader } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        groupBadges: {
          group: { id: string; name: string; urlname: string; photoUrl: string | null };
          badges: { slug: string; points: number }[];
          xpSubtotal: number;
        }[];
      };
    };

    expect(body.data.groupBadges).toHaveLength(1);
    const entry = body.data.groupBadges[0];
    expect(entry.group.id).toBe(group.id);
    expect(entry.group.name).toBe('Auth Group Org');
    expect(entry.group.urlname).toBe('auth-grp-org');
    expect(entry.group.photoUrl).toBe('https://example.com/auth-grp.jpg');
    expect(entry.badges).toHaveLength(1);
    expect(entry.badges[0].slug).toBe('auth-g-badge');
    expect(entry.xpSubtotal).toBe(15);
  });

  it('groupBadges entries have xpSubtotal summing group badge points', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'auth-xp-sub', name: 'Auth XP Sub' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'authxpsubuser',
    });
    const { cookieHeader } = await createSession(user.id);

    const gb1 = await createBadge({
      name: 'Auth GB1',
      slug: 'auth-gb1',
      points: 10,
      groupId: group.id,
    });
    const gb2 = await createBadge({
      name: 'Auth GB2',
      slug: 'auth-gb2',
      points: 25,
      groupId: group.id,
    });

    await awardBadge(user.id, gb1.id);
    await awardBadge(user.id, gb2.id);

    const res = await appRequest('/profile', { env, headers: { Cookie: cookieHeader } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        groupBadges: { xpSubtotal: number; badges: unknown[] }[];
      };
    };

    expect(body.data.groupBadges).toHaveLength(1);
    expect(body.data.groupBadges[0].xpSubtotal).toBe(35);
    expect(body.data.groupBadges[0].badges).toHaveLength(2);
  });
});

// ============== 5. User Directory (GET /users) ==============

describe('User Directory - Badge Separation', () => {
  it('badges in listing only include platform badges, not group badges', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'dir-grp', name: 'Dir Grp' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'diruser',
    });

    const platformBadge = await createBadge({ name: 'Dir Platform', slug: 'dir-plat', points: 10 });
    const groupBadge = await createBadge({
      name: 'Dir Group',
      slug: 'dir-grp-badge',
      points: 15,
      groupId: group.id,
    });

    await awardBadge(user.id, platformBadge.id);
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/users', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { username: string; badges: { slug: string }[] }[];
    };
    expect(body.data).toHaveLength(1);
    const slugs = body.data[0].badges.map((b) => b.slug);
    expect(slugs).toContain('dir-plat');
    expect(slugs).not.toContain('dir-grp-badge');
  });

  it('user with only group badges shows empty badges array in directory', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({ urlname: 'dir-only-grp', name: 'Dir Only Grp' });
    const user = await createUser({
      profileVisibility: 'public',
      username: 'dironlygrp',
    });

    const groupBadge = await createBadge({
      name: 'Only Group Badge',
      slug: 'only-grp-dir',
      points: 20,
      groupId: group.id,
    });
    await awardBadge(user.id, groupBadge.id);

    const res = await appRequest('/users', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { username: string; badges: { slug: string }[] }[];
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].badges).toHaveLength(0);
  });
});

// ============== 6. Claim Link (GET /claim/:code) ==============

describe('Claim Link - Group Info', () => {
  it('returns group object with id, name, urlname, photoUrl for group badge claim link', async () => {
    const { env } = createTestEnv();
    const group = await createGroup({
      urlname: 'claim-grp',
      name: 'Claim Group',
      photoUrl: 'https://example.com/claim.jpg',
    });
    const admin = await createUser({ role: 'admin', username: 'claimadmin' });
    const badge = await createBadge({
      name: 'Claim Group Badge',
      slug: 'claim-grp-badge',
      points: 10,
      groupId: group.id,
    });

    const db = getDb();
    await db.insert(schema.badgeClaimLinks).values({
      id: crypto.randomUUID(),
      badgeId: badge.id,
      code: 'grpclaimcode123',
      maxUses: null,
      currentUses: 0,
      createdBy: admin.id,
    });

    const res = await appRequest('/claim/grpclaimcode123', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        badge: { name: string; slug: string; points: number };
        group: { id: string; name: string; urlname: string; photoUrl: string | null } | null;
        claimable: boolean;
      };
    };
    expect(body.data.claimable).toBe(true);
    expect(body.data.badge.slug).toBe('claim-grp-badge');
    expect(body.data.group).not.toBeNull();
    expect(body.data.group!.id).toBe(group.id);
    expect(body.data.group!.name).toBe('Claim Group');
    expect(body.data.group!.urlname).toBe('claim-grp');
    expect(body.data.group!.photoUrl).toBe('https://example.com/claim.jpg');
  });

  it('returns group: null for platform badge claim links', async () => {
    const { env } = createTestEnv();
    const admin = await createUser({ role: 'admin', username: 'platclaimadmin' });
    const badge = await createBadge({
      name: 'Claim Platform Badge',
      slug: 'claim-plat-badge',
      points: 15,
    });

    const db = getDb();
    await db.insert(schema.badgeClaimLinks).values({
      id: crypto.randomUUID(),
      badgeId: badge.id,
      code: 'platclaimcode456',
      maxUses: null,
      currentUses: 0,
      createdBy: admin.id,
    });

    const res = await appRequest('/claim/platclaimcode456', { env });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        badge: { name: string; slug: string; points: number };
        group: null;
        claimable: boolean;
      };
    };
    expect(body.data.claimable).toBe(true);
    expect(body.data.badge.slug).toBe('claim-plat-badge');
    expect(body.data.group).toBeNull();
  });

  it('returns 404 for non-existent claim code', async () => {
    const { env } = createTestEnv();
    const res = await appRequest('/claim/nonexistent-code', { env });
    expect(res.status).toBe(404);
  });
});
