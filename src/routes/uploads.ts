/**
 * Upload API Routes
 *
 * Handles file uploads to R2 with presigned URLs for direct client upload.
 * Supports user avatars, OAuth app logos, and future media uploads.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import type { Env } from '../../types/worker.js';
import { getSessionCookieName } from '../lib/session.js';
import { generatePresignedUploadUrl } from '../lib/r2-presign.js';

// ============== Constants ==============

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for images
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

// Upload categories with their constraints
const UPLOAD_CATEGORIES = {
  avatar: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ALLOWED_IMAGE_TYPES,
    path: 'avatars',
  },
  'app-logo': {
    maxSize: 1 * 1024 * 1024, // 1MB
    allowedTypes: ALLOWED_IMAGE_TYPES,
    path: 'app-logos',
  },
  media: {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    path: 'media',
  },
} as const;

type UploadCategory = keyof typeof UPLOAD_CATEGORIES;

// ============== Validation Schemas ==============

const requestUploadSchema = z.object({
  category: z.enum(['avatar', 'app-logo', 'media']),
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().positive(),
});

// ============== Types ==============

interface UploadToken {
  key: string;
  category: UploadCategory;
  userId: string;
  contentType: string;
  maxSize: number;
  expiresAt: number;
}

// ============== Helper Functions ==============

/**
 * Get current user from session cookie
 */
async function getCurrentUser(c: { env: Env; req: { raw: Request } }) {
  const cookieHeader = c.req.raw.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookieName = getSessionCookieName(c.env);
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionToken = sessionMatch?.[1];
  if (!sessionToken) return null;

  const db = createDatabase(c.env.DB);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionToken),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
}

/**
 * Generate a unique file key
 * In development, adds a 'dev_' prefix for easy cleanup via lifecycle rules
 */
function generateFileKey(category: UploadCategory, userId: string, filename: string, isDev: boolean): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
  const prefix = isDev ? 'dev_' : '';

  return `${prefix}${UPLOAD_CATEGORIES[category].path}/${userId}/${timestamp}-${random}-${safeName}`;
}

/**
 * Sign an upload token
 */
async function signToken(token: UploadToken, secret: string): Promise<string> {
  const data = JSON.stringify(token);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(data) + '.' + sigBase64;
}

/**
 * Verify and decode an upload token
 */
async function verifyToken(tokenString: string, secret: string): Promise<UploadToken | null> {
  try {
    const [dataBase64, sigBase64] = tokenString.split('.');
    if (!dataBase64 || !sigBase64) return null;

    const data = atob(dataBase64);
    const token = JSON.parse(data) as UploadToken;

    // Check expiry
    if (Date.now() > token.expiresAt) return null;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signature = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));

    return valid ? token : null;
  } catch {
    return null;
  }
}

/**
 * Get file extension from content type
 */
function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[contentType] || 'bin';
}

// ============== Routes ==============

