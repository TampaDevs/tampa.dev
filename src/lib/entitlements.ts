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
