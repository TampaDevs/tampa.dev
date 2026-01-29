/**
 * R2 Presigned URL Generator
 *
 * Generates S3-compatible presigned URLs for direct client uploads to R2.
 * Uses AWS Signature V4 signing.
 */

interface PresignOptions {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 300 (5 min)
}

/**
 * Generate a presigned PUT URL for uploading to R2
 */
export async function generatePresignedUploadUrl(options: PresignOptions): Promise<string> {
  const {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    key,
    contentType,
    expiresIn = 300,
  } = options;

  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  // Query parameters for presigned URL
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  });

  // Canonical request
  const canonicalUri = `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  const canonicalQueryString = params.toString().split('&').sort().join('&');
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // String to sign
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  // Signing key
  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');

  // Signature
  const signature = await hmacHex(kSigning, stringToSign);

  // Final URL
  params.set('X-Amz-Signature', signature);
  return `${endpoint}${canonicalUri}?${params.toString()}`;
}

// Crypto helpers
async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return arrayToHex(new Uint8Array(buffer));
}

async function hmac(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const buffer = await hmac(key, data);
  return arrayToHex(new Uint8Array(buffer));
}

function arrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
