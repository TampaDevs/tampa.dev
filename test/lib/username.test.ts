import { describe, it } from 'mocha';
import { expect } from 'chai';
import { sanitizeUsername, RESERVED_USERNAMES, USERNAME_REGEX } from '../../src/lib/username.js';

describe('Username Utilities', () => {
  describe('sanitizeUsername', () => {
    it('lowercases the input', () => {
      expect(sanitizeUsername('JohnSmith')).to.equal('johnsmith');
    });

    it('replaces spaces and special chars with hyphens', () => {
      expect(sanitizeUsername('John Smith')).to.equal('john-smith');
    });

    it('collapses consecutive hyphens', () => {
      expect(sanitizeUsername('john---smith')).to.equal('john-smith');
    });

    it('strips leading and trailing hyphens', () => {
      expect(sanitizeUsername('-john-smith-')).to.equal('john-smith');
    });

    it('handles dots and underscores', () => {
      expect(sanitizeUsername('john.smith_dev')).to.equal('john-smith-dev');
    });

    it('handles non-ASCII characters', () => {
      expect(sanitizeUsername('José García')).to.equal('jos-garc-a');
    });

    it('truncates to 30 characters', () => {
      const long = 'a'.repeat(50);
      expect(sanitizeUsername(long).length).to.be.at.most(30);
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeUsername('')).to.equal('');
    });

    it('handles pure special characters', () => {
      expect(sanitizeUsername('!!!@@@')).to.equal('');
    });

    it('preserves numbers', () => {
      expect(sanitizeUsername('user123')).to.equal('user123');
    });

    it('handles GitHub-style usernames with hyphens', () => {
      expect(sanitizeUsername('octo-cat')).to.equal('octo-cat');
    });
  });

  describe('RESERVED_USERNAMES', () => {
    it('includes common reserved words', () => {
      expect(RESERVED_USERNAMES).to.include('admin');
      expect(RESERVED_USERNAMES).to.include('api');
      expect(RESERVED_USERNAMES).to.include('login');
      expect(RESERVED_USERNAMES).to.include('profile');
      expect(RESERVED_USERNAMES).to.include('settings');
    });

    it('all entries match the username regex', () => {
      for (const name of RESERVED_USERNAMES) {
        expect(USERNAME_REGEX.test(name), `"${name}" should match USERNAME_REGEX`).to.be.true;
      }
    });
  });
});
