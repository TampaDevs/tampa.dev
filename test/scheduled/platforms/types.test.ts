import { describe, it } from 'mocha';
import { expect } from 'chai';
import type {
  PlatformGroupData,
  PlatformEventData,
  AggregatedData,
  PlatformFetchResult,
} from '../../../src/scheduled/platforms/types.js';

describe('Platform Types', () => {
  describe('PlatformEventData', () => {
    it('should define required event fields', () => {
      const event: PlatformEventData = {
        id: 'event-123',
        title: 'Test Event',
        dateTime: '2024-01-15T18:00:00',
        eventUrl: 'https://meetup.com/event/123',
        status: 'ACTIVE',
      };

      expect(event.id).to.be.a('string');
      expect(event.title).to.be.a('string');
      expect(event.dateTime).to.be.a('string');
      expect(event.eventUrl).to.be.a('string');
      expect(event.status).to.be.a('string');
    });

    it('should allow optional event fields', () => {
      const event: PlatformEventData = {
        id: 'event-123',
        title: 'Test Event',
        dateTime: '2024-01-15T18:00:00',
        eventUrl: 'https://meetup.com/event/123',
        status: 'ACTIVE',
        description: 'A test event',
        duration: 'PT2H',
        eventType: 'PHYSICAL',
        featuredEventPhoto: {
          id: 'photo-123',
          baseUrl: 'https://example.com/photo',
        },
        rsvps: { totalCount: 50 },
        venues: [
          {
            name: 'Test Venue',
            address: '123 Main St',
            city: 'Tampa',
            state: 'FL',
            postalCode: '33601',
            lat: 27.9506,
            lon: -82.4572,
          },
        ],
      };

      expect(event.description).to.equal('A test event');
      expect(event.duration).to.equal('PT2H');
      expect(event.eventType).to.equal('PHYSICAL');
      expect(event.featuredEventPhoto).to.have.property('baseUrl');
      expect(event.rsvps?.totalCount).to.equal(50);
      expect(event.venues).to.have.lengthOf(1);
    });
  });

  describe('PlatformGroupData', () => {
    it('should define required group fields', () => {
      const group: PlatformGroupData = {
        id: 'group-123',
        name: 'Test Group',
        urlname: 'test-group',
        link: 'https://meetup.com/test-group',
        events: {
          totalCount: 0,
          edges: [],
        },
      };

      expect(group.id).to.be.a('string');
      expect(group.name).to.be.a('string');
      expect(group.urlname).to.be.a('string');
      expect(group.link).to.be.a('string');
      expect(group.events).to.have.property('totalCount');
      expect(group.events).to.have.property('edges');
    });

    it('should allow optional group fields', () => {
      const group: PlatformGroupData = {
        id: 'group-123',
        name: 'Test Group',
        urlname: 'test-group',
        link: 'https://meetup.com/test-group',
        keyGroupPhoto: {
          id: 'photo-123',
          baseUrl: 'https://example.com/photo',
        },
        memberships: { totalCount: 1000 },
        events: {
          totalCount: 5,
          pageInfo: {
            endCursor: 'cursor-123',
            hasNextPage: false,
          },
          edges: [],
        },
      };

      expect(group.keyGroupPhoto).to.have.property('baseUrl');
      expect(group.memberships?.totalCount).to.equal(1000);
      expect(group.events.pageInfo).to.have.property('endCursor');
    });
  });

  describe('AggregatedData', () => {
    it('should be a record keyed by group urlname', () => {
      const data: AggregatedData = {
        tampadevs: {
          id: 'group-1',
          name: 'Tampa Devs',
          urlname: 'tampadevs',
          link: 'https://meetup.com/tampadevs',
          events: { totalCount: 0, edges: [] },
        },
        'another-group': {
          id: 'group-2',
          name: 'Another Group',
          urlname: 'another-group',
          link: 'https://meetup.com/another-group',
          events: { totalCount: 0, edges: [] },
        },
      };

      expect(data).to.have.property('tampadevs');
      expect(data).to.have.property('another-group');
      expect(Object.keys(data)).to.have.lengthOf(2);
    });
  });

  describe('PlatformFetchResult', () => {
    it('should represent successful fetch', () => {
      const result: PlatformFetchResult = {
        success: true,
        data: {
          id: 'group-123',
          name: 'Test Group',
          urlname: 'test-group',
          link: 'https://meetup.com/test-group',
          events: { totalCount: 0, edges: [] },
        },
      };

      expect(result.success).to.be.true;
      expect(result.data).to.not.be.undefined;
      expect(result.error).to.be.undefined;
    });

    it('should represent failed fetch', () => {
      const result: PlatformFetchResult = {
        success: false,
        error: 'Group not found',
      };

      expect(result.success).to.be.false;
      expect(result.error).to.equal('Group not found');
      expect(result.data).to.be.undefined;
    });
  });
});
