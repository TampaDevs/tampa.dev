import { describe, it } from 'mocha';
import { expect } from 'chai';
import { EventController } from '../../src/controllers/EventController.js';
import { allTestEvents, mockMeetupData } from '../fixtures/events.js';

describe('EventController', () => {
  // Mock Context
  function createMockContext(queryParams: Record<string, string> = {}) {
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
        kv: {
          get: async (key: string) => {
            if (key === 'event_data') {
              return JSON.stringify(mockMeetupData);
            }
            return null;
          },
        },
      },
    } as any;
  }

  describe('loadRawData()', () => {
    it('should load raw data from KV store', async () => {
      const c = createMockContext();
      const rawData = await EventController.loadRawData(c);

      expect(rawData).to.be.an('object');
      expect(rawData).to.have.property('tampa-devs');
    });

    it('should throw error when no data available', async () => {
      const c = createMockContext();
      c.env.kv.get = async () => null;

      try {
        await EventController.loadRawData(c);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('No event data available');
      }
    });
  });

  describe('getQueryParams()', () => {
    it('should extract query parameters', () => {
      const c = createMockContext({
        groups: 'tampa-devs,suncoast-js',
        noonline: '1',
        within_days: '7',
      });

      const params = EventController.getQueryParams(c);

      expect(params).to.deep.equal({
        groups: 'tampa-devs,suncoast-js',
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

  describe('loadEvents()', () => {
    it('should load and transform events', async () => {
      const c = createMockContext();
      const events = await EventController.loadEvents(c);

      expect(events).to.be.an('array');
      expect(events.length).to.be.greaterThan(0);
      expect(events[0]).to.have.property('id');
      expect(events[0]).to.have.property('title');
      expect(events[0]).to.have.property('group');
    });

    it('should filter events by groups param', async () => {
      const c = createMockContext({ groups: 'tampa-devs' });
      const events = await EventController.loadEvents(c);

      expect(events).to.be.an('array');
      events.forEach(event => {
        expect(event.group.urlname).to.equal('tampa-devs');
      });
    });
  });

  describe('getAllEvents()', () => {
    it('should return all active events', async () => {
      const c = createMockContext();
      const events = await EventController.getAllEvents(c);

      expect(events).to.be.an('array');
      expect(events.length).to.be.greaterThan(0);
      events.forEach(event => {
        expect(event.status).to.not.equal('CANCELLED');
      });
    });
  });

  describe('getNextEvents()', () => {
    it('should return next event per group', async () => {
      const c = createMockContext();
      const events = await EventController.getNextEvents(c);

      expect(events).to.be.an('array');

      // Should have unique groups
      const groupUrls = events.map(e => e.group.urlname);
      const uniqueGroups = new Set(groupUrls);
      expect(groupUrls.length).to.equal(uniqueGroups.size);
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
});
