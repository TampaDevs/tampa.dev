import * as util from './utils.js';

const ics = require('ics');
const moment = require('moment-timezone');

export function fromGroupEventsList(events) {
    const groupEventsIcs = events.map(event => {
        const icsEvent = eventToIcal(event);

        if (icsEvent !== null && icsValid(icsEvent))
            return icsEvent;
        else
            return null;
    });

    const { error, value } = ics.createEvents(groupEventsIcs);

    if (!error)
        return value;
    else
        return "";
}

export function eventToIcal(event) {
    const duration = moment.duration(event.data.duration);

    const synthetic_event_rsvp_attendee = {
        name: 'Event Attendees',
        email: 'events-api-attendees-noreply@tampa.dev',
        dir: event.data.eventUrl,
        rsvp: true,
        xNumGuests: event.data.going,
        partstat: 'ACCEPTED',
        role: 'REQ-PARTICIPANT'
    }

    return {
        start: moment.tz(event.data.dateTime, "America/New_York").utc().format('YYYY-M-D-H-m').split("-").map(v => parseInt(v)),
        productId: "events.api.tampa.dev",
        uid: event.data.id,
        startInputType: "utc",
        startOutputType: "utc",
        duration: { hours: duration.hours(), minutes: duration.minutes() },
        title: `${event.groupName} - ${event.data.title} (${event.data.going} Going)`,
        description: event.data.description,
        htmlContent: util.markdownToHtml(event.data.description),
        location: event["address"].replace('📍 ', ''),
        url: event.data.eventUrl,
        categories: [event.groupName],
        alarms: [
            { action: 'display', description: 'Reminder', trigger: { hours: 24, minutes: 0, before: true } },
            { action: 'display', description: 'Reminder', trigger: { hours: 4, minutes: 0, before: true } },
        ],
        classification: "PUBLIC",
        lastModified: moment.tz(new Date(), "America/New_York").utc().format('YYYY-M-D-H-m').split("-").map(v => parseInt(v)),
        calName: "Tampa Bay Technology Community Calendar",
        busyStatus: 'FREE',
        transp: 'TRANSPARENT',
        sequence: icalSequenceFromEventDate(event.data.dateTime),
        organizer: { name: event.groupName, email: 'events-api-organizer-noreply@tampa.dev', dir: event.data.eventUrl.split('/events/')[0], },
        attendees: [
            synthetic_event_rsvp_attendee
        ]
    };
}

export function icalSequenceFromEventDate(event_date) {
    const until_event = moment.duration(moment.tz(event_date, "America/New_York").diff(moment.tz(new Date(), "America/New_York")));
    const until_event_hours = Math.round(until_event.asHours());

    const hours_in_a_year = 17520

    return hours_in_a_year - until_event_hours
}

export function icsValid(icsEvent) {
    const { error, value } = ics.createEvent(icsEvent)

    if (error)
        return false
    else
        return value
}