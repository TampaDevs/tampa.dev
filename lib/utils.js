const moment = require('moment-timezone');

export function photoUrl(photo, w = 676, h = 380, fmt = 'webp') {
    if (!photo) return "https://tampa.dev/images/default.jpg";
    return `${photo.baseUrl}${photo.id}/${w}x${h}.${fmt}`;
}


export async function filterEventData(event_data, params) {
    const nowNY = () => moment.tz(new Date(), "America/New_York").utc();

    // Filter out events that ended > 2h ago
    event_data = Object.entries(event_data || {}).reduce((acc, [prop, group]) => {
        if (!group || !group.events || !Array.isArray(group.events.edges)) return acc;

        const keptEdges = group.events.edges.filter(edge => {
            const n = edge?.node;
            if (!n?.dateTime) return false;
            const dur = moment.duration(n.duration || "PT0S");
            const end = moment.tz(n.dateTime, "America/New_York").utc().add(dur).add(2, "hours");
            return end > nowNY();
        });

        if (keptEdges.length > 0) {
            const clone = structuredClone(group);
            clone.events = { ...group.events, edges: keptEdges, totalCount: keptEdges.length };
            acc[prop] = clone;
        }
        return acc;
    }, {});

    // /?groups=a,b,c
    if (params.groups) {
        const wanted = params.groups.toLowerCase().split(",").map(x => x.replace(/\+/g, " "));
        event_data = Object.keys(event_data).reduce((a, prop) => {
            if (wanted.includes(prop.toLowerCase())) a[prop] = event_data[prop];
            return a;
        }, {});
    }

    // /?noempty=1
    if (params.noempty) {
        event_data = Object.entries(event_data).reduce((a, [prop, group]) => {
            const count = group?.events?.totalCount ?? 0;
            if (count > 0) a[prop] = group;
            return a;
        }, {});
    }

    // /?noonline=1
    if (params.noonline) {
        event_data = Object.entries(event_data).reduce((a, [prop, group]) => {
            const edges = group?.events?.edges || [];
            if (!edges.length) return a;
            const filtered = edges.filter(e => {
                const v = e?.node?.venues?.[0] ?? null;
                // keep if venue is null (unknown) or explicitly not "Online event"
                return v === null || v?.name !== "Online event";
            });
            if (filtered.length) {
                const clone = structuredClone(group);
                clone.events = { ...group.events, edges: filtered, totalCount: filtered.length };
                a[prop] = clone;
            }
            return a;
        }, {});
    }

    // /?within_hours=H
    if (params.within_hours) {
        const H = parseInt(params.within_hours, 10);
        const windowMs = H * 3600 * 1000;
        for (const group of Object.values(event_data)) {
            const edges = (group?.events?.edges || []).filter(e => {
                const t = new Date(e?.node?.dateTime) - new Date();
                return Number.isFinite(t) && t > 0 && t < windowMs;
            });
            if (group?.events) {
                group.events.edges = edges;
                group.events.totalCount = edges.length;
            }
        }
    }

    // /?within_days=D
    if (params.within_days) {
        const D = parseInt(params.within_days, 10);
        const windowMs = D * 24 * 3600 * 1000;
        for (const group of Object.values(event_data)) {
            const edges = (group?.events?.edges || []).filter(e => {
                const t = new Date(e?.node?.dateTime) - new Date();
                return Number.isFinite(t) && t > 0 && t < windowMs;
            });
            if (group?.events) {
                group.events.edges = edges;
                group.events.totalCount = edges.length;
            }
        }
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
    const arr = Object.keys(data).map(key => {
        const edges = data[key].events?.edges || [];
        if (!edges.length) return null;
        const earliest = edges.reduce((min, cur) => {
            const t = new Date(cur.node.dateTime);
            return t < min ? t : min;
        }, new Date(edges[0].node.dateTime));
        return { key, earliestEventDate: earliest };
    }).filter(Boolean);
    arr.sort((a, b) => a.earliestEventDate - b.earliestEventDate);
    return arr.map(x => x.key);
}

export function getSortedEvents(data) {
    const group_events = [];
    Object.keys(data).forEach(key => {
        const edges = data[key]?.events?.edges || [];
        if (!edges.length) return;
        edges.forEach(edge => {
            const n = edge?.node;
            if (!n) return;
            const details = {
                group: key,
                groupName: data[key].name,
                groupPhoto: data[key].keyGroupPhoto,
                data: { ...n, ...eventAddress(n) },
            };
            group_events.push(details);
        });
    });
    return group_events.sort((a, b) => new Date(a.data.dateTime) - new Date(b.data.dateTime));
}

export function getSortedNextEvents(data) {
    const arr = Object.keys(data).map(key => {
        const edges = data[key]?.events?.edges || [];
        if (!edges.length) return null;
        const first = edges[0].node;
        const earliest = edges.reduce((min, cur) => {
            const t = new Date(cur.node.dateTime);
            return t < min ? t : min;
        }, new Date(first.dateTime));
        const details = {
            group: key,
            groupName: data[key].name,
            groupPhoto: data[key].keyGroupPhoto,
            earliestEventDate: earliest,
            data: first,
            ...eventAddress(first),
        };
        return details;
    }).filter(Boolean);
    return arr.sort((a, b) => a.earliestEventDate - b.earliestEventDate);
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
    if (event.venues && event.venues.length > 0) {
        // Some events use venues[] instead of venue
        event.venue = event.venues[0];
    }

    if (event.venue) {
        if (event.venue.name !== 'Online event') {
            // Reject noisy keys before joining
            const ignoredKeys = new Set(['lat', 'lon', 'latitude', 'longitude']);
            const parts = Object.entries(event.venue)
                .filter(([k, v]) => v && !ignoredKeys.has(k))
                .map(([_, v]) => v);

            const destinationParams = Object.entries(event.venue)
                .filter(([k, v]) => v && !ignoredKeys.has(k))
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');

            return {
                "address": `📍 ${parts.join(', ')}`,
                "google_maps_url": `https://www.google.com/maps/dir/?api=1&destination=${destinationParams}`
            };
        } else {
            return { "address": "🖥️ Online event" };
        }
    } else {
        return { "address": "No Venue Provided" };
    }
}

export function formatAddressHTML(event) {
    if (event.venues && event.venues.length > 0) {
        event.venue = event.venues[0];
    }

    if (event.venue) {
        if (event.venue.name !== 'Online event') {
            const ignoredKeys = new Set(['lat', 'lon', 'latitude', 'longitude']);
            const parts = Object.entries(event.venue)
                .filter(([k, v]) => v && !ignoredKeys.has(k))
                .map(([_, v]) => v);

            const destinationParams = Object.entries(event.venue)
                .filter(([k, v]) => v && !ignoredKeys.has(k))
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');

            const googleMapsURL = `https://www.google.com/maps/dir/?api=1&destination=${destinationParams}`;
            const venueDetails = parts.join(', ');

            return `<a class="text-blue-500 hover:text-blue-700" href="${googleMapsURL}">📍 ${escapeXml(venueDetails)}</a>`;
        } else {
            return "<p>🖥️ Online event</p>";
        }
    }

    return "<p>No Venue Provided</p>";
}

export function trunc(str, len) {
    return str.substr(0, len - 1) + (str.length > len ? '...' : '');
}
