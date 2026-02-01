/**
 * Default Username Generation
 *
 * Generates unique usernames for new users during registration.
 * Priority: provider username → first-last from name → random fallback.
 * Handles collisions by appending incrementing digits (e.g., john-smith, john-smith1, john-smith2).
 *
 * SECURITY: Never derives usernames from email addresses to avoid PII exposure.
 */

import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import type { Database } from '../db/index.js';

/** Usernames that cannot be assigned. Shared with profile.ts to prevent drift. */
export const RESERVED_USERNAMES = [
  'admin', 'api', 'auth', 'login', 'logout', 'profile', 'settings',
  'help', 'support', 'about', 'tampa', 'tampadevs', 'developer',
  'oauth', 'groups', 'events', 'calendar', 'map', 'favorites',
  'p', 'u', 'user', 'users', 'new', 'edit', 'delete', 'search',
] as const;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Sanitize a raw string into a valid username candidate.
 * Strips non-alphanumeric/hyphen chars, collapses hyphens, trims to length.
 */
export function sanitizeUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')  // replace invalid chars with hyphens
    .replace(/-+/g, '-')           // collapse consecutive hyphens
    .replace(/^-+/, '')            // strip leading hyphens
    .replace(/-+$/, '')            // strip trailing hyphens
    .slice(0, USERNAME_MAX_LENGTH);
}

/**
 * Check if a candidate is a valid, non-reserved username.
 */
function isValidCandidate(candidate: string): boolean {
  return (
    candidate.length >= USERNAME_MIN_LENGTH &&
    candidate.length <= USERNAME_MAX_LENGTH &&
    USERNAME_REGEX.test(candidate) &&
    !RESERVED_USERNAMES.includes(candidate as typeof RESERVED_USERNAMES[number])
  );
}

/**
 * Derive a username candidate from a display name (e.g., "John Smith" → "john-smith").
 */
function fromName(name: string): string | null {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => sanitizeUsername(part))
    .filter((part) => part.length > 0);

  if (parts.length === 0) return null;

  // Use first-last format; if only one part, use it as-is
  const candidate = parts.length >= 2
    ? `${parts[0]}-${parts[parts.length - 1]}`
    : parts[0];

  return isValidCandidate(candidate) ? candidate : null;
}

/**
 * Generate a short random username as a last resort.
 */
function randomFallback(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `user-${hex}`;
}

export interface UsernameOptions {
  name?: string | null;
  providerUsername?: string | null;
}

/**
 * Generate a unique default username for a new user.
 *
 * Priority order:
 * 1. Provider username (GitHub login, etc.) if valid — already public info
 * 2. first-last derived from display name — names are visible on profiles
 * 3. Random fallback (user-XXXXXXXX) — no PII
 *
 * Appends incrementing digits on collision (e.g., john-smith, john-smith1, john-smith2).
 */
export async function generateDefaultUsername(
  db: Database,
  options: UsernameOptions,
): Promise<string> {
  const candidates: string[] = [];

  // Priority 1: provider username (already public info from OAuth provider)
  if (options.providerUsername) {
    const sanitized = sanitizeUsername(options.providerUsername);
    if (isValidCandidate(sanitized)) {
      candidates.push(sanitized);
    }
  }

  // Priority 2: name-derived (first-last format)
  if (options.name) {
    const nameBased = fromName(options.name);
    if (nameBased) candidates.push(nameBased);
  }

  // Priority 3: random fallback (always valid, no PII)
  candidates.push(randomFallback());

  // Try each candidate, resolving collisions with digit suffixes
  for (const base of candidates) {
    const result = await resolveCollision(db, base);
    if (result) return result;
  }

  // Should never reach here since randomFallback is highly unlikely to collide,
  // but just in case, generate another random one
  return resolveCollision(db, randomFallback()) as Promise<string>;
}

/**
 * Try to find a unique username starting from `base`, appending 1, 2, 3... on collision.
 * Returns null if we exhaust 100 attempts (move to next candidate).
 */
async function resolveCollision(db: Database, base: string): Promise<string | null> {
  // Try the base first
  const existing = await db.query.users.findFirst({
    where: eq(users.username, base),
  });
  if (!existing) return base;

  // Try base1, base2, ... up to base99
  for (let i = 1; i <= 99; i++) {
    const suffixed = `${base}${i}`;
    if (suffixed.length > USERNAME_MAX_LENGTH) break;
    if (!isValidCandidate(suffixed)) continue;

    const exists = await db.query.users.findFirst({
      where: eq(users.username, suffixed),
    });
    if (!exists) return suffixed;
  }

  return null;
}
