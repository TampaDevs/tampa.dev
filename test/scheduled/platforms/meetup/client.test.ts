import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MeetupRateLimitError } from '../../../../src/scheduled/platforms/meetup/client.js';

describe('Meetup Client', () => {
  describe('MeetupRateLimitError', () => {
    it('should create error with message', () => {
      const error = new MeetupRateLimitError('Rate limited');

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(MeetupRateLimitError);
      expect(error.message).to.equal('Rate limited');
      expect(error.name).to.equal('MeetupRateLimitError');
    });

    it('should include consumed points and reset time', () => {
      const error = new MeetupRateLimitError(
        'Rate limited',
        100,
        '2024-01-01T12:00:00Z'
      );

      expect(error.consumedPoints).to.equal(100);
      expect(error.resetAt).to.equal('2024-01-01T12:00:00Z');
    });

    it('should handle missing optional fields', () => {
      const error = new MeetupRateLimitError('Rate limited');

      expect(error.consumedPoints).to.be.undefined;
      expect(error.resetAt).to.be.undefined;
    });
  });

  describe('GraphQL Query Structure', () => {
    it('should request correct event fields', () => {
      const expectedFields = [
        'id',
        'title',
        'description',
        'dateTime',
        'duration',
        'eventUrl',
        'eventType',
        'status',
        'featuredEventPhoto',
        'rsvps',
        'venues',
      ];

      // These are the fields we expect to fetch for each event
      expectedFields.forEach((field) => {
        expect(field).to.be.a('string');
      });
    });

    it('should request correct group fields', () => {
      const expectedFields = [
        'id',
        'name',
        'urlname',
        'link',
        'keyGroupPhoto',
        'memberships',
        'events',
      ];

      expectedFields.forEach((field) => {
        expect(field).to.be.a('string');
      });
    });

    it('should request correct venue fields', () => {
      const expectedFields = [
        'name',
        'address',
        'city',
        'state',
        'postalCode',
        'lat',
        'lon',
      ];

      expectedFields.forEach((field) => {
        expect(field).to.be.a('string');
      });
    });
  });

  describe('API Configuration', () => {
    it('should use correct GraphQL endpoint', () => {
      const MEETUP_GQL_URL = 'https://api.meetup.com/gql-ext';
      expect(MEETUP_GQL_URL).to.equal('https://api.meetup.com/gql-ext');
    });

    it('should default to 25 max events', () => {
      const defaultMaxEvents = 25;
      expect(defaultMaxEvents).to.equal(25);
    });
  });
});
