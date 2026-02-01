/**
 * Profile Service
 *
 * Shared business logic for user profile updates, portfolio management,
 * and PAT management. Used by both /v1/ API routes and session routes.
 */

import { eq, and } from 'drizzle-orm';
import { users, userPortfolioItems, apiTokens } from '../db/schema.js';
import type { User, UserPortfolioItem, ApiToken } from '../db/schema.js';
import type { DomainEvent } from '../lib/event-bus.js';

type DB = ReturnType<typeof import('../db/index.js').createDatabase>;

// ============== Validation Constants ==============

export const RESERVED_USERNAMES = [
  'admin', 'api', 'auth', 'login', 'logout', 'profile', 'settings',
  'help', 'support', 'about', 'tampa', 'tampadevs', 'developer',
  'oauth', 'groups', 'events', 'calendar', 'map', 'favorites',
  'p', 'u', 'user', 'users', 'new', 'edit', 'delete', 'search',
];

// ============== Error Types ==============

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'conflict' | 'forbidden' | 'bad_request',
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

// ============== Profile Update ==============

export interface ProfileUpdateInput {
  name?: string;
  avatarUrl?: string | null;
  heroImageUrl?: string | null;
  themeColor?: string | null;
  username?: string;
  bio?: string | null;
  location?: string | null;
  socialLinks?: string[] | null;
  showAchievements?: boolean;
  profileVisibility?: string;
}

export interface ProfileUpdateResult {
  user: User;
  events: Omit<DomainEvent, 'timestamp'>[];
}

/**
 * Update a user's profile. Validates username uniqueness and reserved names.
 */
export async function updateProfile(
  db: DB,
  userId: string,
  updates: ProfileUpdateInput,
): Promise<ProfileUpdateResult> {
  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl;
  if (updates.heroImageUrl !== undefined) updateData.heroImageUrl = updates.heroImageUrl;
  if (updates.themeColor !== undefined) updateData.themeColor = updates.themeColor;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.showAchievements !== undefined) updateData.showAchievements = updates.showAchievements;
  if (updates.profileVisibility !== undefined) updateData.profileVisibility = updates.profileVisibility;

  if (updates.socialLinks !== undefined) {
    updateData.socialLinks = updates.socialLinks && updates.socialLinks.length > 0
      ? JSON.stringify(updates.socialLinks)
      : null;
  }

  // Username uniqueness check
  if (updates.username !== undefined) {
    if (RESERVED_USERNAMES.includes(updates.username)) {
      throw new ProfileError('This username is reserved', 'conflict', 409);
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.username, updates.username),
    });
    if (existing && existing.id !== userId) {
      throw new ProfileError('Username is already taken', 'conflict', 409);
    }
    updateData.username = updates.username;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!updatedUser) {
    throw new ProfileError('User not found', 'not_found', 404);
  }

  return {
    user: updatedUser,
    events: [
      {
        type: 'dev.tampa.user.profile_updated',
        payload: { userId, fields: Object.keys(updates) },
        metadata: { userId, source: 'profile' },
      },
    ],
  };
}

// ============== Portfolio ==============

export interface PortfolioItemInput {
  title: string;
  description?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface CreatePortfolioResult {
  item: UserPortfolioItem;
  events: Omit<DomainEvent, 'timestamp'>[];
}

/**
 * List a user's portfolio items, ordered by sortOrder.
 */
export async function listPortfolioItems(
  db: DB,
  userId: string,
): Promise<UserPortfolioItem[]> {
  return db.query.userPortfolioItems.findMany({
    where: eq(userPortfolioItems.userId, userId),
    orderBy: [userPortfolioItems.sortOrder],
  });
}

/**
 * Create a new portfolio item.
 */
export async function createPortfolioItem(
  db: DB,
  userId: string,
  data: PortfolioItemInput,
): Promise<CreatePortfolioResult> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(userPortfolioItems).values({
    id,
    userId,
    title: data.title,
    description: data.description,
    url: data.url,
    imageUrl: data.imageUrl,
    sortOrder: data.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  const item = (await db.query.userPortfolioItems.findFirst({
    where: eq(userPortfolioItems.id, id),
  }))!;

  return {
    item,
    events: [
      {
        type: 'dev.tampa.user.portfolio_item_created',
        payload: { userId, portfolioItemId: id },
        metadata: { userId, source: 'profile' },
      },
    ],
  };
}

/**
 * Update an existing portfolio item. Verifies ownership.
 */
export async function updatePortfolioItem(
  db: DB,
  userId: string,
  itemId: string,
  data: Partial<PortfolioItemInput>,
): Promise<UserPortfolioItem> {
  const existing = await db.query.userPortfolioItems.findFirst({
    where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, userId)),
  });
  if (!existing) {
    throw new ProfileError('Portfolio item not found', 'not_found', 404);
  }

