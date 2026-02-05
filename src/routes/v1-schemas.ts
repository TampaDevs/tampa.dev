/**
 * Shared Zod Schemas for /v1/ API Routes
 *
 * Contains request body schemas, response entity schemas, and helpers
 * for the @hono/zod-openapi route definitions in v1.ts.
 *
 * Organizing schemas separately keeps the route file manageable while
 * enabling full OpenAPI spec generation.
 */

import { z } from '@hono/zod-openapi';

// ============================================================
// Common Response Schemas
// ============================================================

/** Standard error response envelope */
export const ErrorResponseSchema = z.object({
  error: z.string().openapi({ description: 'Human-readable error message' }),
  code: z.string().openapi({ description: 'Machine-readable error code' }),
}).openapi('ErrorResponse');

/** Pagination metadata for list responses */
export const PaginationSchema = z.object({
  total: z.number().optional().openapi({ description: 'Total number of items (may be absent if count is expensive)' }),
  limit: z.number().openapi({ description: 'Maximum items per page' }),
  offset: z.number().openapi({ description: 'Number of items skipped' }),
  hasMore: z.boolean().openapi({ description: 'Whether more items exist beyond this page' }),
}).openapi('Pagination');

// ============================================================
// Common Query Params
// ============================================================

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20).openapi({
    param: { name: 'limit', in: 'query' },
    description: 'Maximum number of items to return (1-100)',
    example: 20,
  }),
  offset: z.coerce.number().min(0).optional().default(0).openapi({
    param: { name: 'offset', in: 'query' },
    description: 'Number of items to skip',
    example: 0,
  }),
});

// ============================================================
// Request Body Schemas
// ============================================================

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  themeColor: z.enum(['coral', 'ocean', 'sunset', 'forest', 'violet', 'rose', 'slate', 'sky']).optional().nullable(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/, 'Invalid username format')
    .transform((val) => val.toLowerCase())
    .optional(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  socialLinks: z.array(z.string().url()).max(5).optional().nullable(),
  showAchievements: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'private']).optional(),
}).openapi('UpdateProfileRequest');

export const PortfolioItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
}).openapi('PortfolioItemRequest');

export const CreateTokenSchema = z.object({
  name: z.string().min(1).max(100).openapi({ description: 'Human-readable name for the token' }),
  scopes: z.array(z.string()).min(1).openapi({ description: 'OAuth scopes to grant to this token' }),
  expiresInDays: z.number().int().min(1).max(365).optional().openapi({ description: 'Token expiry in days (1-365, default: no expiry)' }),
}).openapi('CreateTokenRequest');

// ============================================================
// Entity Schemas
// ============================================================

/** Basic user identity (GET /v1/me) */
export const UserBasicSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string().optional(),
}).openapi('UserBasic');

/** Full user profile (GET /v1/profile) */
export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  heroImageUrl: z.string().nullable(),
  themeColor: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  socialLinks: z.array(z.string()).nullable(),
  role: z.string(),
  profileVisibility: z.enum(['public', 'private']),
  showAchievements: z.boolean().nullable(),
  createdAt: z.string(),
  email: z.string().optional(),
}).openapi('UserProfile');

/** Linked OAuth account */
export const LinkedAccountSchema = z.object({
  provider: z.string(),
  providerUsername: z.string().nullable(),
  providerEmail: z.string().nullable(),
  createdAt: z.string().nullable(),
}).openapi('LinkedAccount');

/** Portfolio item */
export const PortfolioItemResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string().nullable(),
}).openapi('PortfolioItem');

/** Achievement progress */
export const AchievementProgressSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  targetValue: z.number(),
  currentValue: z.number(),
  completedAt: z.string().nullable(),
  badgeSlug: z.string().nullable(),
  hidden: z.boolean(),
}).openapi('AchievementProgress');

/** User badge with rarity info */
export const UserBadgeSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  iconUrl: z.string().nullable().openapi({ description: 'URL to the high-quality emoji image, or null if unavailable' }),
  color: z.string(),
  points: z.number(),
  awardedAt: z.string().nullable(),
  group: z.object({
    id: z.string(),
    name: z.string(),
    urlname: z.string().nullable(),
    photoUrl: z.string().nullable(),
  }).nullable(),
  rarity: z.object({
    tier: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    percentage: z.number(),
  }),
}).openapi('UserBadge');

