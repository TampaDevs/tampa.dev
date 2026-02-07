/**
 * OAuth Client Secret Hashing
 *
 * The @cloudflare/workers-oauth-provider library expects client secrets
 * to be stored as SHA-256 hex hashes. When validating client authentication,
 * the library hashes the incoming secret and compares it to the stored value.
 *
 * This module provides hashing utilities that match the library's format.
 */

/**
 * Hash a client secret using SHA-256, matching @cloudflare/workers-oauth-provider format.
 *
 * The library expects stored secrets to be 64-character hex-encoded SHA-256 hashes.
 * When a client authenticates, the library hashes the provided secret and compares
 * it against the stored hash.
 *
 * @param secret - The plaintext client secret (e.g., "tds_abc123...")
 * @returns A 64-character hex string representing the SHA-256 hash
 */
export async function hashClientSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
