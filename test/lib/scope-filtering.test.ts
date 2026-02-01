import { describe, it } from 'mocha';
import { expect } from 'chai';
import { filterScopesForUser } from '../../src/lib/scopes.js';

describe('filterScopesForUser', () => {
  it('strips admin scope for regular users', () => {
    const result = filterScopesForUser(['user', 'read:events', 'admin'], { role: 'user' });
    expect(result).to.deep.equal(['user', 'read:events']);
  });

  it('preserves admin scope for admin users', () => {
    const result = filterScopesForUser(['user', 'admin'], { role: 'admin' });
    expect(result).to.deep.equal(['user', 'admin']);
  });

  it('preserves admin scope for superadmin users', () => {
    const result = filterScopesForUser(['user', 'admin'], { role: 'superadmin' });
    expect(result).to.deep.equal(['user', 'admin']);
  });

  it('preserves manage:* scopes for all users', () => {
    const scopes = ['manage:groups', 'manage:events', 'manage:checkins', 'manage:badges'];
    const result = filterScopesForUser(scopes, { role: 'user' });
    expect(result).to.deep.equal(scopes);
  });

  it('returns empty array when only admin scope is present for non-admin', () => {
    const result = filterScopesForUser(['admin'], { role: 'user' });
    expect(result).to.deep.equal([]);
  });

  it('handles empty input', () => {
    const result = filterScopesForUser([], { role: 'user' });
    expect(result).to.deep.equal([]);
  });

  it('passes through all scopes for admin users unchanged', () => {
    const allScopes = [
      'user', 'read:user', 'user:email',
      'read:events', 'write:events',
      'read:groups', 'read:favorites', 'write:favorites',
      'read:portfolio', 'write:portfolio',
      'manage:groups', 'manage:events', 'manage:checkins', 'manage:badges',
      'admin',
    ];
    const result = filterScopesForUser(allScopes, { role: 'admin' });
    expect(result).to.deep.equal(allScopes);
  });

  it('does not modify the original array', () => {
    const original = ['user', 'admin', 'read:events'];
    const copy = [...original];
    filterScopesForUser(original, { role: 'user' });
    expect(original).to.deep.equal(copy);
  });
});
