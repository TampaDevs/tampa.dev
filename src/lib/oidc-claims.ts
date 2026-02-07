/**
 * OIDC Claims Builder
 *
 * Builds user claims for the /userinfo endpoint and id_token JWT.
 * Uses the existing hasScope() infrastructure to respect SCOPE_HIERARCHY
 * (e.g., 'admin' implies 'user' implies 'read:user').
 *
 * OAuth consent is treated as explicit authorization to share claims,
 * regardless of profileVisibility. See design decision in .claude/OIDC_SUPPORT.md.
 */

import type { User } from '../db/schema.js';
import { hasScope } from './scopes.js';

/**
 * Build OIDC user claims based on granted scopes.
 *
 * @param user    - The authenticated user record
 * @param scopes  - Granted scopes (null = session auth, unrestricted)
 * @param options - Optional additional data to embed in claims
 * @returns Record of OIDC standard + custom claims
 */
export function buildUserClaims(
  user: User,
  scopes: string[] | null,
  options?: { entitlements?: string[] },
): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    sub: user.id,
  };

  // Profile claims: require 'read:user' scope (implied by 'user', 'profile', 'admin')
  // Session users (scopes === null) get all claims.
  const hasProfileScope = scopes === null || hasScope(scopes, 'read:user');

  if (hasProfileScope) {
    if (user.name) claims.name = user.name;
    claims.preferred_username = user.username;
    if (user.avatarUrl) claims.picture = user.avatarUrl;
    claims.profile = `https://tampa.dev/users/${user.username}`;
    if (user.updatedAt) {
      claims.updated_at = Math.floor(new Date(user.updatedAt).getTime() / 1000);
    }
  }

  // Email claims: require 'user:email' scope (implied by 'user', 'email', 'admin')
  // Session users (scopes === null) get all claims.
  const hasEmailScope = scopes === null || hasScope(scopes, 'user:email');

  if (hasEmailScope && user.email) {
    claims.email = user.email;
    // email_verified: All upstream identity providers (GitHub, Google, LinkedIn,
    // Slack, Meetup, Eventbrite, Apple, Discord) verify email as part of their
    // account creation process. Users cannot self-register without going through
    // an upstream provider.
    claims.email_verified = true;
  }

  // Custom claim: user entitlements (namespaced per OIDC best practices).
  // Gated by read:user scope -- same requirement as the /v1/profile/entitlements endpoint.
  // Uses a URI-namespaced claim name to avoid collisions with standard OIDC claims.
  if (hasProfileScope && options?.entitlements?.length) {
    claims['https://tampa.dev/entitlements'] = options.entitlements;
  }

  return claims;
}
