import { expect } from 'chai';
import { MeetupTransformer, Event, EventStatus, EventType } from '../../../models/index.js';

describe('MeetupTransformer', () => {
  const mockMeetupData = {
    'tampadevs': {
      id: 'group-123',
      name: 'Tampa Devs',
      urlname: 'tampadevs',
      link: 'https://meetup.com/tampadevs',
      keyGroupPhoto: {
        id: 'photo-123',
        baseUrl: 'https://photos.meetup.com/',
      },
      memberships: {
        totalCount: 500,
      },
      events: {
        edges: [
          {
            node: {
              id: 'event-123',
              title: 'TypeScript Workshop',
              description: 'Learn TypeScript',
              dateTime: '2026-02-15T18:00:00-05:00',
              duration: 'PT2H',
              eventUrl: 'https://meetup.com/tampadevs/events/123',
              status: 'ACTIVE',
              eventType: 'PHYSICAL',
              rsvps: {
                totalCount: 25,
              },
              venues: [
                {
                  name: 'Tech Hub Tampa',
                  address: '123 Main St',
                  city: 'Tampa',
                  state: 'FL',
                  postalCode: '33602',
                  lat: 27.9506,
                  lon: -82.4572,
                },
              ],
              featuredEventPhoto: {
                id: 'event-photo-123',
                baseUrl: 'https://photos.meetup.com/',
              },
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
        },
        totalCount: 1,
      },
    },
  };

  describe('validate()', () => {
    it('should validate correct Meetup data structure', () => {
      expect(() => {
        MeetupTransformer.validate(mockMeetupData);
      }).to.not.throw();
    });

    it('should throw on invalid data structure', () => {
      expect(() => {
        MeetupTransformer.validate({ invalid: 'data' });
      }).to.throw();
    });
  });

  describe('transformAll()', () => {
    it('should transform Meetup data to Event models', () => {
      const events = MeetupTransformer.transformAll(mockMeetupData);

      expect(events).to.be.an('array');
      expect(events).to.have.lengthOf(1);
      expect(events[0]).to.be.instanceOf(Event);
    });

    it('should correctly map event properties', () => {
      const events = MeetupTransformer.transformAll(mockMeetupData);
      const event = events[0];

      expect(event.id).to.equal('event-123');
      expect(event.title).to.equal('TypeScript Workshop');
      expect(event.description).to.equal('Learn TypeScript');
      expect(event.eventUrl).to.equal('https://meetup.com/tampadevs/events/123');
      expect(event.rsvpCount).to.equal(25);
      expect(event.status).to.equal(EventStatus.ACTIVE);
      expect(event.eventType).to.equal(EventType.PHYSICAL);
    });

    it('should correctly map group properties', () => {
      const events = MeetupTransformer.transformAll(mockMeetupData);
      const event = events[0];

      expect(event.group.id).to.equal('group-123');
      expect(event.group.name).to.equal('Tampa Devs');
      expect(event.group.urlname).to.equal('tampadevs');
      expect(event.group.memberCount).to.equal(500);
    });

    it('should correctly map venue properties', () => {
      const events = MeetupTransformer.transformAll(mockMeetupData);
      const event = events[0];

      expect(event.venues).to.have.lengthOf(1);
      const venue = event.venues[0];
      expect(venue.name).to.equal('Tech Hub Tampa');
      expect(venue.address).to.equal('123 Main St');
      expect(venue.city).to.equal('Tampa');
      expect(venue.state).to.equal('FL');
      expect(venue.lat).to.equal(27.9506);
      expect(venue.lon).to.equal(-82.4572);
    });

    it('should handle events with no photo', () => {
      const dataWithoutPhoto = {
        'tampadevs': {
          ...mockMeetupData['tampadevs'],
          events: {
            edges: [
              {
                node: {
                  ...mockMeetupData['tampadevs'].events.edges[0].node,
                  featuredEventPhoto: undefined,
                },
              },
            ],
            pageInfo: { hasNextPage: false },
            totalCount: 1,
          },
        },
      };

      const events = MeetupTransformer.transformAll(dataWithoutPhoto);
      expect(events[0].photo).to.be.undefined;
    });

    it('should handle events with no rsvps', () => {
      const dataWithoutRsvps = {
        'tampadevs': {
          ...mockMeetupData['tampadevs'],
          events: {
            edges: [
              {
                node: {
                  ...mockMeetupData['tampadevs'].events.edges[0].node,
                  rsvps: undefined,
                },
              },
            ],
            pageInfo: { hasNextPage: false },
            totalCount: 1,
          },
        },
      };

      const events = MeetupTransformer.transformAll(dataWithoutRsvps);
      expect(events[0].rsvpCount).to.equal(0);
    });
  });

  describe('transformByGroup()', () => {
    it('should group events by their group', () => {
      const grouped = MeetupTransformer.transformByGroup(mockMeetupData);

      expect(grouped).to.be.instanceOf(Map);
      expect(grouped.size).to.equal(1);

      const [group, events] = Array.from(grouped.entries())[0];
      expect(group.urlname).to.equal('tampadevs');
      expect(events).to.have.lengthOf(1);
      expect(events[0]).to.be.instanceOf(Event);
    });
  });

  describe('transformEventStatus()', () => {
    it('should transform ACTIVE status', () => {
      const status = MeetupTransformer.transformEventStatus('ACTIVE');
      expect(status).to.equal(EventStatus.ACTIVE);
    });

    it('should transform CANCELLED status', () => {
      const status = MeetupTransformer.transformEventStatus('CANCELLED');
      expect(status).to.equal(EventStatus.CANCELLED);
    });

    it('should transform DRAFT status', () => {
      const status = MeetupTransformer.transformEventStatus('DRAFT');
      expect(status).to.equal(EventStatus.DRAFT);
    });

    it('should default to ACTIVE for unknown status', () => {
      const status = MeetupTransformer.transformEventStatus('UNKNOWN');
      expect(status).to.equal(EventStatus.ACTIVE);
    });
  });

  describe('transformEventType()', () => {
    it('should transform PHYSICAL type', () => {
      const type = MeetupTransformer.transformEventType('PHYSICAL');
      expect(type).to.equal(EventType.PHYSICAL);
    });

    it('should transform ONLINE type', () => {
      const type = MeetupTransformer.transformEventType('ONLINE');
      expect(type).to.equal(EventType.ONLINE);
    });

    it('should transform HYBRID type', () => {
      const type = MeetupTransformer.transformEventType('HYBRID');
      expect(type).to.equal(EventType.HYBRID);
    });

    it('should return undefined for unknown type', () => {
      const type = MeetupTransformer.transformEventType('UNKNOWN');
      expect(type).to.be.undefined;
    });
  });

  describe('Multiple Groups', () => {
    it('should handle multiple groups with multiple events', () => {
      const multiGroupData = {
        'tampadevs': mockMeetupData['tampadevs'],
        'suncoast-js': {
          id: 'group-456',
          name: 'Suncoast JS',
          urlname: 'suncoast-js',
          link: 'https://meetup.com/suncoast-js',
          keyGroupPhoto: {
            id: 'photo-456',
            baseUrl: 'https://photos.meetup.com/',
          },
          memberships: {
            totalCount: 300,
          },
          events: {
            edges: [
              {
                node: {
                  id: 'event-456',
                  title: 'JavaScript Fundamentals',
                  dateTime: '2026-02-20T19:00:00-05:00',
                  duration: 'PT1H30M',
                  eventUrl: 'https://meetup.com/suncoast-js/events/456',
                  rsvps: { totalCount: 15 },
                  venues: [],
                },
              },
            ],
            pageInfo: { hasNextPage: false },
            totalCount: 1,
          },
        },
      };

      const events = MeetupTransformer.transformAll(multiGroupData);
      expect(events).to.have.lengthOf(2);

      const tampaDevsEvent = events.find((e) => e.group.urlname === 'tampadevs');
      const suncoastJsEvent = events.find((e) => e.group.urlname === 'suncoast-js');

      expect(tampaDevsEvent).to.exist;
      expect(suncoastJsEvent).to.exist;
      expect(suncoastJsEvent?.title).to.equal('JavaScript Fundamentals');
    });
  });
});
