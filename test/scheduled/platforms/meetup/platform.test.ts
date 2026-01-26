import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MeetupPlatform } from '../../../../src/scheduled/platforms/meetup/index.js';
import type { Env } from '../../../../src/app.js';

describe('Meetup Platform', () => {
  function createMockEnv(overrides: Partial<Env> = {}): Env {
    return {
      kv: {} as KVNamespace,
      CF_VERSION_METADATA: {
        id: 'test-version',
        tag: 'test-tag',
        timestamp: new Date().toISOString(),
      },
      MEETUP_CLIENT_KEY: undefined,
      MEETUP_SIGNING_KEY: undefined,
      MEETUP_MEMBER_ID: undefined,
      ...overrides,
    };
  }

  describe('platform name', () => {
    it('should have name "meetup"', () => {
      const platform = new MeetupPlatform();
      expect(platform.name).to.equal('meetup');
    });
  });

  describe('isConfigured()', () => {
    it('should return false when no secrets are set', () => {
      const platform = new MeetupPlatform();
      const env = createMockEnv();

      expect(platform.isConfigured(env)).to.be.false;
    });

    it('should return false when only some secrets are set', () => {
      const platform = new MeetupPlatform();

      const env1 = createMockEnv({ MEETUP_CLIENT_KEY: 'key' });
      expect(platform.isConfigured(env1)).to.be.false;

      const env2 = createMockEnv({
        MEETUP_CLIENT_KEY: 'key',
        MEETUP_SIGNING_KEY: 'signing',
      });
      expect(platform.isConfigured(env2)).to.be.false;
    });

    it('should return true when all secrets are set', () => {
      const platform = new MeetupPlatform();
      const env = createMockEnv({
        MEETUP_CLIENT_KEY: 'key',
        MEETUP_SIGNING_KEY: 'signing',
        MEETUP_MEMBER_ID: '12345',
      });

      expect(platform.isConfigured(env)).to.be.true;
    });
  });

  describe('fetchGroupEvents()', () => {
    it('should return error if not initialized', async () => {
      const platform = new MeetupPlatform();

      const result = await platform.fetchGroupEvents('tampadevs');

      expect(result.success).to.be.false;
      expect(result.error).to.include('not initialized');
    });
  });

  describe('EventPlatform interface', () => {
    it('should implement required interface methods', () => {
      const platform = new MeetupPlatform();

      expect(platform).to.have.property('name');
      expect(platform).to.have.property('initialize');
      expect(platform).to.have.property('fetchGroupEvents');
      expect(platform).to.have.property('isConfigured');

      expect(typeof platform.name).to.equal('string');
      expect(typeof platform.initialize).to.equal('function');
      expect(typeof platform.fetchGroupEvents).to.equal('function');
      expect(typeof platform.isConfigured).to.equal('function');
    });
  });
});
