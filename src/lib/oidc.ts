/**
 * OIDC JWT Infrastructure
 *
 * RS256-signed id_token generation and verification for OIDC compliance.
 * Uses the `jose` library which is edge-compatible (Cloudflare Workers).
 */

import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import type { User } from '../db/schema.js';
import { users } from '../db/schema.js';
import { createDatabase } from '../db/index.js';
import { buildUserClaims } from './oidc-claims.js';
import { getActiveEntitlements } from './entitlements.js';
import type { Env } from '../../types/worker.js';

/**
 * Derive the canonical OIDC issuer from a request URL.
 *
 * In production/staging, all OIDC endpoints are served from tampa.dev
 * (via wrangler.toml routes). The issuer MUST be consistent across
 * the discovery document and id_token `iss` claim (OIDC Core 3.1.3.7).
 *
 * For local development/testing (localhost), uses the request origin as-is.
 */
export function getCanonicalIssuer(requestUrl: string): string {
  const url = new URL(requestUrl);
  const hostname = url.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return url.origin;
  }
  if (hostname.includes('staging')) {
    return 'https://staging.tampa.dev';
  }
  if (!hostname.endsWith('tampa.dev')) {
    console.warn(`[OIDC] Unexpected hostname "${hostname}" — defaulting issuer to https://tampa.dev`);
  }
  return 'https://tampa.dev';
}

/**
 * Generate an OIDC id_token JWT (RS256-signed).
 *
 * @param user         The authenticated user record
 * @param clientId     The OAuth client_id (becomes the `aud` claim)
 * @param scopes       The granted scopes (expanded via scope hierarchy)
 * @param privateJwk   The RS256 private key as a JWK JSON string
 * @param options      Additional id_token parameters
 */
export async function generateIdToken(
  user: User,
  clientId: string,
  scopes: string[],
  privateJwk: string,
  options: {
    issuer: string;
    expiresIn?: number;   // seconds, default 3600
    nonce?: string;       // from authorization request -- MUST include if provided
    authTime: number;     // actual authentication timestamp (from grant props)
    accessToken?: string; // for computing at_hash
    entitlements?: string[]; // active user entitlements for custom claim
  },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Build user claims from scopes using shared claims builder
  const userClaims = buildUserClaims(user, scopes, { entitlements: options.entitlements });

  // Build the full id_token payload
  const payload: Record<string, unknown> = {
    ...userClaims,
    iss: options.issuer,
    aud: clientId,
    exp: now + (options.expiresIn ?? 3600),
    iat: now,
    auth_time: options.authTime,
  };

  // OIDC Core 3.1.3.6: nonce MUST be included if present in authorization request
  if (options.nonce) {
    payload.nonce = options.nonce;
  }

  // OIDC Core 3.1.3.6: at_hash (access token hash)
  if (options.accessToken) {
    payload.at_hash = await computeAtHash(options.accessToken);
  }

  // Sign with RS256
  const jwk = JSON.parse(privateJwk);
  const privateKey = await jose.importJWK(jwk, 'RS256');

  return new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })
    .sign(privateKey);
}

/**
 * Compute at_hash (access token hash) per OIDC Core 3.1.3.6.
 * For RS256: SHA-256 hash, take left-most 128 bits, base64url encode.
 */
async function computeAtHash(accessToken: string): Promise<string> {
  const data = new TextEncoder().encode(accessToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const halfHash = new Uint8Array(hashBuffer).slice(0, 16);
  return jose.base64url.encode(halfHash);
}

/**
 * Verify an id_token (for testing/validation).
 */
export async function verifyIdToken(
  idToken: string,
  publicJwk: string,
  options: { issuer: string; audience: string },
): Promise<jose.JWTPayload> {
  const jwk = JSON.parse(publicJwk);
  const publicKey = await jose.importJWK(jwk, 'RS256');
  const { payload } = await jose.jwtVerify(idToken, publicKey, {
    issuer: options.issuer,
    audience: options.audience,
  });
  return payload;
}

/**
 * Inject OIDC id_token into token endpoint responses.
 *
 * Intercepts the OAuthProvider's token response and adds an RS256-signed
 * id_token JWT when the openid scope was granted and OIDC keys are configured.
 * Degrades gracefully: returns the original response on any failure.
 */
export async function injectIdToken(
  response: Response,
  env: Env,
  requestUrl: string,
): Promise<Response> {
  // Clone BEFORE reading so we can return original on any failure.
  const cloned = response.clone();

  try {
    const body = await cloned.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    // Only inject if openid scope was granted.
    // Split space-delimited scope string to avoid substring matches.
    const grantedScopes = body.scope?.split(' ') ?? [];
    if (!body.access_token || !grantedScopes.includes('openid')) {
      return response;
    }

    // No OIDC_PRIVATE_JWK configured -- skip id_token silently
    if (!env.OIDC_PRIVATE_JWK) {
      return response;
    }

    // Extract user info and client_id from the access token's grant data.
    const tokenInfo = await env.OAUTH_PROVIDER.unwrapToken(body.access_token);
    if (!tokenInfo?.grant?.props) {
      return response;
    }

    const props = tokenInfo.grant.props as {
      userId: string;
      scopes: string[];
      nonce?: string;
      authTime?: number;
    };

    // client_id comes from the token's grant, not the request body
    const clientId = tokenInfo.grant.clientId;
    if (!clientId) {
      return response;
    }

    // Fetch user and active entitlements from database for claims
    const db = createDatabase(env.DB);
    const [user, entitlements] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, props.userId),
      }),
      getActiveEntitlements(db, props.userId),
    ]);

    if (!user) {
      return response;
    }

    // Generate RS256-signed id_token
    // Issuer must match the discovery document (OIDC Core 3.1.3.7)
    const idToken = await generateIdToken(
      user,
      clientId,
      props.scopes,
      env.OIDC_PRIVATE_JWK,
      {
        issuer: getCanonicalIssuer(requestUrl),
        accessToken: body.access_token,
        nonce: props.nonce,
        authTime: props.authTime ?? Math.floor(Date.now() / 1000),
        entitlements,
      },
    );

    // Return augmented response with id_token
    const headers = new Headers(response.headers);
    return new Response(JSON.stringify({
      ...body,
      id_token: idToken,
    }), {
      status: response.status,
      headers,
    });
  } catch (e) {
    console.error('Failed to inject id_token:', e);
    return response;
  }
}
