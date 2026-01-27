import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Event } from "~/lib/types";
import { formatEventDate, formatEventTime } from "~/lib/utils";
import "leaflet/dist/leaflet.css";

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
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        ${event.rsvpCount} attending
      </div>
    </div>
  `;
}

// Create cluster popup HTML for multiple events
function createClusterPopupHtml(events: Event[], venueName: string): string {
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

    // Group events by venue coordinates
    const venueGroups = new Map<string, Event[]>();
    for (const event of events) {
      const venue = event.venues[0];
      if (!venue?.lat || !venue?.lon) continue;
      const key = `${venue.lat.toFixed(4)},${venue.lon.toFixed(4)}`;
      const existing = venueGroups.get(key) ?? [];
      existing.push(event);
      venueGroups.set(key, existing);
    }

    // Add markers for each venue
    venueGroups.forEach((groupEvents, _key) => {
      const venue = groupEvents[0].venues[0];
      if (!venue?.lat || !venue?.lon) return;

      const isCluster = groupEvents.length > 1;
      const size = isCluster ? 32 : 24;

      // Create custom icon
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background-color: #225ba5;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">${isCluster ? groupEvents.length : ""}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });

      // Create popup content
      const popupHtml = isCluster
        ? createClusterPopupHtml(groupEvents, venue.name)
        : createEventPopupHtml(groupEvents[0]);

      // Add marker to map
      L.marker([venue.lat, venue.lon], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 300 });
    });

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
