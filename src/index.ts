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
            const params = await parseQueryParams(url);

            const eventData = await filterEventData(JSON.parse(await env.kv.get("event_data")), params)

            if (url.pathname == '/rss' || url.pathname == '/feed') {
                res = new Response(jsonToRss(eventData, request));
                res.headers.set("Content-Type", "application/rss+xml");
                return res;
            }

            if (url.pathname == '/html' || url.pathname == '/upcoming-events') {
                res = new Response(jsonToHTML(eventData, request));
                res.headers.set("Content-Type", "text/html");
                return res;
            }

            res = new Response(JSON.stringify(eventData), {
                status: 200
            });
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

    if (params.noempty) {
        event_data = Object.keys(event_data).reduce((a, prop) => {
            if (event_data[prop]["eventSearch"]["count"] > 0) {
                a[prop] = event_data[prop];
            }
            return a;
        }, {});
    }

    if (params.noonline) {
        event_data = Object.keys(event_data).reduce((a, prop) => {
            if (event_data[prop]["eventSearch"]["count"] > 0 && event_data[prop]["eventSearch"]["edges"]["0"]["node"]["venue"]["name"] !== "Online event") {
                a[prop] = event_data[prop];
            }
            return a;
        }, {});
    }

    return event_data;
}

async function parseQueryParams(url) {
    const params = {};
    const queryString = url.search.slice(1).split('&')
    queryString.forEach(item => {
        const kv = item.split('=')
        if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]) || true
    });
    return params;
}

function escapeXml(unsafeStr) {
    return unsafeStr.replace(/[<>&'"]/g, function(c) {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case '\'':
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}


function jsonToRss(jsonData, request) {
    let rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Upcoming Events</title>
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
    <description><![CDATA[<img src="${eventNode.imageUrl}" alt="Event image"/><p>${escapeXml(eventNode.description)}</p>]]></description>
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

function getSortedGroupNames(data) {
    const groupsArray = Object.keys(data)
        .map(key => {
            const events = data[key].eventSearch.edges;
            // Skip groups with no events
            if (!events || events.length === 0) return null;

            // Find the earliest event date in the group
            const earliestEventDate = events.reduce((earliest, current) => {
                const currentDate = new Date(current.node.dateTime);
                return earliest < currentDate ? earliest : currentDate;
            }, new Date(events[0].node.dateTime));

            return {
                key: key,
                earliestEventDate: earliestEventDate
            };
        })
        .filter(group => group !== null); // Remove groups with no events

    // Sort the array based on the earliest event date
    groupsArray.sort((a, b) => a.earliestEventDate - b.earliestEventDate);

    // Extract the sorted group keys
    const sortedGroupNames = groupsArray.map(group => group.key);

    return sortedGroupNames;
}

function markdownToHtml(markdown) {
    // Remove backslash escaping
    markdown = markdown.replace(/\\([*])/g, '$1');

    // Convert headers
    markdown = markdown.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    markdown = markdown.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    markdown = markdown.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert links
    markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-blue-500 hover:text-blue-700" href="$2">$1</a>');

    // Convert bold text
    markdown = markdown.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');

    // Convert italic text
    markdown = markdown.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Convert horizontal rule
    markdown = markdown.replace(/^---+/gim, '<hr>');

    // Convert bulleted list items
    markdown = markdown.split('\n').map(line => {
        if (line.startsWith('* ')) {
            return `• ${line.substring(2)}`;
        } else {
            return line;
        }
    }).join('\n');

    // Convert line breaks to <br>
    markdown = markdown.replace(/\n/g, '<br>');

    return markdown;
}

function toLocalDate(dateStr) {
    const timeZoneMatch = dateStr.match(/([+-][0-9]{2}:[0-9]{2})$/);
    const timeZone = timeZoneMatch ? timeZoneMatch[0] : 'UTC';

    const dt = new Date(dateStr);
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: timeZone 
    };

    return new Intl.DateTimeFormat('en-US', options).format(dt);
}

function formatAddressHTML(event){
    if (event.venue) {
        if (event.venue.name !== 'Online event') {
          const destinationParams = Object.keys(event.venue)
            .map(key => `${key}=${encodeURIComponent(event.venue[key])}`)
            .join('&');
          const googleMapsURL = `https://www.google.com/maps/dir/?api=1&destination=${destinationParams}`;
      
          const venueDetails = Object.values(event.venue).join(', ');
      
          return `<a class="text-blue-500 hover:text-blue-700" href="${googleMapsURL}">📍 ${escapeXml(venueDetails)}</a>`;
        } else {
          return "<p>🖥️ Online event</p>";
        }
      }
}

function jsonToHTML(jsonData, request) {
    let html = `<head>
  <title>Upcoming Tech Events in Tampa</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A collection of upcoming events from software development and technology meetups in Tampa Bay.">
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VV1YTRRM50"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-VV1YTRRM50');
  </script>

  
  <script>
    !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=e};analytics._writeKey="Cxy4CFCYHzZ7KuxjVgMQIiwhRlrkvDT1";;analytics.SNIPPET_VERSION="4.15.3";
    analytics.load("Cxy4CFCYHzZ7KuxjVgMQIiwhRlrkvDT1");
    analytics.page();
    }}();
  </script>
  </head>
  <body class="bg-gray-50 text-gray-800 font-sans">
  <div class="max-w-4xl mx-auto py-8 px-4">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-semibold">Upcoming Events</h1>
    <h4 class="mt-2 text-1xl font-semibold"><a class="text-blue-500 hover:text-blue-700" href="https://tampa.dev/">Back to All Meetups</a></h4>
  </div>
  <div class="space-y-8">`;

    let numEvents = 0;

    getSortedGroupNames(jsonData).forEach(groupKey => {
        const group = jsonData[groupKey];
        group.eventSearch.edges.forEach(event => {
            const eventNode = event.node;
            numEvents++;
            html += `
    <div class="bg-white shadow rounded-lg p-6">
      <div class="w-11/12" id="${group.urlname}">
        <h2 class="text-2xl mb-1 font-semibold">${escapeXml(group.name)} - ${escapeXml(eventNode.title)}</h2>
        <h3 class="text-lg mb-2 font-bold">${toLocalDate(eventNode.dateTime)}</h3>
        <h4 class="text-xs w-1/3 font-bold" >${formatAddressHTML(eventNode)}</h4>
      </div>

      <div class="flex mt-8 justify-center items-center">
        <img class="rounded-md drop-shadow-sm" src="${eventNode.imageUrl}" alt="Event image"/>
      </div>

      <div class="flex mb-4 mt-6 justify-center items-center">
        <a href="${eventNode.eventUrl}">
          <button class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded">
            RSVP
          </button>
        </a>
      </div>

      <div class="flex flex-col justify-center items-center">
        <p class="mt-4 mb-10 w-11/12">${markdownToHtml(escapeXml(eventNode.description))}</p>
        <a class="text-blue-500 hover:text-blue-700 text-xs" href="${eventNode.eventUrl}">View on Meetup.com</a>
      </div>
    </div>`;
        });
    });

    if(numEvents == 0){
        html += `
        <div class="bg-white shadow rounded-lg p-6">
            <div class="flex mt-4 mb-4 justify-center items-center">
              <h2 class="text-2xl font-semibold">No events found.</h2>
            </div>
        </div>`;
    }

    html += `
    </div>
    </div>
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js?token=5e34450a278e4510b022ed00c6bc0bdc"></script>
    </body>`;

    return html;
}