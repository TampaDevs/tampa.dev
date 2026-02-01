/**
 * Central Encryption Service
 *
 * AES-256-GCM encryption for sensitive data at rest (OAuth tokens, webhook secrets).
 * Uses the Web Crypto API (available in Cloudflare Workers).
 *
 * Key: base64-encoded 32-byte key from env.ENCRYPTION_KEY
 * Output format: base64(iv):base64(ciphertext+authTag)
 * IV: 12 random bytes per encryption (GCM standard)
 */

/** Import a base64-encoded 32-byte key as a CryptoKey */
async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits)');
  }
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypt plaintext. Returns "base64(iv):base64(ciphertext+authTag)" */
export async function encrypt(
  plaintext: string,
  base64Key: string,
): Promise<string> {
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  // Web Crypto appends the 16-byte auth tag to the ciphertext
  const ivB64 = btoa(String.fromCharCode(...iv));
  const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));
  return `${ivB64}:${cipherB64}`;
}

/** Decrypt "base64(iv):base64(ciphertext+authTag)" back to plaintext */
export async function decrypt(
  encrypted: string,
  base64Key: string,
): Promise<string> {
  const key = await importKey(base64Key);
  const colonIdx = encrypted.indexOf(':');
  if (colonIdx === -1) {
    throw new Error('Invalid encrypted format: expected "iv:ciphertext"');
  }
  const ivB64 = encrypted.slice(0, colonIdx);
  const cipherB64 = encrypted.slice(colonIdx + 1);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes,
  );
  return new TextDecoder().decode(plainBuffer);
}

/**
 * Decrypt or passthrough: handles both encrypted and legacy plaintext values.
 * Used during the migration period when some records are still unencrypted.
 *
 * Heuristic: encrypted values contain exactly one ':' between two base64 strings.
 * OAuth/webhook tokens never contain this pattern naturally.
 */
export async function decryptOrPassthrough(
  value: string | null,
  base64Key: string,
): Promise<string | null> {
  if (!value) return null;

  // Encrypted format: "base64(iv):base64(ciphertext)" — always has exactly one
  // colon, and both parts are valid base64.
  const colonIdx = value.indexOf(':');
  if (colonIdx > 0 && value.indexOf(':', colonIdx + 1) === -1) {
    const ivPart = value.slice(0, colonIdx);
    const cipherPart = value.slice(colonIdx + 1);
    if (isBase64(ivPart) && isBase64(cipherPart)) {
      try {
        return await decrypt(value, base64Key);
      } catch {
        // Decryption failed — treat as plaintext (not yet migrated)
        return value;
      }
    }
  }
  return value;
}

function isBase64(s: string): boolean {
  if (s.length === 0) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(s);
}
