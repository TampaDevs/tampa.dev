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
    <description><![CDATA[<h2>${escapeXml(eventNode.title)}</h2><img src="${eventNode.imageUrl}" alt="Event image"/><p>${escapeXml(eventNode.description)}</p>]]></description>
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
    const dt = new Date(dateStr);
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric'
    };

    return dt.toLocaleDateString('en-US', options);
}

function jsonToHTML(jsonData, request) {
    let html = `<head>
  <title>Upcoming Tech Events in Tampa</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A collection of upcoming events from software development and technology meetups in Tampa Bay.">
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-50 text-gray-800 font-sans">
  <div class="max-w-4xl mx-auto py-8 px-4">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-semibold">Upcoming Events</h1>
  </div>
  <div class="space-y-8">`;

    getSortedGroupNames(jsonData).forEach(groupKey => {
        const group = jsonData[groupKey];
        group.eventSearch.edges.forEach(event => {
            const eventNode = event.node;
            html += `
    <div class="bg-white shadow rounded-lg p-6">
    <h2 class="text-2xl font-semibold">${escapeXml(group.name)} - ${escapeXml(eventNode.title)}</h2>
    <p><strong>${toLocalDate(eventNode.dateTime)}</strong></p>
    <a class="text-blue-500 hover:text-blue-700" href="${eventNode.eventUrl}">Event Link</a>
    <div class="flex mt-4 mb-4 justify-center items-center"><img class="rounded-md" src="${eventNode.imageUrl}" alt="Event image"/></div>
    <p class="mt-4">${markdownToHtml(escapeXml(eventNode.description))}</p>
    </div>`;
        });
    });

    html += `
    </div>
    </div>
    </body>`;

    return html;
}