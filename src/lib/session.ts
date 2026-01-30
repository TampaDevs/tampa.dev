import type { Env } from '../../types/worker';

/**
 * Get the session cookie name for the current environment.
 * Staging uses "session_staging" so prod and staging cookies
 * don't clobber each other on the shared .tampa.dev domain.
 */
export function getSessionCookieName(env: Env): string {
  return env.ENVIRONMENT === 'staging' ? 'session_staging' : 'session';
}
