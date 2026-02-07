import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as jose from 'jose';
import { generateIdToken, verifyIdToken, getCanonicalIssuer } from '../../src/lib/oidc.js';
import type { User } from '../../src/db/schema.js';

// Test key pair (generated once, used across tests)
let privateJwk: string;
let publicJwk: string;

// Generate keys before tests run
before(async () => {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', {
    modulusLength: 2048,
    extractable: true,
  });

  const pubJWK = await jose.exportJWK(publicKey);
  const privJWK = await jose.exportJWK(privateKey);

  const kid = 'test-kid-001';
  pubJWK.kid = kid;
  pubJWK.use = 'sig';
  pubJWK.alg = 'RS256';
  privJWK.kid = kid;
  privJWK.use = 'sig';
  privJWK.alg = 'RS256';

  privateJwk = JSON.stringify(privJWK);
  publicJwk = JSON.stringify(pubJWK);
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-456',
    email: 'alice@tampa.dev',
    name: 'Alice',
    username: 'alice',
    bio: null,
    socialLinks: null,
    avatarUrl: 'https://example.com/alice.jpg',
    heroImageUrl: null,
    themeColor: null,
    location: null,
    role: 'user',
    showAchievements: true,
    profileVisibility: 'public',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T12:00:00Z',
    ...overrides,
  };
}

describe('generateIdToken', () => {
  it('produces a valid RS256 JWT', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    expect(token).to.be.a('string');
    // JWT has 3 dot-separated parts
    expect(token.split('.')).to.have.length(3);
  });

  it('is verifiable with the corresponding public key', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.sub).to.equal('user-456');
    expect(payload.iss).to.equal('https://api.tampa.dev');
    expect(payload.aud).to.equal('client-1');
  });

  it('includes profile claims when read:user scope is granted', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.name).to.equal('Alice');
    expect(payload.preferred_username).to.equal('alice');
    expect(payload.picture).to.equal('https://example.com/alice.jpg');
  });

  it('includes email claims when user:email scope is granted', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['user:email'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.email).to.equal('alice@tampa.dev');
    expect(payload.email_verified).to.equal(true);
  });

  it('uses provided auth_time, not current time', async () => {
    const user = makeUser();
    const authTime = 1600000000; // well in the past
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.auth_time).to.equal(1600000000);
  });

  it('includes nonce when provided', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
      nonce: 'abc123',
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.nonce).to.equal('abc123');
  });

  it('omits nonce when not provided', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload).to.not.have.property('nonce');
  });

  it('computes at_hash when accessToken is provided', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
      accessToken: 'test-access-token-value',
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload.at_hash).to.be.a('string');
    // at_hash should be base64url encoded (no padding, no +/)
    expect(payload.at_hash as string).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('omits optional user fields from claims', async () => {
    const user = makeUser({ name: null, avatarUrl: null });
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    expect(payload).to.not.have.property('name');
    expect(payload).to.not.have.property('picture');
    expect(payload.preferred_username).to.equal('alice');
  });

  it('sets kid in JWT header', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    // Decode the header (first part of JWT)
    const headerB64 = token.split('.')[0];
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

    expect(header.alg).to.equal('RS256');
    expect(header.typ).to.equal('JWT');
    expect(header.kid).to.equal('test-kid-001');
  });

  it('respects scope hierarchy with admin scope', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['admin'], privateJwk, {
      issuer: 'https://api.tampa.dev',
      authTime: 1700000000,
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://api.tampa.dev',
      audience: 'client-1',
    });

    // admin implies user implies read:user + user:email
    expect(payload.name).to.equal('Alice');
    expect(payload.email).to.equal('alice@tampa.dev');
  });

  it('includes entitlements custom claim when provided', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://tampa.dev',
      authTime: 1700000000,
      entitlements: ['dev.tampa.group.create', 'dev.tampa.feature.beta'],
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://tampa.dev',
      audience: 'client-1',
    });

    const entitlements = payload['https://tampa.dev/entitlements'] as string[];
    expect(entitlements).to.deep.equal(['dev.tampa.group.create', 'dev.tampa.feature.beta']);
  });

  it('omits entitlements custom claim when empty', async () => {
    const user = makeUser();
    const token = await generateIdToken(user, 'client-1', ['read:user'], privateJwk, {
      issuer: 'https://tampa.dev',
      authTime: 1700000000,
      entitlements: [],
    });

    const payload = await verifyIdToken(token, publicJwk, {
      issuer: 'https://tampa.dev',
      audience: 'client-1',
    });

    expect(payload).to.not.have.property('https://tampa.dev/entitlements');
  });
});

describe('getCanonicalIssuer', () => {
  it('returns origin for localhost', () => {
    expect(getCanonicalIssuer('http://localhost/path')).to.equal('http://localhost');
    expect(getCanonicalIssuer('http://localhost:3000/path')).to.equal('http://localhost:3000');
  });

  it('returns origin for 127.0.0.1', () => {
    expect(getCanonicalIssuer('http://127.0.0.1/path')).to.equal('http://127.0.0.1');
  });

  it('returns https://staging.tampa.dev for staging hostnames', () => {
    expect(getCanonicalIssuer('https://staging.tampa.dev/path')).to.equal('https://staging.tampa.dev');
    expect(getCanonicalIssuer('https://api-staging.tampa.dev/path')).to.equal('https://staging.tampa.dev');
    expect(getCanonicalIssuer('https://events-staging.api.tampa.dev/path')).to.equal('https://staging.tampa.dev');
  });

  it('returns https://tampa.dev for production hostnames', () => {
    expect(getCanonicalIssuer('https://tampa.dev/path')).to.equal('https://tampa.dev');
    expect(getCanonicalIssuer('https://api.tampa.dev/path')).to.equal('https://tampa.dev');
    expect(getCanonicalIssuer('https://events.api.tampa.dev/path')).to.equal('https://tampa.dev');
  });
});
