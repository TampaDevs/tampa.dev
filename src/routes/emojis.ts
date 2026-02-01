/**
 * Emoji API Route
 *
 * Returns a mapping of emoji short names to their R2-hosted image URLs.
 * Serves from a pre-built index of Apple emoji assets stored in R2.
 * Cached with a 7-day TTL.
 * No authentication required.
 */

import { Hono } from 'hono';
import type { Env } from '../../types/worker';
import emojiIndex from '../data/emoji-index.json';

// Emoji images are always served from the production R2 uploads bucket.
const EMOJI_BASE_URL = 'https://td-uploads-public.tampa.dev/emoji';

// Pre-build the flat name→URL mapping once at module load
const emojiMapping: Record<string, string> = {};
for (const [name, meta] of Object.entries(emojiIndex as Record<string, { i: string; u: string; c: string }>)) {
  emojiMapping[name] = `${EMOJI_BASE_URL}/${meta.i}`;
}
const emojiBody = JSON.stringify(emojiMapping);

function createEmojiRoutes() {
  const app = new Hono<{ Bindings: Env }>();

  /**
   * GET /emojis - Get emoji name-to-URL mapping
   *
   * Returns a JSON mapping of emoji short names to their image URLs.
   * URLs point to the R2-hosted emoji assets.
   *
   * Returns JSON: { "trophy": "https://td-uploads-public.tampa.dev/emoji/1f3c6.webp", ... }
   */
  app.get('/', async (c) => {
    return new Response(emojiBody, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=604800',
      },
    });
  });

  return app;
}

export const emojiRoutes = createEmojiRoutes();
