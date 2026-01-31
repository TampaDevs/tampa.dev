import { Event, EventLoader } from '../models/index.js';
import * as util from './utils.js';

/**
 * Generate RSS feed from Event models
 */
export function fromJSON(events: Event[], request: Request): string {
  // Sort by date
  events = EventLoader.sort(events, { sortBy: 'dateTime', order: 'asc' });

  // Build RSS feed
  let rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Upcoming Events</title>
  <link>https://tampa.dev/</link>
  <description>A collection of upcoming events from tech meetups in Tampa Bay.</description>
  <language>en-us</language>`;

  for (const event of events) {
    const img = util.photoUrl(event.photo || event.group.photo);
    const title = `${event.group.name} - ${event.title}`;
    const description = event.description || '';
    const descriptionHtml = util.markdownToHtml(description);

    rssFeed += `
  <item>
    <title>${util.escapeXml(title)}</title>
    <link>${event.eventUrl}</link>
    <guid isPermaLink="true">${event.eventUrl}</guid>
    <description><![CDATA[${img ? `<img src="${img}" alt="Event image"/>` : ''}${descriptionHtml}]]></description>
    <pubDate>${event.dateTime.toUTCString()}</pubDate>
  </item>`;
  }

  rssFeed += `
<atom:link href="${request.url}" rel="self" type="application/rss+xml" />
</channel>
</rss>`;
  return rssFeed;
}
