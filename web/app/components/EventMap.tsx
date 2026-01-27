import { useEffect, useState } from "react";
import type { Event } from "~/lib/types";

interface EventMapProps {
  events: Event[];
}

function MapLoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
    </div>
  );
}

// Client-only map component
export function EventMap({ events }: EventMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    events: Event[];
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("./EventMapClient")
      .then((mod) => {
        setMapComponent(() => mod.EventMapClient);
      })
      .catch((err) => {
        console.error("Failed to load map module:", err);
        setError(err.message || "Failed to load map");
      });
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 mb-2">Failed to load map</div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!MapComponent) {
    return <MapLoadingFallback />;
  }

  return <MapComponent events={events} />;
}