  await db.update(userPortfolioItems)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(userPortfolioItems.id, itemId));

  return (await db.query.userPortfolioItems.findFirst({
    where: eq(userPortfolioItems.id, itemId),
  }))!;
}

/**
 * Delete a portfolio item. Verifies ownership.
 */
export async function deletePortfolioItem(
  db: DB,
  userId: string,
  itemId: string,
): Promise<void> {
  const existing = await db.query.userPortfolioItems.findFirst({
    where: and(eq(userPortfolioItems.id, itemId), eq(userPortfolioItems.userId, userId)),
  });
  if (!existing) {
    throw new ProfileError('Portfolio item not found', 'not_found', 404);
  }

  await db.delete(userPortfolioItems).where(eq(userPortfolioItems.id, itemId));
}

// ============== PAT Management ==============

export interface TokenInfo {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateTokenInput {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export interface CreateTokenResult {
  id: string;
  name: string;
  token: string; // Full token, only shown once
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  events: Omit<DomainEvent, 'timestamp'>[];
}

/**
 * List a user's PATs (without the token value).
 */
export async function listTokens(
  db: DB,
  userId: string,
): Promise<TokenInfo[]> {
  const tokens = await db.query.apiTokens.findMany({
    where: eq(apiTokens.userId, userId),
    orderBy: [apiTokens.createdAt],
  });

  return tokens.map((t) => ({
    id: t.id,
    name: t.name,
    tokenPrefix: t.tokenPrefix,
    scopes: JSON.parse(t.scopes),
    lastUsedAt: t.lastUsedAt,
    expiresAt: t.expiresAt,
    createdAt: t.createdAt,
  }));
}

/**
 * Create a new PAT. The full token is returned only once.
 * Requires admin/superadmin role for 'admin' scope.
 */
export async function createToken(
  db: DB,
  userId: string,
  userRole: string,
  data: CreateTokenInput,
): Promise<CreateTokenResult> {
  // Admin scope requires admin/superadmin role
  if (data.scopes.includes('admin') && userRole !== 'admin' && userRole !== 'superadmin') {
    throw new ProfileError('Admin scope requires admin or superadmin role', 'forbidden', 403);
  }

  // Generate token: td_pat_ + 40 hex chars
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  const tokenHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const fullToken = `td_pat_${tokenHex}`;
  const tokenPrefix = `td_pat_${tokenHex.slice(0, 8)}`;

  // Hash the token with SHA-256 for storage
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = data.expiresInDays
    ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await db.insert(apiTokens).values({
    id,
    userId,
    name: data.name,
    tokenHash,
    tokenPrefix,
    scopes: JSON.stringify(data.scopes),
    expiresAt,
    createdAt: now,
  });

  return {
    id,
    name: data.name,
    token: fullToken,
    tokenPrefix,
    scopes: data.scopes,
    expiresAt,
    createdAt: now,
    events: [
      {
        type: 'dev.tampa.developer.api_token_created',
        payload: { userId, tokenId: id, tokenName: data.name },
        metadata: { userId, source: 'profile' },
      },
    ],
  };
}

/**
 * Revoke (delete) a PAT. Verifies ownership.
 */
export async function revokeToken(
  db: DB,
  userId: string,
  tokenId: string,
): Promise<void> {
  const existing = await db.query.apiTokens.findFirst({
    where: and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)),
  });
  if (!existing) {
    throw new ProfileError('Token not found', 'not_found', 404);
  }

  await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
}
