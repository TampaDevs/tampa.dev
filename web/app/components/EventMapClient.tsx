import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { Event } from "~/lib/types";
import { formatEventDate, formatEventTime } from "~/lib/utils";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface EventMapClientProps {
  events: Event[];
}

// Tampa Bay center coordinates
const TAMPA_CENTER: L.LatLngExpression = [27.9506, -82.4572];
const DEFAULT_ZOOM = 10;

// Create popup HTML for an event
function createEventPopupHtml(event: Event): string {
  const venue = event.venues[0];
  return `
    <div style="min-width: 200px; max-width: 280px;">
      <div style="font-size: 12px; font-weight: 500; color: #225ba5; margin-bottom: 4px;">
        ${formatEventDate(event.dateTime)} · ${formatEventTime(event.dateTime)}
      </div>
      <a
        href="/events/${event.id}"
        style="font-weight: 600; color: #111827; text-decoration: none; display: block; margin-bottom: 4px;"
      >
        ${event.title}
      </a>
      <div style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">${event.group.name}</div>
      ${venue ? `
        <div style="font-size: 12px; color: #6b7280;">
          <div style="font-weight: 500;">${venue.name}</div>
          ${venue.address ? `<div>${venue.address}</div>` : ""}
          ${venue.city && venue.state ? `<div>${venue.city}, ${venue.state}</div>` : ""}
        </div>
      ` : ""}
      ${event.rsvpCount > 0 ? `
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          ${event.rsvpCount} attending
        </div>
      ` : ""}
    </div>
  `;
}

// Create popup HTML for multiple events at the same venue
function createVenuePopupHtml(events: Event[], venueName: string): string {
  const eventListHtml = events
    .map((event) => createEventPopupHtml(event))
    .join('<hr style="margin: 12px 0; border: none; border-top: 1px solid #e5e7eb;">');

  return `
    <div style="max-height: 300px; overflow-y: auto;">
      <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
        ${events.length} events at ${venueName}
      </div>
      ${eventListHtml}
    </div>
  `;
}

// Single event marker icon
const singleIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background-color: #225ba5;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Venue with multiple events marker icon
function createVenueIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: #225ba5;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    ">${count}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export function EventMapClient({ events }: EventMapClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView(TAMPA_CENTER, DEFAULT_ZOOM);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Group events by venue coordinates (same venue = same pin)
    const venueGroups = new Map<string, Event[]>();
    for (const event of events) {
      const venue = event.venues[0];
      if (!venue?.lat || !venue?.lon) continue;
      const key = `${venue.lat.toFixed(4)},${venue.lon.toFixed(4)}`;
      const existing = venueGroups.get(key) ?? [];
      existing.push(event);
      venueGroups.set(key, existing);
    }

    // Create marker cluster group for nearby-venue clustering
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      iconCreateFunction: (cluster) => {
        // Sum total events across all venue markers (not just marker count)
        const count = cluster.getAllChildMarkers().reduce(
          (sum: number, m: any) => sum + (m._eventCount || 1),
          0
        );
        return L.divIcon({
          className: "custom-cluster",
          html: `<div style="
            background-color: #225ba5;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${count}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    // Add a marker per venue (with venue-level grouping for same-location events)
    venueGroups.forEach((groupEvents) => {
      const venue = groupEvents[0].venues[0];
      if (!venue?.lat || !venue?.lon) return;

      const isMultiEvent = groupEvents.length > 1;
      const icon = isMultiEvent
        ? createVenueIcon(groupEvents.length)
        : singleIcon;

      const popupHtml = isMultiEvent
        ? createVenuePopupHtml(groupEvents, venue.name)
        : createEventPopupHtml(groupEvents[0]);

      const marker = L.marker([venue.lat, venue.lon], { icon })
        .bindPopup(popupHtml, { maxWidth: 300 });
      // Store event count so clusters can sum total events, not just venue markers
      (marker as any)._eventCount = groupEvents.length;

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [events]);

  return <div ref={mapRef} className="w-full h-full" />;
}
