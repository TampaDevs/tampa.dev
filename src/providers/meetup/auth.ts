/**
 * Meetup API JWT Authentication
 *
 * Implements the JWT-bearer OAuth2 flow for Meetup API authentication.
 * Uses Web Crypto API for RS256 signing (compatible with Cloudflare Workers).
 */

const MEETUP_AUTH_URL = 'https://secure.meetup.com/oauth2/access';
const JWT_EXPIRATION_SECONDS = 3600;

/**
 * Configuration for Meetup authentication
 */
export interface MeetupAuthConfig {
  clientKey: string;
  signingKey: string; // RSA private key (PEM format or raw base64)
  memberId: string;
}

/**
 * Base64URL encode (JWT-safe encoding)
 */
function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * PKCS#8 header for RSA keys (OID 1.2.840.113549.1.1.1)
 * This wraps a PKCS#1 key to make it PKCS#8 compatible
 */
const PKCS8_RSA_HEADER = new Uint8Array([
  0x30, 0x82, 0x00, 0x00, // SEQUENCE (length placeholder)
  0x02, 0x01, 0x00, // INTEGER 0 (version)
  0x30, 0x0d, // SEQUENCE
  0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // OID rsaEncryption
  0x05, 0x00, // NULL
  0x04, 0x82, 0x00, 0x00, // OCTET STRING (length placeholder)
]);

/**
 * Convert PKCS#1 RSA private key to PKCS#8 format
 */
function convertPkcs1ToPkcs8(pkcs1Bytes: Uint8Array): Uint8Array {
  // Create PKCS#8 wrapper
  const header = new Uint8Array(PKCS8_RSA_HEADER);

  // Calculate lengths
  const pkcs1Len = pkcs1Bytes.length;
  const innerLen = pkcs1Len + 22; // header minus outer SEQUENCE

  // Set OCTET STRING length (last 2 bytes of header)
  header[header.length - 2] = (pkcs1Len >> 8) & 0xff;
  header[header.length - 1] = pkcs1Len & 0xff;

  // Set outer SEQUENCE length
  header[2] = (innerLen >> 8) & 0xff;
  header[3] = innerLen & 0xff;

  // Combine header and PKCS#1 key
  const pkcs8 = new Uint8Array(header.length + pkcs1Bytes.length);
  pkcs8.set(header);
  pkcs8.set(pkcs1Bytes, header.length);

  return pkcs8;
}

/**
 * Convert a PEM private key to CryptoKey
 * Accepts either:
 * - PKCS#1 format (-----BEGIN RSA PRIVATE KEY-----)
 * - PKCS#8 format (-----BEGIN PRIVATE KEY-----)
 * - Raw base64-encoded key data
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const isPkcs1 = pemKey.includes('BEGIN RSA PRIVATE KEY');

  // Strip PEM headers and whitespace
  const base64Key = pemKey
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binaryString = atob(base64Key);
  let bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert PKCS#1 to PKCS#8 if needed
  if (isPkcs1) {
    bytes = convertPkcs1ToPkcs8(bytes);
  }

  // Import as PKCS#8 private key for RS256 signing
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Create a signed JWT for Meetup API authentication
 */
async function createSignedJwt(config: MeetupAuthConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // JWT Header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // JWT Payload
  const payload = {
    sub: config.memberId,
    iss: config.clientKey,
    aud: 'api.meetup.com',
    exp: now + JWT_EXPIRATION_SECONDS,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const privateKey = await importPrivateKey(config.signingKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Exchange a signed JWT for a Meetup API access token
 */
export async function getAccessToken(config: MeetupAuthConfig): Promise<string> {
  const signedJwt = await createSignedJwt(config);

  const response = await fetch(MEETUP_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain access token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
