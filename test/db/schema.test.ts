import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as schema from '../../src/db/schema.js';

describe('Database Schema', () => {
  describe('Core tables', () => {
    it('should export groups table', () => {
      expect(schema.groups).to.exist;
    });

    it('should export events table', () => {
      expect(schema.events).to.exist;
    });

    it('should export venues table', () => {
      expect(schema.venues).to.exist;
    });

    it('should export users table', () => {
      expect(schema.users).to.exist;
    });

    it('should export sessions table', () => {
      expect(schema.sessions).to.exist;
    });

    it('should export userIdentities table', () => {
      expect(schema.userIdentities).to.exist;
    });

    it('should export syncLogs table', () => {
      expect(schema.syncLogs).to.exist;
    });
  });

  describe('User engagement tables', () => {
    it('should export userFavorites table', () => {
      expect(schema.userFavorites).to.exist;
    });

    it('should export badges table', () => {
      expect(schema.badges).to.exist;
    });

    it('should export userBadges table', () => {
      expect(schema.userBadges).to.exist;
    });

    it('should export userPortfolioItems table', () => {
      expect(schema.userPortfolioItems).to.exist;
    });
  });

  describe('Feature flags tables', () => {
    it('should export featureFlags table', () => {
      expect(schema.featureFlags).to.exist;
    });

    it('should export userFeatureFlags table', () => {
      expect(schema.userFeatureFlags).to.exist;
    });

    it('should export groupFeatureFlags table', () => {
      expect(schema.groupFeatureFlags).to.exist;
    });
  });

  describe('Enum constants', () => {
    it('should export EventPlatform with correct values', () => {
      expect(schema.EventPlatform.MEETUP).to.equal('meetup');
      expect(schema.EventPlatform.EVENTBRITE).to.equal('eventbrite');
      expect(schema.EventPlatform.LUMA).to.equal('luma');
    });

    it('should export EventStatus with correct values', () => {
      expect(schema.EventStatus.ACTIVE).to.equal('active');
      expect(schema.EventStatus.CANCELLED).to.equal('cancelled');
      expect(schema.EventStatus.DRAFT).to.equal('draft');
    });

    it('should export EventType with correct values', () => {
      expect(schema.EventType.PHYSICAL).to.equal('physical');
      expect(schema.EventType.ONLINE).to.equal('online');
      expect(schema.EventType.HYBRID).to.equal('hybrid');
    });

    it('should export UserRole with correct values', () => {
      expect(schema.UserRole.USER).to.equal('user');
      expect(schema.UserRole.ADMIN).to.equal('admin');
      expect(schema.UserRole.SUPERADMIN).to.equal('superadmin');
    });

    it('should export SyncStatus with correct values', () => {
      expect(schema.SyncStatus.RUNNING).to.equal('running');
      expect(schema.SyncStatus.SUCCESS).to.equal('success');
      expect(schema.SyncStatus.FAILED).to.equal('failed');
    });
  });
});
