/**
 * Standardized API Response Helpers
 *
 * All API endpoints should use these helpers for consistent response envelopes.
 *
 * Success responses:
 *   { data: ... }                              -- detail/mutation
 *   { data: [...], pagination: { ... } }       -- list
 *
 * Error responses:
 *   { error: "message", code: "machine_code" } -- all errors
 *
 * Error codes are standardized across the API surface. See ERROR_CODES below.
 */

import type { Context } from 'hono';

// ============== Error Codes ==============

/**
 * Standard machine-readable error codes.
 * Use these in apiError() calls for consistent error identification.
 */
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  INSUFFICIENT_SCOPE: 'insufficient_scope',

  // Resource errors
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  GONE: 'gone',

  // Input errors
  VALIDATION_ERROR: 'validation_error',
  BAD_REQUEST: 'bad_request',

  // Rate limiting
  RATE_LIMITED: 'rate_limited',

  // Server errors
  INTERNAL_ERROR: 'internal_error',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============== Success Responses ==============

/** 200 OK with data wrapper */
export function ok<T>(c: Context, data: T): Response {
  return c.json({ data }, 200);
}

/** 201 Created with data wrapper */
export function created<T>(c: Context, data: T): Response {
  return c.json({ data }, 201);
}

/** 200 OK with list + pagination wrapper */
export function list<T>(
  c: Context,
  items: T[],
  pagination: { total?: number; limit: number; offset: number; hasMore?: boolean },
): Response {
  return c.json({
    data: items,
    pagination: {
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore ?? items.length === pagination.limit,
    },
  }, 200);
}

/** 200 OK with { data: { success: true } } */
export function success(c: Context, extra?: Record<string, unknown>): Response {
  return c.json({ data: { success: true, ...extra } }, 200);
}

/** 204 No Content */
export function noContent(c: Context): Response {
  return c.body(null, 204);
}

// ============== Error Responses ==============

/** Generic error response with standardized envelope */
export function apiError(
  c: Context,
  status: number,
  message: string,
  code: ErrorCode,
  headers?: Record<string, string>,
): Response {
  const body = JSON.stringify({ error: message, code });

  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/** 400 Bad Request */
export function badRequest(c: Context, message: string = 'Bad request'): Response {
  return apiError(c, 400, message, ERROR_CODES.BAD_REQUEST);
}

/** 401 Unauthorized */
export function unauthorized(c: Context, message: string = 'Unauthorized'): Response {
  return apiError(c, 401, message, ERROR_CODES.UNAUTHORIZED);
}

/** 403 Forbidden */
export function forbidden(c: Context, message: string = 'Forbidden'): Response {
  return apiError(c, 403, message, ERROR_CODES.FORBIDDEN);
}

/** 403 Insufficient Scope (RFC-compliant with WWW-Authenticate header) */
export function scopeError(c: Context, requiredScope: string): Response {
  return apiError(
    c,
    403,
    `This endpoint requires the '${requiredScope}' scope`,
    ERROR_CODES.INSUFFICIENT_SCOPE,
    {
      'WWW-Authenticate': `Bearer error="insufficient_scope", scope="${requiredScope}"`,
    },
  );
}

/** 404 Not Found */
export function notFound(c: Context, message: string = 'Not found'): Response {
  return apiError(c, 404, message, ERROR_CODES.NOT_FOUND);
}

/** 409 Conflict */
export function conflict(c: Context, message: string): Response {
  return apiError(c, 409, message, ERROR_CODES.CONFLICT);
}

/** 410 Gone */
export function gone(c: Context, message: string): Response {
  return apiError(c, 410, message, ERROR_CODES.GONE);
}

/** 429 Rate Limited */
export function rateLimited(c: Context, retryAfterSeconds: number): Response {
  return apiError(
    c,
    429,
    'Too many requests',
    ERROR_CODES.RATE_LIMITED,
    { 'Retry-After': String(retryAfterSeconds) },
  );
}

/** 500 Internal Server Error (never expose details) */
export function internalError(c: Context): Response {
  return apiError(c, 500, 'Internal server error', ERROR_CODES.INTERNAL_ERROR);
}

// ============== Pagination Helpers ==============

export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Parse and validate pagination query parameters.
 * Clamps limit to [1, maxLimit] and offset to [0, Infinity].
 */
export function parsePagination(
  c: Context,
  defaults: { limit?: number; maxLimit?: number } = {},
): PaginationParams {
  const { limit: defaultLimit = 20, maxLimit = 100 } = defaults;

  const rawLimit = parseInt(c.req.query('limit') || String(defaultLimit), 10);
  const rawOffset = parseInt(c.req.query('offset') || '0', 10);

  return {
    limit: Math.min(Math.max(isNaN(rawLimit) ? defaultLimit : rawLimit, 1), maxLimit),
    offset: Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0),
  };
}
