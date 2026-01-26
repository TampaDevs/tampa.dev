import { describe, it } from 'mocha';
import { expect } from 'chai';
import { platformRegistry } from '../../src/scheduled/platforms/base.js';
import { getAllGroups, getGroupsByPlatform, MEETUP_GROUPS } from '../../src/scheduled/groups.js';
// Import aggregator to trigger platform registration
import '../../src/scheduled/aggregator.js';
import type { Env } from '../../src/app.js';

describe('Aggregator', () => {
  describe('PlatformRegistry', () => {
    it('should have meetup platform registered', () => {
      const meetup = platformRegistry.get('meetup');
      expect(meetup).to.not.be.undefined;
      expect(meetup?.name).to.equal('meetup');
    });

    it('should return undefined for unknown platforms', () => {
      const unknown = platformRegistry.get('unknown-platform');
      expect(unknown).to.be.undefined;
    });

    it('should list all registered platforms', () => {
      const platforms = platformRegistry.getAll();
      expect(platforms).to.be.an('array');
      expect(platforms.length).to.be.greaterThan(0);

      const names = platforms.map((p) => p.name);
      expect(names).to.include('meetup');
    });
  });

  describe('Groups Configuration', () => {
    it('should have meetup groups defined', () => {
      expect(MEETUP_GROUPS).to.be.an('array');
      expect(MEETUP_GROUPS.length).to.be.greaterThan(0);
    });

    it('should include tampadevs group', () => {
      expect(MEETUP_GROUPS).to.include('tampadevs');
    });

    it('should have valid group urlnames', () => {
      MEETUP_GROUPS.forEach((urlname) => {
        expect(urlname).to.be.a('string');
        expect(urlname.length).to.be.greaterThan(0);
        // Urlnames should not have spaces
        expect(urlname).to.not.include(' ');
      });
    });

    it('should have at least 30 groups configured', () => {
      // Based on the original groups.yml
      expect(MEETUP_GROUPS.length).to.be.greaterThanOrEqual(30);
    });
  });

  describe('getAllGroups()', () => {
    it('should return array of group configs', () => {
      const groups = getAllGroups();

      expect(groups).to.be.an('array');
      expect(groups.length).to.equal(MEETUP_GROUPS.length);
    });

    it('should include platform and maxEvents for each group', () => {
      const groups = getAllGroups();

      groups.forEach((group) => {
        expect(group).to.have.property('urlname');
        expect(group).to.have.property('platform');
        expect(group).to.have.property('maxEvents');
        expect(group.platform).to.equal('meetup');
        expect(group.maxEvents).to.equal(25);
      });
    });
  });

  describe('getGroupsByPlatform()', () => {
    it('should return groups for meetup platform', () => {
      const groups = getGroupsByPlatform('meetup');

      expect(groups).to.be.an('array');
      expect(groups.length).to.equal(MEETUP_GROUPS.length);
      groups.forEach((group) => {
        expect(group.platform).to.equal('meetup');
      });
    });

    it('should return empty array for unknown platform', () => {
      const groups = getGroupsByPlatform('unknown');

      expect(groups).to.be.an('array');
      expect(groups.length).to.equal(0);
    });
  });

  describe('AggregationResult structure', () => {
    it('should define expected result fields', () => {
      const result = {
        success: true,
        groupsProcessed: 10,
        groupsFailed: 2,
        errors: ['error 1'],
        durationMs: 5000,
      };

      expect(result).to.have.property('success');
      expect(result).to.have.property('groupsProcessed');
      expect(result).to.have.property('groupsFailed');
      expect(result).to.have.property('errors');
      expect(result).to.have.property('durationMs');

      expect(result.success).to.be.a('boolean');
      expect(result.groupsProcessed).to.be.a('number');
      expect(result.groupsFailed).to.be.a('number');
      expect(result.errors).to.be.an('array');
      expect(result.durationMs).to.be.a('number');
    });
  });
});
