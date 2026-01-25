/**
 * Test fixtures for events
 *
 * These fixtures use relative dates to ensure tests don't break as time passes.
 */

import { Event, EventStatus, EventType } from '../../models/Event.js';
import { Group } from '../../models/Group.js';

// Helper to create ISO date strings relative to now
export function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function hoursFromNow(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

// Test groups
export const testGroups = {
  tampadevs: new Group({
    id: 'group-1',
    name: 'Tampa Devs',
    urlname: 'tampa-devs',
    link: 'https://www.meetup.com/tampa-devs',
    memberCount: 5000,
  }),
  suncoastjs: new Group({
    id: 'group-2',
    name: 'Suncoast JS',
    urlname: 'suncoast-js',
    link: 'https://www.meetup.com/suncoast-js',
    memberCount: 3000,
  }),
  tampabayagile: new Group({
    id: 'group-3',
    name: 'Tampa Bay Agile',
    urlname: 'tampa-bay-agile',
    link: 'https://www.meetup.com/tampa-bay-agile',
    memberCount: 4000,
  }),
};

// Test events
export const testEvents = {
  // Tampa Devs events
  tampaDevsMeetup1: new Event({
    id: 'event-1',
    title: 'Tampa Devs Monthly Meetup',
    description: 'Join us for our monthly meetup!',
    dateTime: daysFromNow(2),
    duration: 'PT2H',
    eventUrl: 'https://www.meetup.com/tampa-devs/events/event-1',
    status: EventStatus.ACTIVE,
    eventType: EventType.PHYSICAL,
    rsvpCount: 45,
    venues: [{
      name: 'Innovation Hub',
      address: '123 Main St',
      city: 'Tampa',
      state: 'FL',
      postalCode: '33602',
      lat: 27.9506,
      lon: -82.4572,
    }],
    group: testGroups.tampadevs,
  }),

  tampaDevsMeetup2: new Event({
    id: 'event-2',
    title: 'Tampa Devs Workshop',
    description: 'Hands-on coding workshop',
    dateTime: daysFromNow(10),
    duration: 'PT3H',
    eventUrl: 'https://www.meetup.com/tampa-devs/events/event-2',
    status: EventStatus.ACTIVE,
    eventType: EventType.HYBRID,
    rsvpCount: 30,
    venues: [{
      name: 'Tech Center',
      address: '456 Oak Ave',
      city: 'Tampa',
      state: 'FL',
      postalCode: '33602',
      lat: 27.9506,
      lon: -82.4572,
    }],
    group: testGroups.tampadevs,
  }),

  // Suncoast JS events
  suncoastJSMeetup: new Event({
    id: 'event-3',
    title: 'Suncoast JS: React Workshop',
    description: 'Learn React hooks and state management',
    dateTime: daysFromNow(5),
    duration: 'PT2H',
    eventUrl: 'https://www.meetup.com/suncoast-js/events/event-3',
    status: EventStatus.ACTIVE,
    eventType: EventType.PHYSICAL,
    rsvpCount: 25,
    venues: [{
      name: 'Suncoast Developers Guild',
      address: '789 Pine St',
      city: 'St. Petersburg',
      state: 'FL',
      postalCode: '33701',
      lat: 27.7676,
      lon: -82.6403,
    }],
    group: testGroups.suncoastjs,
  }),

  // Tampa Bay Agile online event
  tampaBayAgileOnline: new Event({
    id: 'event-4',
    title: 'Virtual Lean Coffee',
    description: 'Join us for virtual lean coffee discussion',
    dateTime: daysFromNow(1),
    duration: 'PT1H',
    eventUrl: 'https://www.meetup.com/tampa-bay-agile/events/event-4',
    status: EventStatus.ACTIVE,
    eventType: EventType.ONLINE,
    rsvpCount: 15,
    venues: [{
      name: 'Online event',
      lat: -8.521147,
      lon: 179.1962,
    }],
    group: testGroups.tampabayagile,
  }),

  // Cancelled event
  cancelledEvent: new Event({
    id: 'event-5',
    title: 'Cancelled Workshop',
    description: 'This event was cancelled',
    dateTime: daysFromNow(7),
    duration: 'PT2H',
    eventUrl: 'https://www.meetup.com/tampa-devs/events/event-5',
    status: EventStatus.CANCELLED,
    eventType: EventType.PHYSICAL,
    rsvpCount: 0,
    venues: [{
      name: 'Venue TBD',
      city: 'Tampa',
      state: 'FL',
    }],
    group: testGroups.tampadevs,
  }),

  // Event happening soon (within 24 hours)
  eventSoon: new Event({
    id: 'event-6',
    title: 'Last Minute Meetup',
    description: 'Quick meetup happening soon!',
    dateTime: hoursFromNow(12),
    duration: 'PT1H30M',
    eventUrl: 'https://www.meetup.com/tampa-devs/events/event-6',
    status: EventStatus.ACTIVE,
    eventType: EventType.PHYSICAL,
    rsvpCount: 10,
    venues: [{
      name: 'Coffee Shop',
      address: '321 Bay St',
      city: 'Tampa',
      state: 'FL',
      lat: 27.9506,
      lon: -82.4572,
    }],
    group: testGroups.tampadevs,
  }),
};

// Array of all test events
export const allTestEvents = Object.values(testEvents);

// Mock Meetup API data structure
export const mockMeetupData = {
  'tampa-devs': {
    id: 'group-1',
    name: 'Tampa Devs',
    urlname: 'tampa-devs',
    link: 'https://www.meetup.com/tampa-devs',
    memberCount: 5000,
    keyGroupPhoto: {
      id: 'photo-1',
      baseUrl: 'https://secure-content.meetupstatic.com/images/',
    },
    memberships: {
      totalCount: 5000,
    },
    events: {
      pageInfo: {
        hasNextPage: false,
        endCursor: null,
      },
      totalCount: 1,
      edges: [
        {
          node: {
            id: 'event-1',
            title: 'Tampa Devs Monthly Meetup',
            description: 'Join us for our monthly meetup!',
            dateTime: daysFromNow(2),
            duration: 'PT2H',
            eventUrl: 'https://www.meetup.com/tampa-devs/events/event-1',
            going: 45,
            eventType: 'PHYSICAL',
            status: 'ACTIVE',
            venue: {
              name: 'Innovation Hub',
              address: '123 Main St',
              city: 'Tampa',
              state: 'FL',
              postalCode: '33602',
              lat: 27.9506,
              lon: -82.4572,
            },
          },
        },
      ],
    },
  },
};
