export default {
	async fetch(request, env) {
  
	  if (request.method == "OPTIONS") {
		  var res = new Response("", { status: 200 });
	    res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
      return res;
    }

    if (request.method == "GET") {

      const url = new URL(request.url);
      const params = await parseQueryParams(url);

      const eventData = await filterEventData(JSON.parse(await env.kv.get("event_data")), params)

      if(url.pathname == '/rss') { 
        res = new Response(jsonToRss(eventData));
        res.headers.set("Content-Type", "application/rss+xml");
        return res;
      }

		  res = new Response(JSON.stringify(eventData), { status: 200 });
      res.headers.set("Content-Type", "application/json");
      return res;
    }
  }
}

async function filterEventData(event_data, params) {
  let eventData = event_data;

  if (params.groups) {
    let groups = params.groups.toLowerCase().split(',').map(x => x.replace(/\+/g, ' '));
    let selection = Object.keys(event_data).filter(e => groups.includes(e.toLowerCase()));

    event_data = selection.reduce((a, prop) => {
      if (event_data.hasOwnProperty(prop)) {
        a[prop] = event_data[prop];
      }
      return a;
    }, {});
  }

  if (params.noempty){
    event_data = Object.keys(event_data).reduce((a, prop) => {
      if (event_data[prop]["eventSearch"]["count"] > 0) {
        a[prop] = event_data[prop];
      }
      return a;
    }, {});
  }

  if (params.noonline){
    event_data = Object.keys(event_data).reduce((a, prop) => {
      if (event_data[prop]["eventSearch"]["count"] > 0 && event_data[prop]["eventSearch"]["edges"]["0"]["node"]["venue"]["name"] !== "Online event") {
        a[prop] = event_data[prop];
      }
      return a;
    }, {});
  }

  return event_data;
}

async function parseQueryParams(url){
  const params = {};
  const queryString = url.search.slice(1).split('&')
  queryString.forEach(item => {
    const kv = item.split('=')
    if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]) || true
  });
  return params;
}

function escapeXml(unsafeStr) {
  return unsafeStr.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function jsonToRss(jsonData) {
  let rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Tampa Tech Meetup Events</title>
  <link>https://tampa.dev/</link>
  <description>A collection of upcoming events from tech meetups in Tampa Bay.</description>
  <language>en-us</language>`;

  Object.keys(jsonData).forEach(groupKey => {
    const group = jsonData[groupKey];
    group.eventSearch.edges.forEach(event => {
      const eventNode = event.node;
      rssFeed += `
  <item>
    <title>${escapeXml(group.name)} - ${escapeXml(eventNode.title)}</title>
    <link>${eventNode.eventUrl}</link>
    <guid isPermaLink="true">${eventNode.eventUrl}</guid>
    <description><![CDATA[<img src="${eventNode.imageUrl}" alt="Event image"/><p>${escapeXml(eventNode.title)}</p>]]></description>
    <pubDate>${new Date(eventNode.dateTime).toUTCString()}</pubDate>
  </item>`;
    });
  });

  rssFeed += `
<atom:link href="https://events.api.tampa.dev/rss" rel="self" type="application/rss+xml" />
</channel>
</rss>`;

  return rssFeed;
}
