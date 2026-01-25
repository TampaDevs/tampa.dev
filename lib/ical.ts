import { Event, EventLoader } from '../models/index.js';
import * as util from './utils.js';
import ics from 'ics';
import moment from 'moment-timezone';

/**
 * Generate iCal feed from Event models
 */
export function fromGroupEventsList(events: Event[]): string {
  const groupEventsIcs = events.map((event) => {
    const icsEvent = eventToIcal(event);
    if (icsEvent !== null && icsValid(icsEvent)) return icsEvent;
    else return null;
  });

  const { error, value } = ics.createEvents(groupEventsIcs);
  return error ? '' : (value || '');
}

/**
 * Convert Event model to iCal event
 */
export function eventToIcal(event: Event): any {
  const duration = moment.duration(event.duration || 'PT0S');
  const goingCount = event.rsvpCount;

  const synthetic_event_rsvp_attendee = {
    name: 'Event Attendees',
    email: 'events-api-attendees-noreply@tampa.dev',
    dir: event.eventUrl,
    rsvp: true,
    xNumGuests: goingCount,
    partstat: 'ACCEPTED',
    role: 'REQ-PARTICIPANT',
  };

  // Extract address without emoji
  const location = event.address
    ? event.address.replace('📍 ', '').replace('🖥️ ', '')
    : '';

  return {
    start: moment
      .tz(event.dateTime, 'America/New_York')
      .utc()
      .format('YYYY-M-D-H-m')
      .split('-')
      .map((v: string) => parseInt(v, 10)),
    productId: 'events.api.tampa.dev',
    uid: event.id,
    startInputType: 'utc',
    startOutputType: 'utc',
    duration: { hours: duration.hours(), minutes: duration.minutes() },
    title: `${event.group.name} - ${event.title} (${goingCount} Going)`,
    description: event.description || '',
    htmlContent: event.description ? util.markdownToHtml(event.description) : '',
    location,
    url: event.eventUrl,
    categories: [event.group.name],
    alarms: [
      {
        action: 'display',
        description: 'Reminder',
        trigger: { hours: 24, minutes: 0, before: true },
      },
      {
        action: 'display',
        description: 'Reminder',
        trigger: { hours: 4, minutes: 0, before: true },
      },
    ],
    classification: 'PUBLIC',
    lastModified: moment
      .tz(new Date(), 'America/New_York')
      .utc()
      .format('YYYY-M-D-H-m')
      .split('-')
      .map((v: string) => parseInt(v, 10)),
    calName: 'Tampa Bay Technology Community Calendar',
    busyStatus: 'FREE',
    transp: 'TRANSPARENT',
    sequence: icalSequenceFromEventDate(event.dateTime.toISOString()),
    organizer: {
      name: event.group.name,
      email: 'events-api-organizer-noreply@tampa.dev',
      dir: event.eventUrl.split('/events/')[0],
    },
    attendees: [synthetic_event_rsvp_attendee],
  };
}

/**
 * LEGACY: Convert legacy event format to iCal event
 * Kept for backward compatibility
 */
export function eventToIcalLegacy(event: any): any {
  const duration = moment.duration(event.data.duration || 'PT0S');
  const goingCount = (event.data.rsvps && event.data.rsvps.totalCount) || 0;

  const synthetic_event_rsvp_attendee = {
    name: 'Event Attendees',
    email: 'events-api-attendees-noreply@tampa.dev',
    dir: event.data.eventUrl,
    rsvp: true,
    xNumGuests: goingCount,
    partstat: 'ACCEPTED',
    role: 'REQ-PARTICIPANT',
  };

  return {
    start: moment
      .tz(event.data.dateTime, 'America/New_York')
      .utc()
      .format('YYYY-M-D-H-m')
      .split('-')
      .map((v: string) => parseInt(v, 10)),
    productId: 'events.api.tampa.dev',
    uid: event.data.id,
    startInputType: 'utc',
    startOutputType: 'utc',
    duration: { hours: duration.hours(), minutes: duration.minutes() },
    title: `${event.groupName} - ${event.data.title} (${goingCount} Going)`,
    description: event.data.description,
    htmlContent: util.markdownToHtml(event.data.description),
    location: (event.data.address || '').replace('📍 ', ''),
    url: event.data.eventUrl,
    categories: [event.groupName],
    alarms: [
      {
        action: 'display',
        description: 'Reminder',
        trigger: { hours: 24, minutes: 0, before: true },
      },
      {
        action: 'display',
        description: 'Reminder',
        trigger: { hours: 4, minutes: 0, before: true },
      },
    ],
    classification: 'PUBLIC',
    lastModified: moment
      .tz(new Date(), 'America/New_York')
      .utc()
      .format('YYYY-M-D-H-m')
      .split('-')
      .map((v: string) => parseInt(v, 10)),
    calName: 'Tampa Bay Technology Community Calendar',
    busyStatus: 'FREE',
    transp: 'TRANSPARENT',
    sequence: icalSequenceFromEventDate(event.data.dateTime),
    organizer: {
      name: event.groupName,
      email: 'events-api-organizer-noreply@tampa.dev',
      dir: event.data.eventUrl.split('/events/')[0],
    },
    attendees: [synthetic_event_rsvp_attendee],
  };
}

/**
 * Calculate iCal sequence number from event date
 */
export function icalSequenceFromEventDate(event_date: string): number {
  const until_event = moment.duration(
    moment.tz(event_date, 'America/New_York').diff(moment.tz(new Date(), 'America/New_York'))
  );
  const until_event_hours = Math.round(until_event.asHours());

  const hours_in_a_year = 17520;

  return hours_in_a_year - until_event_hours;
}

/**
 * Validate iCal event structure
 */
export function icsValid(icsEvent: any): boolean {
  const { error, value } = ics.createEvent(icsEvent);
  return !error && !!value;
}
