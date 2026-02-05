/**
 * /v1/ API Routes -- OpenAPI-documented
 *
 * The authenticated API for third-party apps and Personal Access Tokens.
 * All endpoints use getCurrentUser() for tri-auth (PAT, OAuth, session).
 * All responses use standardized envelopes from src/lib/responses.ts.
 *
 * Routes are defined with @hono/zod-openapi's createRoute() for automatic
 * OpenAPI spec generation at /openapi.json.
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, and, desc, gte, count, inArray, sql } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import {
  users,
  groups,
  events,
  userIdentities,
  userFollows,
  eventCheckinCodes,
  eventCheckins,
  eventRsvps,
  achievements,
  achievementProgress,
  userEntitlements,
} from '../db/schema.js';
import { getCurrentUser, requireScope, isPlatformAdmin } from '../lib/auth.js';
import { SCOPES, SCOPE_HIERARCHY, type Scope } from '../lib/scopes.js';
import {
  ok, created, list, success, noContent,
  unauthorized, forbidden, notFound, conflict, gone, badRequest,
  parsePagination,
} from '../lib/responses.js';
import { emitEvent, emitEvents } from '../lib/event-bus.js';
import type { Env } from '../../types/worker.js';

// Service imports
import {
  createRsvp, cancelRsvp, getRsvpStatus, getRsvpSummary,
  RsvpError,
} from '../services/rsvp.js';
import {
  listFavorites, addFavorite, removeFavorite,
  FavoriteError,
} from '../services/favorites.js';
import {
  updateProfile, listPortfolioItems, createPortfolioItem,
  updatePortfolioItem, deletePortfolioItem,
  listTokens, createToken, revokeToken,
  ProfileError,
} from '../services/profile.js';
import {
  getClaimInfo, claimBadge,
  ClaimError,
} from '../services/claims.js';

// OpenAPI schema imports
import {
  PaginationQuerySchema,
  UpdateProfileSchema,
  PortfolioItemSchema,
  CreateTokenSchema,
  UserBasicSchema,
  UserProfileSchema,
  LinkedAccountSchema,
  PortfolioItemResponseSchema,
  AchievementProgressSchema,
  TokenSchema,
  TokenCreatedSchema,
  EventListItemSchema,
  RsvpSchema,
  RsvpSummarySchema,
  CheckinResultSchema,
  GroupListItemSchema,
  GroupDetailSchema,
  FollowEntrySchema,
  ClaimInfoSchema,
  ScopeSchema,
  AuthErrors,
  ErrorResponses,
  dataResponse,
  listResponse,
  successResponse,
} from './v1-schemas.js';

// ============================================================
// Helper: Map service errors to HTTP responses
// ============================================================

function handleServiceError(
  c: { json: (data: unknown, status: number) => Response },
  err: unknown,
): Response {
  if (err instanceof RsvpError || err instanceof FavoriteError || err instanceof ProfileError || err instanceof ClaimError) {
    const codeMap: Record<string, string> = {
      not_found: 'not_found',
      conflict: 'conflict',
      gone: 'gone',
      bad_request: 'bad_request',
      forbidden: 'forbidden',
    };
    return c.json({ error: err.message, code: codeMap[err.code] ?? err.code }, err.status);
  }
  throw err;
}

// ============================================================
// Helper: Normalize social links from DB
// ============================================================

function normalizeSocialLinks(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    return null;
  } catch { return null; }
}

// ============================================================
// Route Definitions & Handlers
// ============================================================

function createV1Routes() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  // ============================================================
  // User & Profile
  // ============================================================

  /**
   * GET /v1/me -- Basic identity
   */
  const getMeRoute = createRoute({
    method: 'get',
    path: '/me',
    summary: 'Get current user identity',
    description: 'Returns basic identity information for the authenticated user. Email is included only if the `user:email` scope is granted.',
    tags: ['User'],
    security: [{ BearerToken: ['read:user'] }],
    responses: {
      200: dataResponse(UserBasicSchema, 'Current user identity'),
      ...AuthErrors,
    },
  });

  app.openapi(getMeRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const { user } = auth;

    const result: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      username: user.username,
    };

    // Only include email if user:email scope is granted (or session auth)
    if (auth.scopes === null || (auth.scopes && requireScope(auth, 'user:email', c) === null)) {
      result.email = user.email;
    }

    return ok(c, result);
  });

  /**
   * GET /v1/profile -- Full user profile
   */
  const getProfileRoute = createRoute({
    method: 'get',
    path: '/profile',
    summary: 'Get current user profile',
    description: 'Returns the full profile for the authenticated user including bio, social links, and settings.',
    tags: ['User'],
    security: [{ BearerToken: ['read:user'] }],
    responses: {
      200: dataResponse(UserProfileSchema, 'Full user profile'),
      ...AuthErrors,
    },
  });

  app.openapi(getProfileRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const { user } = auth;

    const result: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      heroImageUrl: user.heroImageUrl,
      themeColor: user.themeColor,
      bio: user.bio,
      location: user.location,
      socialLinks: normalizeSocialLinks(user.socialLinks),
      role: user.role,
      profileVisibility: user.profileVisibility,
      showAchievements: user.showAchievements,
      createdAt: user.createdAt,
    };

    // Only include email if user:email scope is granted (or session auth)
    if (auth.scopes === null || (auth.scopes && requireScope(auth, 'user:email', c) === null)) {
      result.email = user.email;
    }

    return ok(c, result);
  });

  /**
   * PATCH /v1/profile -- Update current user's profile
   */
  const updateProfileRoute = createRoute({
    method: 'patch',
    path: '/profile',
    summary: 'Update current user profile',
    description: 'Updates the authenticated user\'s profile fields. Only provided fields are updated.',
    tags: ['User'],
    security: [{ BearerToken: ['user'] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: UpdateProfileSchema,
          },
        },
      },
    },
    responses: {
      200: dataResponse(UserProfileSchema, 'Updated user profile'),
      ...AuthErrors,
      409: ErrorResponses[409],
    },
  });

  app.openapi(updateProfileRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const updates = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    try {
      const result = await updateProfile(db, auth.user.id, updates);
      for (const event of result.events) emitEvent(c, event);

      const { user } = result;
      const data: Record<string, unknown> = {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        heroImageUrl: user.heroImageUrl,
        themeColor: user.themeColor,
        bio: user.bio,
        location: user.location,
        socialLinks: normalizeSocialLinks(user.socialLinks),
        role: user.role,
        profileVisibility: user.profileVisibility,
        showAchievements: user.showAchievements,
        createdAt: user.createdAt,
      };

      if (auth.scopes === null || (auth.scopes && requireScope(auth, 'user:email', c) === null)) {
        data.email = user.email;
      }

      return ok(c, data);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * GET /v1/me/linked-accounts -- Connected OAuth providers
   */
  const getLinkedAccountsRoute = createRoute({
    method: 'get',
    path: '/me/linked-accounts',
    summary: 'List linked OAuth accounts',
    description: 'Returns the OAuth providers (GitHub, Discord, etc.) connected to the authenticated user\'s account.',
    tags: ['User'],
    security: [{ BearerToken: ['read:user'] }],
    responses: {
      200: dataResponse(z.array(LinkedAccountSchema), 'Linked OAuth accounts'),
      ...AuthErrors,
    },
  });

  app.openapi(getLinkedAccountsRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const identities = await db.query.userIdentities.findMany({
      where: eq(userIdentities.userId, auth.user.id),
    });

    return ok(c, identities.map((id) => ({
      provider: id.provider,
      providerUsername: id.providerUsername,
      providerEmail: id.providerEmail,
      createdAt: id.createdAt,
    })));
  });

  // ============================================================
  // Profile - Portfolio
  // ============================================================

  /**
   * GET /v1/profile/portfolio -- List portfolio items
   */
  const listPortfolioRoute = createRoute({
    method: 'get',
    path: '/profile/portfolio',
    summary: 'List portfolio items',
    description: 'Returns all portfolio items for the authenticated user, ordered by sort order.',
    tags: ['User'],
    security: [{ BearerToken: ['read:portfolio'] }],
    responses: {
      200: dataResponse(z.array(PortfolioItemResponseSchema), 'Portfolio items'),
      ...AuthErrors,
    },
  });

  app.openapi(listPortfolioRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:portfolio', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const items = await listPortfolioItems(db, auth.user.id);

    return ok(c, items);
  });

  /**
   * POST /v1/profile/portfolio -- Create portfolio item
   */
  const createPortfolioItemRoute = createRoute({
    method: 'post',
    path: '/profile/portfolio',
    summary: 'Create portfolio item',
    description: 'Adds a new portfolio item to the authenticated user\'s profile.',
    tags: ['User'],
    security: [{ BearerToken: ['write:portfolio'] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: PortfolioItemSchema,
          },
        },
      },
    },
    responses: {
      201: dataResponse(PortfolioItemResponseSchema, 'Created portfolio item'),
      ...AuthErrors,
    },
  });

  app.openapi(createPortfolioItemRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:portfolio', c);
    if (scopeErr) return scopeErr;

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    const result = await createPortfolioItem(db, auth.user.id, data);
    for (const event of result.events) emitEvent(c, event);

    return created(c, result.item);
  });

  /**
   * PATCH /v1/profile/portfolio/:id -- Update portfolio item
   */
  const updatePortfolioItemRoute = createRoute({
    method: 'patch',
    path: '/profile/portfolio/{id}',
    summary: 'Update portfolio item',
    description: 'Updates an existing portfolio item. Only provided fields are changed.',
    tags: ['User'],
    security: [{ BearerToken: ['write:portfolio'] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Portfolio item ID' }),
      }),
      body: {
        content: {
          'application/json': {
            schema: PortfolioItemSchema.partial().openapi('PortfolioItemUpdateRequest'),
          },
        },
      },
    },
    responses: {
      200: dataResponse(PortfolioItemResponseSchema, 'Updated portfolio item'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(updatePortfolioItemRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:portfolio', c);
    if (scopeErr) return scopeErr;

    const itemId = c.req.param('id');
    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    try {
      const item = await updatePortfolioItem(db, auth.user.id, itemId, data);
      return ok(c, item);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * DELETE /v1/profile/portfolio/:id -- Delete portfolio item
   */
  const deletePortfolioItemRoute = createRoute({
    method: 'delete',
    path: '/profile/portfolio/{id}',
    summary: 'Delete portfolio item',
    description: 'Permanently removes a portfolio item from the authenticated user\'s profile.',
    tags: ['User'],
    security: [{ BearerToken: ['write:portfolio'] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Portfolio item ID' }),
      }),
    },
    responses: {
      204: { description: 'Portfolio item deleted' },
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(deletePortfolioItemRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:portfolio', c);
    if (scopeErr) return scopeErr;

    const itemId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    try {
      await deletePortfolioItem(db, auth.user.id, itemId);
      return noContent(c);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  // ============================================================
  // Profile - Achievements
  // ============================================================

  /**
   * GET /v1/profile/achievements -- Achievement progress
   */
  const listAchievementsRoute = createRoute({
    method: 'get',
    path: '/profile/achievements',
    summary: 'Get achievement progress',
    description: 'Returns all achievements with the authenticated user\'s progress toward each.',
    tags: ['User'],
    security: [{ BearerToken: ['read:user'] }],
    responses: {
      200: dataResponse(z.array(AchievementProgressSchema), 'Achievement progress'),
      ...AuthErrors,
    },
  });

  app.openapi(listAchievementsRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);

    const [allAchievements, progress] = await Promise.all([
      db.query.achievements.findMany({
        orderBy: [achievements.sortOrder],
      }),
      db.query.achievementProgress.findMany({
        where: eq(achievementProgress.userId, auth.user.id),
      }),
    ]);

    const result = allAchievements.map((def) => {
      const p = progress.find((prog) => prog.achievementKey === def.key);
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        color: def.color,
        targetValue: def.targetValue,
        currentValue: p?.currentValue ?? 0,
        completedAt: p?.completedAt ?? null,
        badgeSlug: def.badgeSlug ?? null,
        hidden: def.hidden === 1,
      };
    });

    return ok(c, result);
  });

  // ============================================================
  // Profile - PAT Management
  // ============================================================

  /**
   * GET /v1/profile/tokens -- List Personal Access Tokens
   */
  const listTokensRoute = createRoute({
    method: 'get',
    path: '/profile/tokens',
    summary: 'List personal access tokens',
    description: 'Returns all personal access tokens for the authenticated user. Token values are not included.',
    tags: ['User'],
    security: [{ BearerToken: ['user'] }],
    responses: {
      200: dataResponse(z.array(TokenSchema), 'Personal access tokens'),
      ...AuthErrors,
    },
  });

  app.openapi(listTokensRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const tokens = await listTokens(db, auth.user.id);

    return ok(c, tokens);
  });

  /**
   * POST /v1/profile/tokens -- Create Personal Access Token
   */
  const createTokenRoute = createRoute({
    method: 'post',
    path: '/profile/tokens',
    summary: 'Create personal access token',
    description: 'Creates a new personal access token. The full token value is returned only once in the response -- store it securely.',
    tags: ['User'],
    security: [{ BearerToken: ['user'] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateTokenSchema,
          },
        },
      },
    },
    responses: {
      201: dataResponse(TokenCreatedSchema, 'Created token with full value'),
      ...AuthErrors,
    },
  });

  app.openapi(createTokenRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const data = c.req.valid('json');
    const db = createDatabase(c.env.DB);

    try {
      const result = await createToken(db, auth.user.id, auth.user.role, data);
      for (const event of result.events) emitEvent(c, event);

      return created(c, {
        id: result.id,
        name: result.name,
        token: result.token,
        tokenPrefix: result.tokenPrefix,
        scopes: result.scopes,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * DELETE /v1/profile/tokens/:id -- Revoke a Personal Access Token
   */
  const deleteTokenRoute = createRoute({
    method: 'delete',
    path: '/profile/tokens/{id}',
    summary: 'Revoke personal access token',
    description: 'Permanently revokes a personal access token. The token can no longer be used for authentication.',
    tags: ['User'],
    security: [{ BearerToken: ['user'] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'Token ID' }),
      }),
    },
    responses: {
      204: { description: 'Token revoked' },
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(deleteTokenRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const tokenId = c.req.param('id');
    const db = createDatabase(c.env.DB);

    try {
      await revokeToken(db, auth.user.id, tokenId);
      return noContent(c);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  // ============================================================
  // Events
  // ============================================================

  /**
   * GET /v1/events -- List upcoming events
   */
  const listEventsRoute = createRoute({
    method: 'get',
    path: '/events',
    summary: 'List upcoming events',
    description: 'Returns a paginated list of upcoming events across all groups, ordered by start time.',
    tags: ['Events'],
    security: [{ BearerToken: ['read:events'] }],
    request: {
      query: PaginationQuerySchema,
    },
    responses: {
      200: listResponse(EventListItemSchema, 'Upcoming events'),
      ...AuthErrors,
    },
  });

  app.openapi(listEventsRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:events', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const { limit, offset } = parsePagination(c);

    // Get upcoming events
    const now = new Date().toISOString();
    const upcomingEvents = await db.query.events.findMany({
      where: gte(events.startTime, now),
      orderBy: [events.startTime],
      limit,
      offset,
    });

    // Get group info for each event
    const groupIds = [...new Set(upcomingEvents.map((e) => e.groupId))];
    const groupsData = groupIds.length > 0
      ? await db.query.groups.findMany({
          where: inArray(groups.id, groupIds),
        })
      : [];
    const groupMap = new Map(groupsData.map((g) => [g.id, g]));

    return list(
      c,
      upcomingEvents.map((event) => {
        const group = groupMap.get(event.groupId);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          eventUrl: event.eventUrl,
          photoUrl: event.photoUrl,
          eventType: event.eventType,
          rsvpCount: event.rsvpCount,
          maxAttendees: event.maxAttendees,
          group: group ? {
            id: group.id,
            name: group.name,
            urlname: group.urlname,
          } : null,
        };
      }),
      { limit, offset },
    );
  });

  // ============================================================
  // Events - RSVP
  // ============================================================

  /**
   * GET /v1/events/:eventId/rsvp -- Current user's RSVP status
   */
  const getRsvpRoute = createRoute({
    method: 'get',
    path: '/events/{eventId}/rsvp',
    summary: 'Get RSVP status',
    description: 'Returns the authenticated user\'s RSVP status for the specified event.',
    tags: ['Events'],
    security: [{ BearerToken: ['read:events'] }],
    request: {
      params: z.object({
        eventId: z.string().openapi({ description: 'Event ID' }),
      }),
    },
    responses: {
      200: dataResponse(
        z.object({ rsvp: RsvpSchema.nullable() }).openapi('RsvpStatusResponse'),
        'RSVP status (null if not RSVPed)',
      ),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(getRsvpRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:events', c);
    if (scopeErr) return scopeErr;

    const eventId = c.req.param('eventId');
    const db = createDatabase(c.env.DB);

    try {
      const result = await getRsvpStatus(db, auth.user.id, eventId);
      return ok(c, { rsvp: result.rsvp });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * GET /v1/events/:eventId/rsvp-summary -- RSVP counts for an event
   */
  const getRsvpSummaryRoute = createRoute({
    method: 'get',
    path: '/events/{eventId}/rsvp-summary',
    summary: 'Get RSVP summary',
    description: 'Returns aggregate RSVP counts (confirmed, waitlisted, cancelled) for the specified event.',
    tags: ['Events'],
    security: [{ BearerToken: ['read:events'] }],
    request: {
      params: z.object({
        eventId: z.string().openapi({ description: 'Event ID' }),
      }),
    },
    responses: {
      200: dataResponse(RsvpSummarySchema, 'RSVP summary counts'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(getRsvpSummaryRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:events', c);
    if (scopeErr) return scopeErr;

    const eventId = c.req.param('eventId');
    const db = createDatabase(c.env.DB);

    try {
      const summary = await getRsvpSummary(db, eventId);
      return ok(c, summary);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * POST /v1/events/:eventId/rsvp -- RSVP to an event
   */
  const createRsvpRoute = createRoute({
    method: 'post',
    path: '/events/{eventId}/rsvp',
    summary: 'RSVP to event',
    description: 'Creates an RSVP for the authenticated user. If the event is at capacity, the user is placed on the waitlist.',
    tags: ['Events'],
    security: [{ BearerToken: ['write:events'] }],
    request: {
      params: z.object({
        eventId: z.string().openapi({ description: 'Event ID' }),
      }),
    },
    responses: {
      201: dataResponse(RsvpSchema, 'RSVP created'),
      ...AuthErrors,
      404: ErrorResponses[404],
      409: ErrorResponses[409],
    },
  });

  app.openapi(createRsvpRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:events', c);
    if (scopeErr) return scopeErr;

    const eventId = c.req.param('eventId');
    const db = createDatabase(c.env.DB);

    try {
      const result = await createRsvp(db, auth.user.id, eventId);
      emitEvents(c, result.events);
      return created(c, {
        id: result.rsvp.id,
        eventId: result.rsvp.eventId,
        status: result.rsvp.status,
        rsvpAt: result.rsvp.rsvpAt,
        waitlistPosition: result.rsvp.waitlistPosition,
      });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * DELETE /v1/events/:eventId/rsvp -- Cancel RSVP
   */
  const cancelRsvpRoute = createRoute({
    method: 'delete',
    path: '/events/{eventId}/rsvp',
    summary: 'Cancel RSVP',
    description: 'Cancels the authenticated user\'s RSVP. If a waitlisted user exists, they are automatically promoted.',
    tags: ['Events'],
    security: [{ BearerToken: ['write:events'] }],
    request: {
      params: z.object({
        eventId: z.string().openapi({ description: 'Event ID' }),
      }),
    },
    responses: {
      200: successResponse('RSVP cancelled'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(cancelRsvpRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:events', c);
    if (scopeErr) return scopeErr;

    const eventId = c.req.param('eventId');
    const db = createDatabase(c.env.DB);

    try {
      const result = await cancelRsvp(db, auth.user.id, eventId);
      emitEvents(c, result.events);
      return success(c, { promotedUserId: result.promotedUserId });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * POST /v1/checkin/:code -- Self check-in to an event
   */
  const checkinRoute = createRoute({
    method: 'post',
    path: '/checkin/{code}',
    summary: 'Check in to event',
    description: 'Self check-in using a check-in code. Optionally specify the check-in method (link, qr, nfc).',
    tags: ['Events'],
    security: [{ BearerToken: ['write:events'] }],
    request: {
      params: z.object({
        code: z.string().openapi({ description: 'Check-in code' }),
      }),
    },
    responses: {
      201: dataResponse(CheckinResultSchema, 'Check-in recorded'),
      ...AuthErrors,
      404: ErrorResponses[404],
      409: ErrorResponses[409],
      410: ErrorResponses[410],
    },
  });

  app.openapi(checkinRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:events', c);
    if (scopeErr) return scopeErr;

    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    // Look up the checkin code
    const checkinCode = await db.query.eventCheckinCodes.findFirst({
      where: eq(eventCheckinCodes.code, code),
    });
    if (!checkinCode) {
      return notFound(c, 'Checkin code not found');
    }

    // Check expiration
    if (checkinCode.expiresAt && new Date(checkinCode.expiresAt) < new Date()) {
      return gone(c, 'This checkin code has expired');
    }

    // Check usage limit
    if (checkinCode.maxUses !== null && checkinCode.currentUses >= checkinCode.maxUses) {
      return gone(c, 'This checkin code has reached its usage limit');
    }

    // Check if user already checked in
    const existing = await db.query.eventCheckins.findFirst({
      where: and(
        eq(eventCheckins.eventId, checkinCode.eventId),
        eq(eventCheckins.userId, auth.user.id),
      ),
    });
    if (existing) {
      return conflict(c, 'Already checked in to this event');
    }

    // Parse optional method from body
    let method = 'link';
    try {
      const body = await c.req.json();
      if (body?.method && ['link', 'qr', 'nfc'].includes(body.method)) {
        method = body.method;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Insert checkin
    const checkinId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(eventCheckins).values({
      id: checkinId,
      eventId: checkinCode.eventId,
      userId: auth.user.id,
      checkinCodeId: checkinCode.id,
      method,
      checkedInAt: now,
    });

    // Atomically increment usage counter
    await db.update(eventCheckinCodes)
      .set({ currentUses: sql`${eventCheckinCodes.currentUses} + 1` })
      .where(eq(eventCheckinCodes.id, checkinCode.id));

    // Emit checkin event
    emitEvent(c, {
      type: 'dev.tampa.event.checkin',
      payload: {
        eventId: checkinCode.eventId,
        userId: auth.user.id,
        checkinCodeId: checkinCode.id,
        method,
      },
      metadata: { userId: auth.user.id, source: 'checkin' },
    });

    return created(c, {
      id: checkinId,
      eventId: checkinCode.eventId,
      checkedInAt: now,
      method,
    });
  });

  // ============================================================
  // Groups
  // ============================================================

  /**
   * GET /v1/groups -- List groups
   */
  const listGroupsRoute = createRoute({
    method: 'get',
    path: '/groups',
    summary: 'List groups',
    description: 'Returns a paginated list of groups displayed on the site, ordered by member count.',
    tags: ['Groups'],
    security: [{ BearerToken: ['read:groups'] }],
    request: {
      query: PaginationQuerySchema,
    },
    responses: {
      200: listResponse(GroupListItemSchema, 'Groups'),
      ...AuthErrors,
    },
  });

  app.openapi(listGroupsRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:groups', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const { limit, offset } = parsePagination(c, { limit: 50 });

    const allGroups = await db.query.groups.findMany({
      where: eq(groups.displayOnSite, true),
      orderBy: [desc(groups.memberCount)],
      limit,
      offset,
    });

    return list(
      c,
      allGroups.map((group) => ({
        id: group.id,
        urlname: group.urlname,
        name: group.name,
        description: group.description,
        link: group.link,
        website: group.website,
        memberCount: group.memberCount,
        photoUrl: group.photoUrl,
        tags: group.tags ? JSON.parse(group.tags) : null,
        socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      })),
      { limit, offset },
    );
  });

  /**
   * GET /v1/groups/:slug -- Get a specific group
   */
  const getGroupRoute = createRoute({
    method: 'get',
    path: '/groups/{slug}',
    summary: 'Get group details',
    description: 'Returns detailed information about a group including its upcoming events.',
    tags: ['Groups'],
    security: [{ BearerToken: ['read:groups'] }],
    request: {
      params: z.object({
        slug: z.string().openapi({ description: 'Group URL slug (urlname)' }),
      }),
    },
    responses: {
      200: dataResponse(GroupDetailSchema, 'Group details with upcoming events'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(getGroupRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:groups', c);
    if (scopeErr) return scopeErr;

    const slug = c.req.param('slug');
    const db = createDatabase(c.env.DB);

    const group = await db.query.groups.findFirst({
      where: eq(groups.urlname, slug),
    });

    if (!group) {
      return notFound(c, 'Group not found');
    }

    // Get upcoming events for this group
    const groupEvents = await db.query.events.findMany({
      where: eq(events.groupId, group.id),
      orderBy: [events.startTime],
      limit: 10,
    });

    return ok(c, {
      id: group.id,
      urlname: group.urlname,
      name: group.name,
      description: group.description,
      link: group.link,
      website: group.website,
      memberCount: group.memberCount,
      photoUrl: group.photoUrl,
      tags: group.tags ? JSON.parse(group.tags) : null,
      socialLinks: group.socialLinks ? JSON.parse(group.socialLinks) : null,
      upcomingEvents: groupEvents.map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        eventUrl: event.eventUrl,
      })),
    });
  });

  // ============================================================
  // Favorites
  // ============================================================

  /**
   * GET /v1/favorites -- List user's favorite groups
   */
  const listFavoritesRoute = createRoute({
    method: 'get',
    path: '/favorites',
    summary: 'List favorite groups',
    description: 'Returns the groups the authenticated user has favorited.',
    tags: ['Groups'],
    security: [{ BearerToken: ['read:favorites'] }],
    responses: {
      200: dataResponse(z.array(z.any()), 'Favorite groups'),
      ...AuthErrors,
    },
  });

  app.openapi(listFavoritesRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:favorites', c);
    if (scopeErr) return scopeErr;

    const db = createDatabase(c.env.DB);
    const favorites = await listFavorites(db, auth.user.id);

    return ok(c, favorites);
  });

  /**
   * POST /v1/favorites/:groupSlug -- Add a group to favorites
   */
  const addFavoriteRoute = createRoute({
    method: 'post',
    path: '/favorites/{groupSlug}',
    summary: 'Add group to favorites',
    description: 'Adds a group to the authenticated user\'s favorites. Returns 200 if already favorited.',
    tags: ['Groups'],
    security: [{ BearerToken: ['write:favorites'] }],
    request: {
      params: z.object({
        groupSlug: z.string().openapi({ description: 'Group URL slug' }),
      }),
    },
    responses: {
      201: dataResponse(z.object({ groupSlug: z.string() }), 'Group added to favorites'),
      200: dataResponse(z.object({ alreadyFavorited: z.boolean() }), 'Already favorited'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(addFavoriteRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:favorites', c);
    if (scopeErr) return scopeErr;

    const groupSlug = c.req.param('groupSlug');
    const db = createDatabase(c.env.DB);

    try {
      const result = await addFavorite(db, auth.user.id, groupSlug);
      emitEvents(c, result.events);

      if (result.alreadyExisted) {
        return ok(c, { alreadyFavorited: true });
      }
      return created(c, { groupSlug });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * DELETE /v1/favorites/:groupSlug -- Remove a group from favorites
   */
  const removeFavoriteRoute = createRoute({
    method: 'delete',
    path: '/favorites/{groupSlug}',
    summary: 'Remove group from favorites',
    description: 'Removes a group from the authenticated user\'s favorites.',
    tags: ['Groups'],
    security: [{ BearerToken: ['write:favorites'] }],
    request: {
      params: z.object({
        groupSlug: z.string().openapi({ description: 'Group URL slug' }),
      }),
    },
    responses: {
      204: { description: 'Favorite removed' },
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(removeFavoriteRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'write:favorites', c);
    if (scopeErr) return scopeErr;

    const groupSlug = c.req.param('groupSlug');
    const db = createDatabase(c.env.DB);

    try {
      const result = await removeFavorite(db, auth.user.id, groupSlug);
      emitEvents(c, result.events);
      return noContent(c);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  // ============================================================
  // Follows
  // ============================================================

  /**
   * POST /v1/users/:username/follow -- Follow a user
   */
  const followUserRoute = createRoute({
    method: 'post',
    path: '/users/{username}/follow',
    summary: 'Follow user',
    description: 'Follows the specified user. Returns 200 if already following.',
    tags: ['Follows'],
    security: [{ BearerToken: ['user'] }],
    request: {
      params: z.object({
        username: z.string().openapi({ description: 'Target username' }),
      }),
    },
    responses: {
      201: dataResponse(z.object({ following: z.literal(true) }), 'Now following user'),
      200: dataResponse(z.object({ alreadyFollowing: z.literal(true) }), 'Already following'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(followUserRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const username = c.req.param('username');
    const db = createDatabase(c.env.DB);

    // Look up target user
    const target = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!target) {
      return notFound(c, 'User not found');
    }

    if (target.id === auth.user.id) {
      return badRequest(c, 'Cannot follow yourself');
    }

    // Check if already following
    const existing = await db.query.userFollows.findFirst({
      where: and(
        eq(userFollows.followerId, auth.user.id),
        eq(userFollows.followedId, target.id),
      ),
    });
    if (existing) {
      return ok(c, { alreadyFollowing: true });
    }

    await db.insert(userFollows).values({
      followerId: auth.user.id,
      followedId: target.id,
    });

    emitEvent(c, {
      type: 'dev.tampa.user.followed',
      payload: { followerId: auth.user.id, followedId: target.id, followedUsername: username },
      metadata: { userId: auth.user.id, source: 'follows' },
    });

    return created(c, { following: true });
  });

  /**
   * DELETE /v1/users/:username/follow -- Unfollow a user
   */
  const unfollowUserRoute = createRoute({
    method: 'delete',
    path: '/users/{username}/follow',
    summary: 'Unfollow user',
    description: 'Unfollows the specified user.',
    tags: ['Follows'],
    security: [{ BearerToken: ['user'] }],
    request: {
      params: z.object({
        username: z.string().openapi({ description: 'Target username' }),
      }),
    },
    responses: {
      204: { description: 'Unfollowed' },
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(unfollowUserRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'user', c);
    if (scopeErr) return scopeErr;

    const username = c.req.param('username');
    const db = createDatabase(c.env.DB);

    const target = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!target) {
      return notFound(c, 'User not found');
    }

    await db.delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, auth.user.id),
          eq(userFollows.followedId, target.id),
        ),
      );

    return noContent(c);
  });

  /**
   * GET /v1/users/:username/followers -- List a user's followers
   */
  const listFollowersRoute = createRoute({
    method: 'get',
    path: '/users/{username}/followers',
    summary: 'List followers',
    description: 'Returns a paginated list of users following the specified user.',
    tags: ['Follows'],
    security: [{ BearerToken: ['read:user'] }],
    request: {
      params: z.object({
        username: z.string().openapi({ description: 'Target username' }),
      }),
      query: PaginationQuerySchema,
    },
    responses: {
      200: listResponse(FollowEntrySchema, 'Followers'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(listFollowersRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const username = c.req.param('username');
    const db = createDatabase(c.env.DB);
    const { limit, offset } = parsePagination(c);

    const target = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!target) {
      return notFound(c, 'User not found');
    }

    // Private profiles hide their social graph from non-owners and non-admins
    const isOwner = auth.user.id === target.id;
    if (target.profileVisibility === 'private' && !isOwner && !isPlatformAdmin(auth.user)) {
      return notFound(c, 'User not found');
    }

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followedId, target.id));

    // Get paginated followers
    const follows = await db.query.userFollows.findMany({
      where: eq(userFollows.followedId, target.id),
      limit,
      offset,
    });

    // Enrich with user data, filtering out private profiles
    const followerIds = follows.map((f) => f.followerId);
    const followerUsers = followerIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, followerIds),
        })
      : [];
    const userMap = new Map(followerUsers.map((u) => [u.id, u]));

    return list(
      c,
      follows
        .map((f) => {
          const u = userMap.get(f.followerId);
          if (!u) return null;
          // Redact private users from follower lists (unless requester is that user)
          if (u.profileVisibility === 'private' && u.id !== auth.user.id && !isPlatformAdmin(auth.user)) return null;
          return {
            username: u.username,
            name: u.name,
            avatarUrl: u.avatarUrl,
            followedAt: f.createdAt,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null),
      { limit, offset, total },
    );
  });

  /**
   * GET /v1/users/:username/following -- List who a user is following
   */
  const listFollowingRoute = createRoute({
    method: 'get',
    path: '/users/{username}/following',
    summary: 'List following',
    description: 'Returns a paginated list of users the specified user is following.',
    tags: ['Follows'],
    security: [{ BearerToken: ['read:user'] }],
    request: {
      params: z.object({
        username: z.string().openapi({ description: 'Target username' }),
      }),
      query: PaginationQuerySchema,
    },
    responses: {
      200: listResponse(FollowEntrySchema, 'Following'),
      ...AuthErrors,
      404: ErrorResponses[404],
    },
  });

  app.openapi(listFollowingRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const username = c.req.param('username');
    const db = createDatabase(c.env.DB);
    const { limit, offset } = parsePagination(c);

    const target = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!target) {
      return notFound(c, 'User not found');
    }

    // Private profiles hide their social graph from non-owners and non-admins
    const isOwner = auth.user.id === target.id;
    if (target.profileVisibility === 'private' && !isOwner && !isPlatformAdmin(auth.user)) {
      return notFound(c, 'User not found');
    }

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, target.id));

    // Get paginated following
    const follows = await db.query.userFollows.findMany({
      where: eq(userFollows.followerId, target.id),
      limit,
      offset,
    });

    // Enrich with user data, filtering out private profiles
    const followedIds = follows.map((f) => f.followedId);
    const followedUsers = followedIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, followedIds),
        })
      : [];
    const userMap = new Map(followedUsers.map((u) => [u.id, u]));

    return list(
      c,
      follows
        .map((f) => {
          const u = userMap.get(f.followedId);
          if (!u) return null;
          // Redact private users from following lists (unless requester is that user)
          if (u.profileVisibility === 'private' && u.id !== auth.user.id && !isPlatformAdmin(auth.user)) return null;
          return {
            username: u.username,
            name: u.name,
            avatarUrl: u.avatarUrl,
            followedAt: f.createdAt,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null),
      { limit, offset, total },
    );
  });

  // ============================================================
  // Badge Claims
  // ============================================================

  /**
   * GET /v1/claim/:code -- Get badge claim info (no auth required)
   */
  const getClaimInfoRoute = createRoute({
    method: 'get',
    path: '/claim/{code}',
    summary: 'Get badge claim info',
    description: 'Returns information about a badge claim link. No authentication required.',
    tags: ['Claims'],
    security: [],
    request: {
      params: z.object({
        code: z.string().openapi({ description: 'Claim code' }),
      }),
    },
    responses: {
      200: dataResponse(ClaimInfoSchema, 'Claim link information'),
      404: ErrorResponses[404],
      410: ErrorResponses[410],
    },
  });

  app.openapi(getClaimInfoRoute, async (c: any) => {
    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    try {
      const info = await getClaimInfo(db, code);
      return ok(c, info);
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  /**
   * POST /v1/claim/:code -- Claim a badge
   */
  const claimBadgeRoute = createRoute({
    method: 'post',
    path: '/claim/{code}',
    summary: 'Claim a badge',
    description: 'Claims a badge using a claim link code. Requires authentication.',
    tags: ['Claims'],
    security: [{ BearerToken: ['read:user'] }],
    request: {
      params: z.object({
        code: z.string().openapi({ description: 'Claim code' }),
      }),
    },
    responses: {
      201: dataResponse(
        z.object({
          badge: z.object({
            name: z.string(),
            slug: z.string(),
            description: z.string().nullable(),
            icon: z.string(),
            iconUrl: z.string().nullable(),
            color: z.string(),
            points: z.number(),
          }),
        }).openapi('ClaimBadgeResponse'),
        'Badge claimed',
      ),
      ...AuthErrors,
      404: ErrorResponses[404],
      409: ErrorResponses[409],
      410: ErrorResponses[410],
    },
  });

  app.openapi(claimBadgeRoute, async (c: any) => {
    const auth = await getCurrentUser(c);
    if (!auth) return unauthorized(c);

    const scopeErr = requireScope(auth, 'read:user', c);
    if (scopeErr) return scopeErr;

    const code = c.req.param('code');
    const db = createDatabase(c.env.DB);

    try {
      const result = await claimBadge(db, auth.user.id, code);
      emitEvents(c, result.events);
      return created(c, { badge: result.badge });
    } catch (err) {
      return handleServiceError(c, err);
    }
  });

  // ============================================================
  // Scopes Discovery
  // ============================================================

  /**
   * GET /v1/scopes -- List available OAuth scopes (no auth required)
   */
  const listScopesRoute = createRoute({
    method: 'get',
    path: '/scopes',
    summary: 'List OAuth scopes',
    description: 'Returns all available OAuth scopes with descriptions and hierarchy. No authentication required.',
    tags: ['Scopes'],
    security: [],
    responses: {
      200: dataResponse(z.array(ScopeSchema), 'Available OAuth scopes'),
    },
  });

  app.openapi(listScopesRoute, async (c: any) => {
    const scopeList = Object.entries(SCOPES).map(([name, description]) => ({
      name,
      description,
      implies: (SCOPE_HIERARCHY as Record<string, string[] | undefined>)[name] ?? [],
    }));

    return ok(c, scopeList);
  });

  return app;
}

export const v1Routes = createV1Routes();
