import Handlebars from 'handlebars/runtime.js';
import {
    hbsAsyncRender
} from "hbs-async-render";

import '../assets/pages.js';
import '../assets/partials.js';

import * as helpers from '../lib/helpers.js';
import * as util from '../lib/utils.js';
import * as rss from '../lib/rss.js';
import * as ical from '../lib/ical.js';

helpers.registerAll();


function isLessThanOneHourIntoFuture(edge) {

    const eventDateTimeStr = edge.node.dateTime;

    // Parse the date-time string into a Date object
    const eventDateTime = new Date(eventDateTimeStr);

    // Get the current date and time
    const now = new Date("2024-08-07T18:00-04:00");
    // const now = new Date();

    // Calculate the difference in milliseconds
    const timeDifference = eventDateTime - now;

    // Define the threshold for 1 hour in milliseconds
    const oneHourInMs = 60 * 60 * 1000;

    // Check if the given date-time is less than 1 hour into the future
    return timeDifference > 0 && timeDifference < oneHourInMs;
}


export default {
    async fetch(request, env) {

        if (request.method == "OPTIONS") {
            var res = new Response("", {
                status: 200
            });
            res.headers.set("Access-Control-Allow-Origin", "*");
            res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
            return res;
        }

        if (request.method == "GET") {

            const url = new URL(request.url);
            const params = await util.parseQueryParams(url);

            const eventData = await util.filterEventData(JSON.parse(await env.kv.get("event_data")), params)

            if (url.pathname == '/rss' || url.pathname == '/feed') {
                const bodyText = await rss.fromJSON(eventData, request);
                res = new Response(bodyText);
                res.headers.set("Content-Type", "application/rss+xml");
                res.headers.set("Cache-Control", "public, max-age=3600");
                res.headers.set('Content-Encoding', 'gzip');
                res.headers.set("Etag", util.cyrb53(bodyText));
                return res;
            }

            if (url.pathname == '/html' || url.pathname == '/upcoming-events') {
                const bodyText = await hbsAsyncRender(Handlebars, 'events-html', {
                    events: util.getSortedNextEvents(eventData)
                });
                res = new Response(bodyText);
                res.headers.set("Content-Type", "text/html");
                res.headers.set("Cache-Control", "public, max-age=3600");
                res.headers.set('Content-Encoding', 'gzip');
                res.headers.set("Etag", util.cyrb53(bodyText));
                return res;
            }

            if (url.pathname == '/ics' || url.pathname == '/webcal' || url.pathname == '/ical') {
                const icsPayload = ical.fromGroupEventsList(util.getSortedEvents(eventData));
                res = new Response(icsPayload);
                res.headers.set("Content-Type", "text/calendar");
                res.headers.set("Cache-Control", "public, max-age=3600");
                res.headers.set('Content-Encoding', 'gzip');
                res.headers.set("Etag", util.cyrb53(icsPayload));
                return res;
            }

            if (url.pathname == '/widget/next-event') {
                const bodyText = await hbsAsyncRender(Handlebars, 'widget-next-event', {
                    events: util.getSortedNextEvents(eventData)
                });
                res = new Response(bodyText);
                res.headers.set("Content-Type", "text/html");
                res.headers.set("Cache-Control", "public, max-age=3600");
                res.headers.set('Content-Encoding', 'gzip');
                res.headers.set("Etag", util.cyrb53(bodyText));
                return res;
            }

            if (url.pathname == '/widget/carousel') {
                const bodyText = await hbsAsyncRender(Handlebars, 'widget-carousel', {
                    events: util.getSortedEvents(eventData)
                });
                res = new Response(bodyText);
                res.headers.set("Content-Type", "text/html");
                res.headers.set("Cache-Control", "public, max-age=3600");
                res.headers.set('Content-Encoding', 'gzip');
                res.headers.set("Etag", util.cyrb53(bodyText));
                return res;
            }

            if (url.pathname == '/next-hour') {
                for (const [key, value] of Object.entries(eventData)) {
                    const upcomingEvents = value.eventSearch.edges.filter(isLessThanOneHourIntoFuture)
                    value.eventSearch.edges = upcomingEvents;
                    value.eventSearch.count = upcomingEvents.length;
                }
            }

            res = new Response(JSON.stringify(eventData), {
                status: 200
            });
            res.headers.set("Content-Type", "application/json");
            res.headers.set('Content-Encoding', 'gzip');
            return res;
        }
    }
}
