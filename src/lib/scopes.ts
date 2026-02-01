/**
 * OAuth Scope Registry
 *
 * GitHub-style scope hierarchy. The `user` scope implicitly includes
 * `read:user` and `user:email`.
 */

export const SCOPES = {
  // User scopes (GitHub-style hierarchy)
  'user': 'Read/write access to profile info (includes user:email and read:user)',
  'read:user': 'Read your public profile data',
  'user:email': 'Read your email address',
  // Resource scopes
  'read:events': 'Read events and event details',
  'write:events': 'RSVP to events and check in',
  'read:groups': 'Read groups and group details',
  'read:favorites': 'Read your favorite groups',
  'write:favorites': 'Manage your favorite groups',
  'read:portfolio': 'Read your portfolio items',
  'write:portfolio': 'Manage your portfolio items',
  // Management scopes (group owners/managers)
  'manage:groups': 'Manage groups you own or co-manage',
  'manage:events': 'Create and manage events in your groups',
  'manage:checkins': 'Manage checkin codes and view attendees',
  'manage:badges': 'Create, award, and manage group badges',
  // Admin
  'admin': 'Full admin access',
} as const;

export type Scope = keyof typeof SCOPES;

/** Scope hierarchy: parent scope implies child scopes */
export const SCOPE_HIERARCHY: Partial<Record<Scope, Scope[]>> = {
  'user': ['read:user', 'user:email'],
  'manage:groups': ['read:groups'],
  'write:events': ['read:events'],
  'manage:events': ['write:events', 'read:events'],
  'manage:badges': ['read:groups'],
  'admin': ['user', 'read:user', 'user:email', 'read:events', 'write:events', 'read:groups', 'read:favorites', 'write:favorites', 'read:portfolio', 'write:portfolio', 'manage:groups', 'manage:events', 'manage:checkins', 'manage:badges'],
};

/**
 * Legacy scope name aliases.
 * Maps old scope names (from existing OAuth tokens) to their new equivalents.
 * This ensures tokens issued before the scope rename still work.
 */
const LEGACY_SCOPE_ALIASES: Record<string, Scope> = {
  'profile': 'user',
  'events:read': 'read:events',
  'groups:read': 'read:groups',
  'rsvp:read': 'read:events',    // RSVPs are part of event data
  'rsvp:write': 'write:events',   // RSVP write implies event write capability
  'favorites:read': 'read:favorites',
  'favorites:write': 'write:favorites',
};

/** Expand a list of scopes to include implied child scopes and resolve legacy aliases */
export function expandScopes(scopes: string[]): string[] {
  const expanded = new Set<string>();
  for (const scope of scopes) {
    // Resolve legacy alias to new scope name
    const resolved = LEGACY_SCOPE_ALIASES[scope] ?? scope;
    expanded.add(resolved);
    const implied = SCOPE_HIERARCHY[resolved as Scope];
    if (implied) implied.forEach((s) => expanded.add(s));
  }
  return [...expanded];
}

/** Check if granted scopes include a required scope (with hierarchy expansion) */
export function hasScope(granted: string[], required: Scope): boolean {
  const expanded = expandScopes(granted);
  return expanded.includes(required) || expanded.includes('admin');
}

/** Check if granted scopes include any of the required scopes */
export function hasAnyScope(granted: string[], required: Scope[]): boolean {
  return required.some((s) => hasScope(granted, s));
}

/** All scope keys as an array */
export const ALL_SCOPES = Object.keys(SCOPES) as Scope[];
