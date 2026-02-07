/**
 * Entitlement Check Helper
 *
 * Checks whether a user has a given entitlement (feature gate).
 */

import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { userEntitlements } from '../db/schema.js';

/**
 * Check if a user has a specific entitlement
 */
export async function hasEntitlement(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  entitlement: string
): Promise<boolean> {
  const record = await db.query.userEntitlements.findFirst({
    where: and(
      eq(userEntitlements.userId, userId),
      eq(userEntitlements.entitlement, entitlement)
    ),
  });

  if (!record) return false;

  // Check expiration
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Grant an entitlement to a user (idempotent - won't duplicate)
 */
export async function grantEntitlement(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  entitlement: string,
  source: string = 'system',
  expiresAt?: string
): Promise<void> {
  // Check if already granted
  const existing = await db.query.userEntitlements.findFirst({
    where: and(
      eq(userEntitlements.userId, userId),
      eq(userEntitlements.entitlement, entitlement)
    ),
  });

  if (existing) return;

  await db.insert(userEntitlements).values({
    id: crypto.randomUUID(),
    userId,
    entitlement,
    source,
    expiresAt: expiresAt ?? null,
    grantedAt: new Date().toISOString(),
  });
}

/**
 * Get all active (non-expired) entitlements for a user.
 * Returns an array of entitlement strings (e.g., 'dev.tampa.group.create').
 */
export async function getActiveEntitlements(
  db: ReturnType<typeof createDatabase>,
  userId: string,
): Promise<string[]> {
  const records = await db.query.userEntitlements.findMany({
    where: eq(userEntitlements.userId, userId),
  });
  const now = new Date();
  return records
    .filter(r => !r.expiresAt || new Date(r.expiresAt) >= now)
    .map(r => r.entitlement);
}

/**
 * Consume (use and delete) an entitlement from a user.
 * Returns true if the entitlement existed, was valid, and was consumed.
 * Returns false if the entitlement was not found or expired.
 */
export async function consumeEntitlement(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  entitlement: string
): Promise<boolean> {
  const record = await db.query.userEntitlements.findFirst({
    where: and(
      eq(userEntitlements.userId, userId),
      eq(userEntitlements.entitlement, entitlement)
    ),
  });

  if (!record) return false;

  // Check expiration
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return false;
  }

  // Delete (consume) the entitlement
  await db.delete(userEntitlements).where(eq(userEntitlements.id, record.id));

  return true;
}
