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
  'read:groups': 'Read groups and group details',
  'read:favorites': 'Read your favorite groups',
  'write:favorites': 'Manage your favorite groups',
  'read:portfolio': 'Read your portfolio items',
  'write:portfolio': 'Manage your portfolio items',
  // Admin
  'admin': 'Full admin access',
} as const;

export type Scope = keyof typeof SCOPES;

/** Scope hierarchy: parent scope implies child scopes */
const SCOPE_HIERARCHY: Partial<Record<Scope, Scope[]>> = {
  'user': ['read:user', 'user:email'],
};

/** Expand a list of scopes to include implied child scopes */
export function expandScopes(scopes: string[]): string[] {
  const expanded = new Set(scopes);
  for (const scope of scopes) {
    const implied = SCOPE_HIERARCHY[scope as Scope];
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
