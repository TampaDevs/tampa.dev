/**
 * OIDC Key Pair Generator
 *
 * Generates an RS256 key pair for signing OIDC id_tokens.
 * Outputs both the private JWK (for OIDC_PRIVATE_JWK secret) and
 * the public JWK (for OIDC_PUBLIC_JWK secret).
 *
 * Usage: npm run generate:oidc-keys
 */

import * as jose from 'jose';

async function generateOIDCKeys() {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true,
  });

  const publicJWK = await jose.exportJWK(publicKey);
  const privateJWK = await jose.exportJWK(privateKey);

  // Generate a stable key ID
  const kid = jose.base64url.encode(crypto.getRandomValues(new Uint8Array(16)));

  // Annotate both keys with metadata
  publicJWK.kid = kid;
  publicJWK.use = 'sig';
  publicJWK.alg = 'RS256';

  privateJWK.kid = kid;
  privateJWK.use = 'sig';
  privateJWK.alg = 'RS256';

  console.log('=== Private JWK (store as OIDC_PRIVATE_JWK secret) ===');
  console.log(JSON.stringify(privateJWK));
  console.log('');
  console.log('=== Public JWK (store as OIDC_PUBLIC_JWK secret) ===');
  console.log(JSON.stringify(publicJWK));
  console.log('');
  console.log('=== JWKS document (for reference) ===');
  console.log(JSON.stringify({ keys: [publicJWK] }, null, 2));
  console.log('');
  console.log('Deploy keys per environment:');
  console.log('  npx wrangler secret put OIDC_PRIVATE_JWK --env staging');
  console.log('  npx wrangler secret put OIDC_PUBLIC_JWK --env staging');
  console.log('  npx wrangler secret put OIDC_PRIVATE_JWK --env production');
  console.log('  npx wrangler secret put OIDC_PUBLIC_JWK --env production');
}

generateOIDCKeys().catch(console.error);
