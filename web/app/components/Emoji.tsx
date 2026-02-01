/**
 * Renders emoji as high-quality Apple-style images served from R2.
 * Falls back to native Unicode rendering if the image fails to load.
 *
 * Images are 160x160 Apple emoji WebPs hosted on the production R2 uploads bucket.
 * The emoji-map.json lookup table maps normalized codepoints to filenames.
 */

import emojiMap from '~/lib/emoji-map.json';

const emojiLookup = emojiMap as Record<string, string>;

// Emoji images are always served from the production R2 uploads bucket.
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
    .map(c => c.codePointAt(0)!.toString(16).padStart(4, '0'))
    .filter(cp => cp !== 'fe0f')
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

interface EmojiProps {
  emoji: string;          // Unicode emoji character (e.g., "🏆")
  size?: number;          // Image size in pixels (default: 20)
  className?: string;     // Additional CSS classes
}

export function Emoji({ emoji, size = 20, className }: EmojiProps) {
  const url = getEmojiUrl(emoji);

  if (!url) {
    // No local image available — render native emoji
    return (
      <span
        className={`inline-block align-text-bottom leading-none ${className || ''}`}
        style={{ fontSize: size, width: size, height: size }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={emoji}
      width={size}
      height={size}
      className={`inline-block align-text-bottom ${className || ''}`}
      loading="lazy"
      draggable={false}
      onError={(e) => {
        // Fallback: replace image with native emoji
        const img = e.currentTarget;
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.fontSize = `${size}px`;
        img.replaceWith(span);
      }}
    />
  );
}
