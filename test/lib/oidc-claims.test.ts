import { describe, it } from 'mocha';
import { expect } from 'chai';
import { buildUserClaims } from '../../src/lib/oidc-claims.js';
import type { User } from '../../src/db/schema.js';

// Minimal user factory for unit tests
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@tampa.dev',
    name: 'Test User',
    username: 'testuser',
    bio: null,
    socialLinks: null,
    avatarUrl: 'https://example.com/avatar.jpg',
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

describe('buildUserClaims', () => {
  it('always returns sub claim', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, []);
    expect(claims).to.have.property('sub', 'user-123');
  });

  it('returns only sub when no profile or email scopes', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['read:events']);
    expect(Object.keys(claims)).to.deep.equal(['sub']);
  });

  it('returns profile claims with read:user scope', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['read:user']);

    expect(claims.sub).to.equal('user-123');
    expect(claims.name).to.equal('Test User');
    expect(claims.preferred_username).to.equal('testuser');
    expect(claims.picture).to.equal('https://example.com/avatar.jpg');
    expect(claims.profile).to.equal('https://tampa.dev/users/testuser');
    expect(claims.updated_at).to.be.a('number');
    // Should NOT include email claims
    expect(claims).to.not.have.property('email');
    expect(claims).to.not.have.property('email_verified');
  });

  it('returns email claims with user:email scope', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['user:email']);

    expect(claims.sub).to.equal('user-123');
    expect(claims.email).to.equal('test@tampa.dev');
    expect(claims.email_verified).to.equal(true);
    // Should NOT include profile claims
    expect(claims).to.not.have.property('name');
    expect(claims).to.not.have.property('preferred_username');
  });

  it('returns both profile and email claims with user scope (hierarchy)', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['user']);

    expect(claims.name).to.equal('Test User');
    expect(claims.preferred_username).to.equal('testuser');
    expect(claims.email).to.equal('test@tampa.dev');
    expect(claims.email_verified).to.equal(true);
  });

  it('returns all claims with admin scope (hierarchy)', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['admin']);

    expect(claims.name).to.equal('Test User');
    expect(claims.preferred_username).to.equal('testuser');
    expect(claims.picture).to.equal('https://example.com/avatar.jpg');
    expect(claims.email).to.equal('test@tampa.dev');
    expect(claims.email_verified).to.equal(true);
  });

  it('returns all claims for session auth (scopes === null)', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, null);

    expect(claims.name).to.equal('Test User');
    expect(claims.preferred_username).to.equal('testuser');
    expect(claims.picture).to.equal('https://example.com/avatar.jpg');
    expect(claims.profile).to.equal('https://tampa.dev/users/testuser');
    expect(claims.email).to.equal('test@tampa.dev');
    expect(claims.email_verified).to.equal(true);
  });

  it('omits name when user has no name', () => {
    const user = makeUser({ name: null });
    const claims = buildUserClaims(user, ['read:user']);

    expect(claims).to.not.have.property('name');
    expect(claims.preferred_username).to.equal('testuser');
  });

  it('omits picture when user has no avatarUrl', () => {
    const user = makeUser({ avatarUrl: null });
    const claims = buildUserClaims(user, ['read:user']);

    expect(claims).to.not.have.property('picture');
  });

  it('omits email when user has no email despite having scope', () => {
    const user = makeUser({ email: '' });
    const claims = buildUserClaims(user, ['user:email']);

    // Empty string is falsy, so email should not be included
    expect(claims).to.not.have.property('email');
  });

  it('returns claims for private profile user (consent overrides visibility)', () => {
    const user = makeUser({ profileVisibility: 'private' });
    const claims = buildUserClaims(user, ['user']);

    expect(claims.name).to.equal('Test User');
    expect(claims.email).to.equal('test@tampa.dev');
  });

  it('computes updated_at as Unix timestamp', () => {
    const user = makeUser({ updatedAt: '2024-06-01T12:00:00Z' });
    const claims = buildUserClaims(user, ['read:user']);

    const expected = Math.floor(new Date('2024-06-01T12:00:00Z').getTime() / 1000);
    expect(claims.updated_at).to.equal(expected);
  });

  it('resolves profile alias to read:user via scope hierarchy', () => {
    const user = makeUser();
    // 'profile' is a legacy alias for 'user' which implies 'read:user'
    const claims = buildUserClaims(user, ['profile']);

    expect(claims.name).to.equal('Test User');
    expect(claims.preferred_username).to.equal('testuser');
  });

  it('resolves email alias to user:email via scope hierarchy', () => {
    const user = makeUser();
    // 'email' is a legacy alias for 'user:email'
    const claims = buildUserClaims(user, ['email']);

    expect(claims.email).to.equal('test@tampa.dev');
    expect(claims.email_verified).to.equal(true);
  });

  it('includes entitlements custom claim when read:user scope and entitlements provided', () => {
    const user = makeUser();
    const entitlements = ['dev.tampa.group.create', 'dev.tampa.feature.beta'];
    const claims = buildUserClaims(user, ['read:user'], { entitlements });

    expect(claims['https://tampa.dev/entitlements']).to.deep.equal([
      'dev.tampa.group.create',
      'dev.tampa.feature.beta',
    ]);
  });

  it('omits entitlements when read:user scope is missing', () => {
    const user = makeUser();
    const entitlements = ['dev.tampa.group.create'];
    const claims = buildUserClaims(user, ['user:email'], { entitlements });

    expect(claims).to.not.have.property('https://tampa.dev/entitlements');
  });

  it('omits entitlements when entitlements array is empty', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['read:user'], { entitlements: [] });

    expect(claims).to.not.have.property('https://tampa.dev/entitlements');
  });

  it('includes entitlements for session auth (scopes === null)', () => {
    const user = makeUser();
    const entitlements = ['dev.tampa.group.create'];
    const claims = buildUserClaims(user, null, { entitlements });

    expect(claims['https://tampa.dev/entitlements']).to.deep.equal(['dev.tampa.group.create']);
  });

  it('omits entitlements when options not provided', () => {
    const user = makeUser();
    const claims = buildUserClaims(user, ['read:user']);

    expect(claims).to.not.have.property('https://tampa.dev/entitlements');
  });
});
