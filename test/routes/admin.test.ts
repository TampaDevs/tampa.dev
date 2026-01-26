import { describe, it } from 'mocha';
import { expect } from 'chai';
// Import to ensure platforms are registered
import '../../src/scheduled/aggregator.js';
import { platformRegistry } from '../../src/scheduled/platforms/base.js';
import { getAllGroups } from '../../src/scheduled/groups.js';

describe('Service Routes', () => {
  describe('GET /service/status', () => {
    it('should list all registered platforms', () => {
      const platforms = platformRegistry.getAll();

      expect(platforms).to.be.an('array');
      expect(platforms.length).to.be.greaterThan(0);
    });

    it('should check if platforms are configured', () => {
      const mockEnv = {
        kv: {},
        CF_VERSION_METADATA: { id: '', tag: '', timestamp: '' },
        MEETUP_CLIENT_KEY: undefined,
        MEETUP_SIGNING_KEY: undefined,
        MEETUP_MEMBER_ID: undefined,
      };

      const platforms = platformRegistry.getAll();

      platforms.forEach((platform) => {
        const configured = platform.isConfigured(mockEnv as any);
        expect(typeof configured).to.equal('boolean');
      });
    });

    it('should count total groups', () => {
      const groups = getAllGroups();

      expect(groups.length).to.be.greaterThan(0);
    });

    it('should report unconfigured when secrets are missing', () => {
      const mockEnv = {
        kv: {},
        CF_VERSION_METADATA: { id: '', tag: '', timestamp: '' },
      };

      // When no secrets are set, platforms should report as not configured
      const platforms = platformRegistry.getConfigured(mockEnv as any);
      expect(platforms).to.be.an('array');
      expect(platforms.length).to.equal(0);
    });
  });
});
