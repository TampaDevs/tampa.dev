/**
 * Cloudflare Workers types for this project
 */

import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  kv: KVNamespace;
  DB: D1Database;
  OAUTH_KV: KVNamespace;
  UPLOADS_BUCKET: R2Bucket;
  EVENTS_QUEUE: Queue;

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

  // Google OAuth (upstream auth)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;

  // LinkedIn OAuth (upstream auth)
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;

  // Slack OAuth (upstream auth)
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  SLACK_REDIRECT_URI?: string;

  // Meetup OAuth (upstream auth for sign-in)
  MEETUP_OAUTH_CLIENT_ID?: string;
  MEETUP_OAUTH_CLIENT_SECRET?: string;
  MEETUP_REDIRECT_URI?: string;

  // Eventbrite OAuth (upstream auth for sign-in)
  EVENTBRITE_OAUTH_CLIENT_ID?: string;
  EVENTBRITE_OAUTH_CLIENT_SECRET?: string;
  EVENTBRITE_REDIRECT_URI?: string;

  // Apple Sign-In (upstream auth)
  APPLE_CLIENT_ID?: string;       // Service ID
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;     // PEM key for JWT signing
  APPLE_REDIRECT_URI?: string;

  // Session
  SESSION_SECRET?: string;

  // Admin bootstrap
  ADMIN_ALLOWLIST?: string; // Comma-separated GitHub usernames

  // Tampa Devs OAuth Provider config
  OAUTH_AUTHORIZE_URL?: string; // e.g., https://tampa.dev/oauth/authorize

  // Environment identifier (e.g., "staging")
  ENVIRONMENT?: string;

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
