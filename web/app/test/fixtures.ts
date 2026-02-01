import type { Event, LocalGroupCompat } from '~/lib/types';

/**
 * Create a mock Event with realistic defaults.
 * Override any field by passing partial overrides.
 */
export function createMockEvent(overrides?: Partial<Event>): Event {
  return {
    id: 'evt-1',
    title: 'Tampa Devs Monthly Meetup',
    description: 'Join us for our monthly meetup featuring lightning talks and networking.',
    dateTime: '2026-02-15T18:30:00-05:00',
    endTime: '2026-02-15T21:00:00-05:00',
    duration: 'PT2H30M',
    eventUrl: 'https://meetup.com/tampadevs/events/12345',
    status: 'ACTIVE' as const,
    eventType: 'PHYSICAL' as const,
    rsvpCount: 42,
    venues: [
      {
        name: 'Tampa Bay Innovation Center',
        address: '123 Main St',
        city: 'Tampa',
        state: 'FL',
        lat: 27.9506,
        lon: -82.4572,
      },
    ],
    group: {
      id: 'grp-1',
      name: 'Tampa Devs',
      urlname: 'tampadevs',
      link: 'https://meetup.com/tampadevs',
      memberCount: 500,
    },
    source: 'meetup',
    isOnline: false,
    ...overrides,
  };
}

/**
 * Create a mock online Event.
 */
export function createMockOnlineEvent(overrides?: Partial<Event>): Event {
  return createMockEvent({
    title: 'Virtual Code Review Workshop',
    eventType: 'ONLINE' as const,
    venues: [],
    isOnline: true,
    ...overrides,
  });
}

/**
 * Create a mock LocalGroupCompat with realistic defaults.
 */
export function createMockGroup(overrides?: Partial<LocalGroupCompat>): LocalGroupCompat {
  return {
    slug: 'tampadevs',
    name: 'Tampa Devs',
    description: 'The largest developer community in Tampa Bay.',
    website: 'https://tampa.dev',
    logo: 'https://uploads.tampa.dev/groups/tampadevs.png',
    meetupUrlname: 'tampadevs',
    tags: ['general', 'networking'],
    featured: true,
    ...overrides,
  };
}
