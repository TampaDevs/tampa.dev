/**
 * Emoji-to-image-URL resolution for the API layer.
 *
 * Mirrors the logic in web/app/components/Emoji.tsx so that server-side
 * responses can include a direct link to the high-quality Apple-style
 * WebP image hosted on the R2 uploads bucket.
 */

import emojiMap from '../web/app/lib/emoji-map.json';

const emojiLookup = emojiMap as Record<string, string>;

const EMOJI_BASE_URL = 'https://td-uploads-public.tampa.dev/emoji';

/**
 * Convert a Unicode emoji string to its normalized codepoint key.
 * Strips FE0F variation selectors and zero-pads each codepoint to 4+ hex digits.
 *
 * Examples:
 *   "🏆" → "1f3c6"
 *   "#️⃣"  → "0023-20e3"
 *   "👨‍💻" → "1f468-200d-1f4bb"
 */
function emojiToKey(emoji: string): string {
  return [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0'))
    .filter((cp) => cp !== 'fe0f')
    .join('-');
}

/**
 * Resolve a Unicode emoji string to its R2-hosted image URL.
 * Returns null if no matching Apple emoji image exists.
 */
export function getEmojiUrl(emoji: string): string | null {
  const key = emojiToKey(emoji);
  const filename = emojiLookup[key];
  return filename ? `${EMOJI_BASE_URL}/${filename}` : null;
}

/**
 * Enrich any object that has an `icon` field with an `iconUrl` field.
 * Useful for adding image URLs to badge response objects.
 */
export function withIconUrl<T extends { icon: string }>(
  obj: T,
): T & { iconUrl: string | null } {
  return { ...obj, iconUrl: getEmojiUrl(obj.icon) };
}
