/**
 * Cloudflare Workers types for this project
 */

import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  kv: KVNamespace;
  DB: D1Database;
  OAUTH_KV: KVNamespace;
  UPLOADS_BUCKET: R2Bucket;

  // OAuth Provider helpers (injected by OAuthProvider wrapper)
  OAUTH_PROVIDER: OAuthHelpers;

  // Meetup OAuth
  MEETUP_CLIENT_KEY?: string;
  MEETUP_SIGNING_KEY?: string;
  MEETUP_MEMBER_ID?: string;

  // Eventbrite
  EVENTBRITE_PRIVATE_TOKEN?: string;
  EVENTBRITE_ORGANIZATION_ID?: string;

  // Luma
  LUMA_API_KEY?: string;
  LUMA_CALENDAR_ID?: string;

  // GitHub OAuth (upstream auth)
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;

  // Session
  SESSION_SECRET?: string;

  // Admin bootstrap
  ADMIN_ALLOWLIST?: string; // Comma-separated GitHub usernames

  // Tampa Devs OAuth Provider config
  OAUTH_AUTHORIZE_URL?: string; // e.g., https://tampa.dev/oauth/authorize

  // R2 uploads
  UPLOADS_PUBLIC_URL?: string; // e.g., https://uploads.tampa.dev or R2 public bucket URL
  UPLOADS_PUBLIC_BUCKET_NAME?: string; // R2 bucket name (defaults to 'tampa-dev-uploads-public')

  // R2 S3-compatible API credentials (for presigned URLs)
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

/**
 * Tampa Devs OAuth scopes
 */
export const TAMPA_DEVS_SCOPES = {
  PROFILE: 'profile',           // Read user profile (name, email, avatar)
  EVENTS_READ: 'events:read',   // Read events and calendar data
  GROUPS_READ: 'groups:read',   // Read groups data
  RSVP_WRITE: 'rsvp:write',     // RSVP to events (future)
} as const;

export type TampaDevsScope = typeof TAMPA_DEVS_SCOPES[keyof typeof TAMPA_DEVS_SCOPES];
