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
        organizer: { name: 'Tampa Devs Events API', dir: 'https://tampa.dev' },
    };
}

export function icsValid(icsEvent) {
    const { error, value } = ics.createEvent(icsEvent)

    if (error)
        return false
    else
        return value
}