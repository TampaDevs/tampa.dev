import { describe, it } from 'mocha';
import { expect } from 'chai';
import { EventController } from '../../src/controllers/EventController.js';
import { daysFromNow } from '../fixtures/events.js';

/**
 * Create mock D1 database results
 */
function createMockDbResults() {
  const groupId = 'group-uuid-1';
  const groupId2 = 'group-uuid-2';

  return {
    groups: [
      {
        id: groupId,
        platform: 'meetup',
        platformId: 'tampadevs',
        urlname: 'tampadevs',
        name: 'Tampa Devs',
        description: 'A community for Tampa Bay developers',
        link: 'https://www.meetup.com/tampadevs',
        memberCount: 5000,
        photoUrl: null,
        isActive: true,
        lastSyncAt: new Date().toISOString(),
        syncError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: groupId2,
        platform: 'meetup',
        platformId: 'suncoast-js',
        urlname: 'suncoast-js',
        name: 'Suncoast JS',
        description: 'JavaScript meetup in St. Petersburg',
        link: 'https://www.meetup.com/suncoast-js',
        memberCount: 3000,
        photoUrl: null,
        isActive: true,
        lastSyncAt: new Date().toISOString(),
        syncError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    events: [
      {
        id: 'event-uuid-1',
        platform: 'meetup',
        platformId: 'event-1',
        groupId: groupId,
        venueId: null,
        title: 'Tampa Devs Monthly Meetup',
        description: 'Join us for our monthly meetup!',
        eventUrl: 'https://www.meetup.com/tampadevs/events/event-1',
        photoUrl: null,
        startTime: daysFromNow(2),
        endTime: null,
        timezone: 'America/New_York',
        duration: 'PT2H',
        status: 'active',
        eventType: 'physical',
        rsvpCount: 45,
        maxAttendees: null,
        isFeatured: false,
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'event-uuid-2',
        platform: 'meetup',
        platformId: 'event-2',
        groupId: groupId2,
        venueId: null,
        title: 'Suncoast JS Workshop',
        description: 'React workshop!',
        eventUrl: 'https://www.meetup.com/suncoast-js/events/event-2',
        photoUrl: null,
        startTime: daysFromNow(5),
        endTime: null,
        timezone: 'America/New_York',
        duration: 'PT3H',
        status: 'active',
        eventType: 'physical',
        rsvpCount: 25,
        maxAttendees: null,
        isFeatured: false,
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'event-uuid-3',
        platform: 'meetup',
        platformId: 'event-3',
        groupId: groupId,
        venueId: null,
        title: 'Tampa Devs Workshop',
        description: 'Hands-on coding workshop',
        eventUrl: 'https://www.meetup.com/tampadevs/events/event-3',
        photoUrl: null,
        startTime: daysFromNow(10),
        endTime: null,
        timezone: 'America/New_York',
        duration: 'PT2H',
        status: 'active',
        eventType: 'hybrid',
        rsvpCount: 30,
        maxAttendees: null,
        isFeatured: false,
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    venues: [],
  };
}

/**
 * Create a mock D1 database that returns test data
 */
function createMockD1(dbResults = createMockDbResults()) {
  // Note: This is a simplified mock. The actual implementation uses Drizzle ORM.
  // Since we can't easily mock Drizzle's query builder, we're testing the
  // controller's public interface through integration-style tests.
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
    }),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
    // Mock for Drizzle's internal usage
    _dbResults: dbResults,
  };
}

// Mock Context
function createMockContext(
  queryParams: Record<string, string> = {},
  dbResults = createMockDbResults()
) {
  const url = new URL('http://localhost:8787/test');
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    req: {
      url: url.toString(),
      query: (key: string) => url.searchParams.get(key),
    },
    env: {
      DB: createMockD1(dbResults),
      kv: {
        get: async () => null,
        put: async () => {},
      },
    },
  } as any;
}

describe('EventController', () => {
  describe('getQueryParams()', () => {
    it('should extract query parameters', () => {
      const c = createMockContext({
        groups: 'tampadevs,suncoast-js',
        noonline: '1',
        within_days: '7',
      });

      const params = EventController.getQueryParams(c);

      expect(params).to.deep.equal({
        groups: 'tampadevs,suncoast-js',
        noonline: '1',
        within_days: '7',
      });
    });

    it('should return empty object when no params', () => {
      const c = createMockContext();
      const params = EventController.getQueryParams(c);

      expect(params).to.deep.equal({});
    });
  });

  describe('generateETag()', () => {
    it('should generate consistent ETag for same data', () => {
      const data = { test: 'data' };
      const etag1 = EventController.generateETag(data);
      const etag2 = EventController.generateETag(data);

      expect(etag1).to.equal(etag2);
      expect(etag1).to.be.a('string');
      expect(etag1.length).to.be.greaterThan(0);
    });

    it('should generate different ETags for different data', () => {
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };

      const etag1 = EventController.generateETag(data1);
      const etag2 = EventController.generateETag(data2);

      expect(etag1).to.not.equal(etag2);
    });
  });

  // Note: The following tests require a real D1 database connection
  // or a more sophisticated mock. They are kept as documentation
  // of the expected behavior.

  describe('loadEvents() - requires D1', () => {
    it('should throw error when DB is not available', async () => {
      const c = createMockContext();
      c.env.DB = null;

      try {
        await EventController.loadEvents(c);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Database not available');
      }
    });
  });

  describe('getAllEvents() - requires D1', () => {
    it('should throw error when DB is not available', async () => {
      const c = createMockContext();
      c.env.DB = null;

      try {
        await EventController.getAllEvents(c);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('getNextEvents() - requires D1', () => {
    it('should throw error when DB is not available', async () => {
      const c = createMockContext();
      c.env.DB = null;

      try {
        await EventController.getNextEvents(c);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });
});
