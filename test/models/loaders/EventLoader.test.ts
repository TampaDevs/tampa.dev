import { expect } from 'chai';
import { EventLoader, Event, Group, Venue, EventStatus } from '../../../models/index.js';

describe('EventLoader', () => {
  const mockGroup1 = new Group({
    id: 'group-1',
    name: 'Tampa Devs',
    urlname: 'tampa-devs',
    link: 'https://meetup.com/tampa-devs',
    memberCount: 500,
  });

  const mockGroup2 = new Group({
    id: 'group-2',
    name: 'Suncoast JS',
    urlname: 'suncoast-js',
    link: 'https://meetup.com/suncoast-js',
    memberCount: 300,
  });

  const createEvent = (overrides: any = {}) => {
    return new Event({
      id: 'event-1',
      title: 'Test Event',
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
      eventUrl: 'https://example.com/event',
      status: EventStatus.ACTIVE,
      rsvpCount: 10,
      venues: [new Venue({ name: 'Test Venue' })],
      group: mockGroup1,
      ...overrides,
    });
  };

  describe('filter()', () => {
    it('should filter out ended events', () => {
      const pastEvent = createEvent({
        dateTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      });
      const futureEvent = createEvent();

      const filtered = EventLoader.filter([pastEvent, futureEvent]);
      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].id).to.equal(futureEvent.id);
    });

    it('should filter by group urlnames', () => {
      const tampaEvent = createEvent({ group: mockGroup1 });
      const suncoastEvent = createEvent({ group: mockGroup2 });

      const filtered = EventLoader.filter([tampaEvent, suncoastEvent], {
        groups: ['tampa-devs'],
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].group.urlname).to.equal('tampa-devs');
    });

    it('should exclude online events', () => {
      const onlineVenue = new Venue({ name: 'Online event' });
      const physicalVenue = new Venue({ name: 'Tech Hub' });

      const onlineEvent = createEvent({ venues: [onlineVenue] });
      const physicalEvent = createEvent({ venues: [physicalVenue] });

      const filtered = EventLoader.filter([onlineEvent, physicalEvent], {
        excludeOnline: true,
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].isOnline).to.be.false;
    });

    it('should filter by time window (hours)', () => {
      const soonEvent = createEvent({
        dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      });
      const laterEvent = createEvent({
        dateTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10 hours from now
      });

      const filtered = EventLoader.filter([soonEvent, laterEvent], {
        withinHours: 5,
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].id).to.equal(soonEvent.id);
    });

    it('should filter by time window (days)', () => {
      const soonEvent = createEvent({
        dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      });
      const laterEvent = createEvent({
        dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      });

      const filtered = EventLoader.filter([soonEvent, laterEvent], {
        withinDays: 5,
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].id).to.equal(soonEvent.id);
    });

    it('should filter by active status', () => {
      const activeEvent = createEvent({ status: EventStatus.ACTIVE });
      const cancelledEvent = createEvent({ status: EventStatus.CANCELLED });

      const filtered = EventLoader.filter([activeEvent, cancelledEvent], {
        onlyActive: true,
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].status).to.equal(EventStatus.ACTIVE);
    });

    it('should apply multiple filters together', () => {
      const events = [
        createEvent({ group: mockGroup1, rsvpCount: 10 }),
        createEvent({ group: mockGroup2, rsvpCount: 20 }),
        createEvent({
          group: mockGroup1,
          venues: [new Venue({ name: 'Online event' })],
        }),
      ];

      const filtered = EventLoader.filter(events, {
        groups: ['tampa-devs'],
        excludeOnline: true,
      });

      expect(filtered).to.have.lengthOf(1);
      expect(filtered[0].group.urlname).to.equal('tampa-devs');
      expect(filtered[0].isOnline).to.be.false;
    });
  });

  describe('sort()', () => {
    it('should sort by dateTime ascending', () => {
      const event1 = createEvent({
        id: 'event-1',
        dateTime: new Date('2026-03-01').toISOString(),
      });
      const event2 = createEvent({
        id: 'event-2',
        dateTime: new Date('2026-02-01').toISOString(),
      });
      const event3 = createEvent({
        id: 'event-3',
        dateTime: new Date('2026-04-01').toISOString(),
      });

      const sorted = EventLoader.sort([event1, event2, event3], {
        sortBy: 'dateTime',
        order: 'asc',
      });

      expect(sorted[0].id).to.equal('event-2');
      expect(sorted[1].id).to.equal('event-1');
      expect(sorted[2].id).to.equal('event-3');
    });

    it('should sort by dateTime descending', () => {
      const event1 = createEvent({
        id: 'event-1',
        dateTime: new Date('2026-03-01').toISOString(),
      });
      const event2 = createEvent({
        id: 'event-2',
        dateTime: new Date('2026-02-01').toISOString(),
      });

      const sorted = EventLoader.sort([event1, event2], {
        sortBy: 'dateTime',
        order: 'desc',
      });

      expect(sorted[0].id).to.equal('event-1');
      expect(sorted[1].id).to.equal('event-2');
    });

    it('should sort by title', () => {
      const eventA = createEvent({ id: 'A', title: 'Zebra Workshop' });
      const eventB = createEvent({ id: 'B', title: 'Apple Conference' });

      const sorted = EventLoader.sort([eventA, eventB], {
        sortBy: 'title',
        order: 'asc',
      });

      expect(sorted[0].id).to.equal('B');
      expect(sorted[1].id).to.equal('A');
    });

    it('should sort by group name', () => {
      const event1 = createEvent({ group: mockGroup1 }); // Tampa Devs
      const event2 = createEvent({ group: mockGroup2 }); // Suncoast JS

      const sorted = EventLoader.sort([event1, event2], {
        sortBy: 'group',
        order: 'asc',
      });

      expect(sorted[0].group.name).to.equal('Suncoast JS');
      expect(sorted[1].group.name).to.equal('Tampa Devs');
    });
  });

  describe('getNextEventPerGroup()', () => {
    it('should return one event per group', () => {
      const event1 = createEvent({
        id: 'event-1',
        group: mockGroup1,
        dateTime: new Date('2026-03-01').toISOString(),
      });
      const event2 = createEvent({
        id: 'event-2',
        group: mockGroup1,
        dateTime: new Date('2026-02-01').toISOString(),
      });
      const event3 = createEvent({
        id: 'event-3',
        group: mockGroup2,
        dateTime: new Date('2026-02-15').toISOString(),
      });

      const nextEvents = EventLoader.getNextEventPerGroup([event1, event2, event3]);

      expect(nextEvents).to.have.lengthOf(2);
      expect(nextEvents.find((e) => e.group.urlname === 'tampa-devs')?.id).to.equal('event-2');
      expect(nextEvents.find((e) => e.group.urlname === 'suncoast-js')?.id).to.equal('event-3');
    });
  });

  describe('groupByGroup()', () => {
    it('should group events by group urlname', () => {
      const event1 = createEvent({ id: 'event-1', group: mockGroup1 });
      const event2 = createEvent({ id: 'event-2', group: mockGroup1 });
      const event3 = createEvent({ id: 'event-3', group: mockGroup2 });

      const grouped = EventLoader.groupByGroup([event1, event2, event3]);

      expect(grouped.size).to.equal(2);
      expect(grouped.get('tampa-devs')).to.have.lengthOf(2);
      expect(grouped.get('suncoast-js')).to.have.lengthOf(1);
    });
  });

  describe('excludeEmptyGroups()', () => {
    it('should keep groups with events', () => {
      const events = [
        createEvent({ group: mockGroup1 }),
        createEvent({ group: mockGroup2 }),
      ];

      const result = EventLoader.excludeEmptyGroups(events);
      expect(result).to.have.lengthOf(2);
    });

    it('should handle empty input', () => {
      const result = EventLoader.excludeEmptyGroups([]);
      expect(result).to.have.lengthOf(0);
    });
  });

  describe('load()', () => {
    it('should load, filter, and sort in one operation', () => {
      const mockMeetupData = {
        'tampa-devs': {
          id: 'group-1',
          name: 'Tampa Devs',
          urlname: 'tampa-devs',
          link: 'https://meetup.com/tampa-devs',
          keyGroupPhoto: undefined,
          memberships: { totalCount: 500 },
          events: {
            edges: [
              {
                node: {
                  id: 'event-1',
                  title: 'TypeScript Workshop',
                  dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  eventUrl: 'https://meetup.com/event-1',
                  rsvps: { totalCount: 10 },
                  venues: [],
                },
              },
            ],
            pageInfo: { hasNextPage: false },
            totalCount: 1,
          },
        },
      };

      const events = EventLoader.load(
        mockMeetupData,
        { onlyActive: true },
        { sortBy: 'dateTime', order: 'asc' }
      );

      expect(events).to.be.an('array');
      expect(events).to.have.lengthOf(1);
      expect(events[0]).to.be.instanceOf(Event);
    });
  });
});
