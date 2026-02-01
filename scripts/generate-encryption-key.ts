/**
 * Generate a secure AES-256-GCM encryption key for ENCRYPTION_KEY.
 *
 * Usage:
 *   npx tsx scripts/generate-encryption-key.ts
 *   npm run generate:encryption-key
 *
 * Output: a base64-encoded 32-byte (256-bit) random key.
 *
 * Deployment:
 *   - Local dev: add to .dev.vars as ENCRYPTION_KEY=<output>
 *   - Staging:   npx wrangler secret put ENCRYPTION_KEY --env staging
 *   - Production: npx wrangler secret put ENCRYPTION_KEY --env production
 */

import { randomBytes } from 'node:crypto';

const key = randomBytes(32);
const base64Key = key.toString('base64');

console.log('Generated ENCRYPTION_KEY (base64-encoded 32-byte AES-256 key):\n');
console.log(base64Key);
console.log('\nAdd this to your environment:');
console.log(`  .dev.vars:   ENCRYPTION_KEY=${base64Key}`);
console.log(`  Staging:     npx wrangler secret put ENCRYPTION_KEY --env staging`);
console.log(`  Production:  npx wrangler secret put ENCRYPTION_KEY --env production`);
console.log('\nIMPORTANT:');
console.log('  - Use the SAME key across all environments that share a database.');
console.log('  - Staging and production should use DIFFERENT keys (different databases).');
console.log('  - Back up this key securely. If lost, encrypted data cannot be recovered.');
console.log('  - The key is optional. Without it, tokens are stored in plaintext (legacy mode).');
