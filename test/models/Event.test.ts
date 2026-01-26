import { expect } from 'chai';
import { Event, EventStatus, EventType, Group, Venue, Photo } from '../../models/index.js';

describe('Event Model', () => {
  const mockGroup = new Group({
    id: 'group-123',
    name: 'Tampa Devs',
    urlname: 'tampadevs',
    link: 'https://meetup.com/tampadevs',
    memberCount: 500,
  });

  const mockVenue = new Venue({
    name: 'Test Venue',
    address: '123 Main St',
    city: 'Tampa',
    state: 'FL',
    postalCode: '33602',
    lat: 27.9506,
    lon: -82.4572,
  });

  const mockEventData = {
    id: 'event-123',
    title: 'Test Event',
    description: 'This is a test event',
    dateTime: '2026-02-15T18:00:00-05:00',
    duration: 'PT2H',
    eventUrl: 'https://meetup.com/tampadevs/events/123',
    status: EventStatus.ACTIVE,
    eventType: EventType.PHYSICAL,
    rsvpCount: 25,
    venues: [mockVenue],
    group: mockGroup,
  };

  describe('Constructor and Basic Properties', () => {
    it('should create an event with all required fields', () => {
      const event = new Event(mockEventData);

      expect(event.id).to.equal('event-123');
      expect(event.title).to.equal('Test Event');
      expect(event.description).to.equal('This is a test event');
      expect(event.eventUrl).to.equal('https://meetup.com/tampadevs/events/123');
      expect(event.status).to.equal(EventStatus.ACTIVE);
      expect(event.eventType).to.equal(EventType.PHYSICAL);
      expect(event.rsvpCount).to.equal(25);
    });

    it('should parse dateTime string to Date object', () => {
      const event = new Event(mockEventData);
      expect(event.dateTime).to.be.instanceOf(Date);
      expect(event.dateTime.toISOString()).to.contain('2026-02-15');
    });

    it('should handle optional fields', () => {
      const minimalData = {
        ...mockEventData,
        description: undefined,
        duration: undefined,
        eventType: undefined,
        photo: undefined,
      };
      const event = new Event(minimalData);

      expect(event.description).to.be.undefined;
      expect(event.duration).to.be.undefined;
      expect(event.eventType).to.be.undefined;
      expect(event.photo).to.be.undefined;
    });
  });

  describe('Venue Properties', () => {
    it('should return primary venue', () => {
      const event = new Event(mockEventData);
      const venue = event.venue;

      expect(venue).to.not.be.null;
      expect(venue?.name).to.equal('Test Venue');
    });

    it('should return null for venue when no venues', () => {
      const dataWithoutVenues = { ...mockEventData, venues: [] };
      const event = new Event(dataWithoutVenues);

      expect(event.venue).to.be.null;
    });

    it('should correctly identify online events', () => {
      const onlineVenue = new Venue({ name: 'Online event' });
      const onlineEvent = new Event({
        ...mockEventData,
        venues: [onlineVenue],
      });

      expect(onlineEvent.isOnline).to.be.true;
    });

    it('should correctly identify physical events', () => {
      const event = new Event(mockEventData);
      expect(event.isOnline).to.be.false;
    });
  });

  describe('Status Properties', () => {
    it('should identify active events', () => {
      const event = new Event(mockEventData);
      expect(event.isActive).to.be.true;
      expect(event.isCancelled).to.be.false;
    });

    it('should identify cancelled events', () => {
      const cancelledEvent = new Event({
        ...mockEventData,
        status: EventStatus.CANCELLED,
      });
      expect(cancelledEvent.isActive).to.be.false;
      expect(cancelledEvent.isCancelled).to.be.true;
    });
  });

  describe('Address Properties', () => {
    it('should return formatted address for physical events', () => {
      const event = new Event(mockEventData);
      expect(event.address).to.include('123 Main St');
      expect(event.address).to.include('Tampa');
      expect(event.address).to.include('FL');
    });

    it('should return Google Maps URL for physical events', () => {
      const event = new Event(mockEventData);
      expect(event.googleMapsUrl).to.include('google.com/maps');
      expect(event.googleMapsUrl).to.include('27.9506');
    });

    it('should return null for online event addresses', () => {
      const onlineVenue = new Venue({ name: 'Online event' });
      const onlineEvent = new Event({
        ...mockEventData,
        venues: [onlineVenue],
      });

      expect(onlineEvent.address).to.be.null;
      expect(onlineEvent.googleMapsUrl).to.be.null;
    });
  });

  describe('Duration Properties', () => {
    it('should parse ISO 8601 duration correctly', () => {
      const event = new Event(mockEventData);
      expect(event.durationMs).to.equal(2 * 60 * 60 * 1000); // 2 hours in ms
    });

    it('should return 0 for invalid or missing duration', () => {
      const noDurationEvent = new Event({ ...mockEventData, duration: undefined });
      expect(noDurationEvent.durationMs).to.equal(0);
    });

    it('should calculate end time correctly', () => {
      const event = new Event(mockEventData);
      const endTime = event.endTime;

      expect(endTime).to.not.be.null;
      if (endTime) {
        const diffMs = endTime.getTime() - event.dateTime.getTime();
        expect(diffMs).to.equal(2 * 60 * 60 * 1000); // 2 hours
      }
    });
  });

  describe('Photo Properties', () => {
    it('should return event photo URL if available', () => {
      const photo = new Photo({ id: 'photo-123', baseUrl: 'https://example.com/' });
      const eventWithPhoto = new Event({
        ...mockEventData,
        photo,
      });

      expect(eventWithPhoto.photoUrl).to.equal('https://example.com/photo-123/676x380.webp');
    });

    it('should fall back to group photo if no event photo', () => {
      const groupWithPhoto = new Group({
        ...mockGroup,
        photo: new Photo({ id: 'group-photo', baseUrl: 'https://group.com/' }),
      });
      const event = new Event({
        ...mockEventData,
        group: groupWithPhoto,
      });

      expect(event.photoUrl).to.equal('https://group.com/group-photo/676x380.webp');
    });
  });

  describe('Time Window Methods', () => {
    it('should check if event is within hours', () => {
      // Create an event 1 hour from now
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const futureEvent = new Event({
        ...mockEventData,
        dateTime: futureDate.toISOString(),
      });

      expect(futureEvent.isWithinHours(2)).to.be.true;
      expect(futureEvent.isWithinHours(0.5)).to.be.false;
    });

    it('should check if event is within days', () => {
      // Create an event 2 days from now
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const futureEvent = new Event({
        ...mockEventData,
        dateTime: futureDate.toISOString(),
      });

      expect(futureEvent.isWithinDays(7)).to.be.true;
      expect(futureEvent.isWithinDays(1)).to.be.false;
    });
  });

  describe('Serialization', () => {
    it('should serialize to clean JSON', () => {
      const event = new Event(mockEventData);
      const json = event.toJSON();

      expect(json).to.have.property('id', 'event-123');
      expect(json).to.have.property('title', 'Test Event');
      expect(json).to.have.property('address');
      expect(json).to.have.property('googleMapsUrl');
      expect(json).to.have.property('photoUrl');
      expect(json).to.have.property('isOnline');
    });

  });

  describe('Validation', () => {
    it('should throw ZodError for missing required fields', () => {
      expect(() => {
        new Event({
          id: 'test',
          // Missing all other required fields
        } as any);
      }).to.throw();
    });

    it('should throw ZodError for invalid dateTime format', () => {
      expect(() => {
        new Event({
          ...mockEventData,
          dateTime: 'invalid-date',
        });
      }).to.throw();
    });
  });
});
