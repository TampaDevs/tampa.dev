import * as util from './utils.js';

export function fromJSON(jsonData, request) {
  let rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Upcoming Events</title>
  <link>https://tampa.dev/</link>
  <description>A collection of upcoming events from tech meetups in Tampa Bay.</description>
  <language>en-us</language>`;

  Object.keys(jsonData).forEach(groupKey => {
    const group = jsonData[groupKey];
    (group.events?.edges || []).forEach(edge => {
      const eventNode = edge.node;
      const img = util.photoUrl(eventNode.featuredEventPhoto || group.keyGroupPhoto);
      rssFeed += `
  <item>
    <title>${util.escapeXml(group.name)} - ${util.escapeXml(eventNode.title)}</title>
    <link>${eventNode.eventUrl}</link>
    <guid isPermaLink="true">${eventNode.eventUrl}</guid>
    <description><![CDATA[${img ? `<img src="${img}" alt="Event image"/>` : ''}<p>${util.escapeXml(eventNode.description)}</p>]]></description>
    <pubDate>${new Date(eventNode.dateTime).toUTCString()}</pubDate>
  </item>`;
    });
  });

  rssFeed += `
<atom:link href="${request.url}" rel="self" type="application/rss+xml" />
</channel>
</rss>`;
  return rssFeed;
}