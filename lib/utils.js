export async function filterEventData(event_data, params) {
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
            if (event_data[prop]["eventSearch"]["count"] == 0)
                return a;

            a[prop] = structuredClone(event_data[prop]);
            a[prop]["eventSearch"]["edges"] = [];

            for (let i = 0; i < event_data[prop]["eventSearch"]["edges"].length; i++) {
                if (event_data[prop]["eventSearch"]["edges"][i]["node"]["venue"] && event_data[prop]["eventSearch"]["edges"][i]["node"]["venue"]["name"] !== "Online event") {
                    a[prop]["eventSearch"]["edges"].push(event_data[prop]["eventSearch"]["edges"][i]);
                }
            }

            return a;
        }, {});
    }

    return event_data;
}

export async function parseQueryParams(url) {
    const params = {};
    const queryString = url.search.slice(1).split('&')
    queryString.forEach(item => {
        const kv = item.split('=')
        if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]) || true
    });
    return params;
}

export function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
};

export function escapeXml(unsafeStr) {
    return unsafeStr.replace(/[<>&'"]/g, function (c) {
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


export function getSortedGroupNames(data) {
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

export function getSortedEvents(data) {
    let group_events = []

    Object.keys(data)
        .map(key => {
            const events = data[key].eventSearch.edges;
            // Skip groups with no events
            if (!events || events.length === 0) return null;

            events.map(event => {
                const details = {
                    group: key,
                    groupName: data[key].name,
                    data: {}
                };

                details.data = { ...event.node, ...eventAddress(event.node) };

                group_events.push(details);
            });
        });

    return group_events.sort((a, b) => new Date(a.data.dateTime) - new Date(b.data.dateTime));
}

export function getSortedNextEvents(data) {
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

            const details = {
                group: key,
                groupName: data[key].name,
                earliestEventDate: earliestEventDate,
                data: events[0].node
            };

            return { ...details, ...eventAddress(events[0].node) };

        })
        .filter(group => group !== null); // Remove groups with no events

    // Sort the array based on the earliest event date
    return groupsArray.sort((a, b) => a.earliestEventDate - b.earliestEventDate);
}

export function markdownToHtml(markdown) {
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

export function toLocalDate(dateStr) {
    const timeZoneMatch = dateStr.match(/([+-][0-9]{2}:[0-9]{2})$/);
    const timeZone = timeZoneMatch ? timeZoneMatch[0] : 'UTC';

    const dt = new Date(dateStr);
    const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: timeZone
    };

    return new Intl.DateTimeFormat('en-US', options).format(dt);
}

export function eventAddress(event) {
    if (event.venue) {
        if (event.venue.name !== 'Online event') {
            const destinationParams = Object.keys(event.venue)
                .map(key => `${key}=${encodeURIComponent(event.venue[key])}`)
                .join('&');

            return {
                "address": `📍 ${Object.values(event.venue).join(', ')}`,
                "google_maps_url": `https://www.google.com/maps/dir/?api=1&destination=${destinationParams}`
            }
        } else {
            return {
                "address": "🖥️ Online event"
            };
        }
    } else {
        return {
            "address": "No Venue Provided"
        };
    }
}

export function formatAddressHTML(event) {
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

export function trunc(str, len) {
    return str.substr(0, len - 1) + (str.length > len ? '...' : '');
}