export function createUploadRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * POST /api/uploads/request - Request a presigned upload URL
   *
   * Returns a presigned URL for direct upload to R2.
   */
  app.post('/request', zValidator('json', requestUploadSchema as z.ZodType<z.infer<typeof requestUploadSchema>>), async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check R2 credentials
    const accountId = c.env.R2_ACCOUNT_ID;
    const accessKeyId = c.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return c.json({ error: 'R2 uploads not configured' }, 500);
    }

    const { category, filename, contentType, size } = c.req.valid('json');
    const config = UPLOAD_CATEGORIES[category];

    // Validate content type
    if (!config.allowedTypes.includes(contentType)) {
      return c.json({
        error: 'Invalid file type',
        allowed: config.allowedTypes,
      }, 400);
    }

    // Validate size
    if (size > config.maxSize) {
      return c.json({
        error: 'File too large',
        maxSize: config.maxSize,
        maxSizeMB: config.maxSize / (1024 * 1024),
      }, 400);
    }

    // Detect development mode (no public URL or localhost-style URL)
    const publicUrl = c.env.UPLOADS_PUBLIC_URL || '';
    const isDev = !publicUrl || publicUrl.includes('localhost') || publicUrl.includes('127.0.0.1');

    // Generate file key
    const key = generateFileKey(category, user.id, filename, isDev);

    // Generate presigned URL for direct R2 upload
    const bucketName = c.env.UPLOADS_PUBLIC_BUCKET_NAME || 'tampa-dev-uploads-public';
    const presignedUrl = await generatePresignedUploadUrl({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket: bucketName,
      key,
      contentType,
      expiresIn: 300, // 5 minutes
    });

    // Calculate final public URL
    const finalUrl = publicUrl
      ? `${publicUrl}/${key}`
      : `/api/uploads/file/${key}`;

    return c.json({
      uploadUrl: presignedUrl,
      key,
      finalUrl,
      contentType,
      expiresIn: 300,
    });
  });

  /**
   * PUT /api/uploads/upload - Upload a file with token
   *
   * Accepts multipart form data with:
   * - token: The signed upload token
   * - file: The file to upload
   */
  app.put('/upload', async (c) => {
    const bucket = c.env.UPLOADS_BUCKET;
    if (!bucket) {
      return c.json({ error: 'Uploads not configured' }, 500);
    }

    const secret = c.env.SESSION_SECRET || 'dev-secret';

    // Get token from header or query
    const tokenString = c.req.header('X-Upload-Token') || c.req.query('token');
    if (!tokenString) {
      return c.json({ error: 'Missing upload token' }, 400);
    }

    // Verify token
    const token = await verifyToken(tokenString, secret);
    if (!token) {
      return c.json({ error: 'Invalid or expired upload token' }, 401);
    }

    // Get request body
    const contentType = c.req.header('Content-Type') || '';

    // Handle raw binary upload
    if (!contentType.includes('multipart/form-data')) {
      // Direct binary upload
      const body = await c.req.arrayBuffer();

      if (body.byteLength > token.maxSize) {
        return c.json({ error: 'File too large' }, 400);
      }

      // Store in R2
      await bucket.put(token.key, body, {
        httpMetadata: {
          contentType: token.contentType,
        },
        customMetadata: {
          userId: token.userId,
          category: token.category,
          uploadedAt: new Date().toISOString(),
        },
      });

      const publicUrl = c.env.UPLOADS_PUBLIC_URL
        ? `${c.env.UPLOADS_PUBLIC_URL}/${token.key}`
        : `/api/uploads/file/${token.key}`;

      return c.json({
        success: true,
        key: token.key,
        url: publicUrl,
      });
    }

    // Handle multipart form upload
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (file.size > token.maxSize) {
      return c.json({ error: 'File too large' }, 400);
    }

    // Verify content type matches token
    if (file.type !== token.contentType) {
      return c.json({
        error: 'Content type mismatch',
        expected: token.contentType,
        received: file.type,
      }, 400);
    }

    // Store in R2
    const arrayBuffer = await file.arrayBuffer();
    await bucket.put(token.key, arrayBuffer, {
      httpMetadata: {
        contentType: token.contentType,
      },
      customMetadata: {
        userId: token.userId,
        category: token.category,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    });

    const publicUrl = c.env.UPLOADS_PUBLIC_URL
      ? `${c.env.UPLOADS_PUBLIC_URL}/${token.key}`
      : `/api/uploads/file/${token.key}`;

    return c.json({
      success: true,
      key: token.key,
      url: publicUrl,
    });
  });

  /**
   * GET /api/uploads/file/* - Serve uploaded files
   *
   * Falls back when no public R2 URL is configured.
   */
  app.get('/file/*', async (c) => {
    const bucket = c.env.UPLOADS_BUCKET;
    if (!bucket) {
      return c.json({ error: 'Uploads not configured' }, 500);
    }

    const key = c.req.path.replace('/uploads/file/', '');
    if (!key) {
      return c.json({ error: 'Invalid file path' }, 400);
    }

    const object = await bucket.get(key);
    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.httpEtag);

    // Handle conditional requests
    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { headers });
  });

  /**
   * DELETE /api/uploads/file/* - Delete an uploaded file
   *
   * Only the owner can delete their files.
   */
  app.delete('/file/*', async (c) => {
    const user = await getCurrentUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bucket = c.env.UPLOADS_BUCKET;
    if (!bucket) {
      return c.json({ error: 'Uploads not configured' }, 500);
    }

    const key = c.req.path.replace('/uploads/file/', '');
    if (!key) {
      return c.json({ error: 'Invalid file path' }, 400);
    }

    // Get object to check ownership
    const object = await bucket.head(key);
    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Verify ownership
    if (object.customMetadata?.userId !== user.id) {
      return c.json({ error: 'Not authorized to delete this file' }, 403);
    }

    await bucket.delete(key);

    return c.json({ success: true, deleted: key });
  });

  return app;
}

export const uploadRoutes = createUploadRoutes();