/** Personal Access Token (list view, no token value) */
export const TokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenPrefix: z.string(),
  scopes: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
}).openapi('Token');

/** Personal Access Token (create response, includes token value) */
export const TokenCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string().openapi({ description: 'Full token value. Store securely — it cannot be retrieved again.' }),
  tokenPrefix: z.string(),
  scopes: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string().nullable(),
}).openapi('TokenCreated');

/** Event in a list */
export const EventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  timezone: z.string().nullable(),
  eventUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
  eventType: z.string().nullable(),
  rsvpCount: z.number().nullable(),
  maxAttendees: z.number().nullable(),
  group: z.object({
    id: z.string(),
    name: z.string(),
    urlname: z.string().nullable(),
  }).nullable(),
}).openapi('EventListItem');

/** RSVP status */
export const RsvpSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled']),
  rsvpAt: z.string().nullable(),
  waitlistPosition: z.number().nullable(),
}).openapi('Rsvp');

/** RSVP summary counts */
export const RsvpSummarySchema = z.object({
  total: z.number(),
  confirmed: z.number(),
  waitlisted: z.number(),
  cancelled: z.number(),
  capacity: z.number().nullable(),
}).openapi('RsvpSummary');

/** Checkin result */
export const CheckinResultSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  checkedInAt: z.string(),
  method: z.string(),
}).openapi('CheckinResult');

/** Group in a list */
export const GroupListItemSchema = z.object({
  id: z.string(),
  urlname: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  website: z.string().nullable(),
  memberCount: z.number().nullable(),
  photoUrl: z.string().nullable(),
  tags: z.any().nullable(),
  socialLinks: z.any().nullable(),
}).openapi('GroupListItem');

/** Group detail with upcoming events */
export const GroupDetailSchema = GroupListItemSchema.extend({
  upcomingEvents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    startTime: z.string(),
    eventUrl: z.string().nullable(),
  })),
}).openapi('GroupDetail');

/** Follower/following entry */
export const FollowEntrySchema = z.object({
  username: z.string().nullable(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  followedAt: z.string().nullable(),
}).openapi('FollowEntry');

/** Badge claim link info */
export const ClaimInfoSchema = z.object({
  badge: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    icon: z.string(),
    iconUrl: z.string().nullable().openapi({ description: 'URL to the high-quality emoji image, or null if unavailable' }),
    color: z.string().nullable(),
    points: z.number(),
  }),
  group: z.object({
    name: z.string(),
    urlname: z.string().nullable(),
    photoUrl: z.string().nullable(),
  }).nullable(),
  claimable: z.boolean(),
  reason: z.string().optional(),
}).openapi('ClaimInfo');

/** OAuth scope */
export const ScopeSchema = z.object({
  name: z.string(),
  description: z.string(),
  implies: z.array(z.string()),
}).openapi('Scope');

// ============================================================
// Common Error Response Definitions (for createRoute responses)
// ============================================================

const jsonContent = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema } } as const,
});

/** Reusable error response definitions for OpenAPI routes */
export const ErrorResponses = {
  401: jsonContent(ErrorResponseSchema, 'Unauthorized — missing or invalid authentication'),
  403: jsonContent(ErrorResponseSchema, 'Forbidden — insufficient scope or permissions'),
  404: jsonContent(ErrorResponseSchema, 'Not Found — resource does not exist'),
  409: jsonContent(ErrorResponseSchema, 'Conflict — duplicate or state conflict'),
  410: jsonContent(ErrorResponseSchema, 'Gone — resource expired or exhausted'),
} as const;

/** Shorthand for authenticated endpoint error responses (401 + 403) */
export const AuthErrors = {
  401: ErrorResponses[401],
  403: ErrorResponses[403],
} as const;

// ============================================================
// Response Wrapper Helpers
// ============================================================

/**
 * Creates a { data: T } response schema for detail/mutation responses.
 */
export function dataResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({ data: schema }),
      },
    },
  } as const;
}

/**
 * Creates a { data: T[], pagination: Pagination } response schema for list responses.
 */
export function listResponse<T extends z.ZodType>(itemSchema: T, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          data: z.array(itemSchema),
          pagination: PaginationSchema,
        }),
      },
    },
  } as const;
}

/**
 * Creates a { data: { success: true } } response schema for action responses.
 */
export function successResponse(description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          data: z.object({ success: z.literal(true) }).passthrough(),
        }),
      },
    },
  } as const;
}
