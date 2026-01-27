import type { Route } from "./+types/map";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { getMeetupUrlnames } from "~/data/groups";
import { EventMap } from "~/components";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Event Map",
    description:
      "View upcoming tech events in Tampa Bay on an interactive map. Find meetups and developer events near you.",
    url: "/map",
  });
};

export async function loader() {
  const events = await fetchEvents({
    groups: getMeetupUrlnames(),
    withinDays: 30,
    noOnline: true, // Only show in-person events on map
  });

  // Filter to events with venue coordinates
  const eventsWithCoords = events.filter(
    (e) => e.venues[0]?.lat && e.venues[0]?.lon
  );

  return { events: eventsWithCoords };
}

export default function Map({ loaderData }: Route.ComponentProps) {
  const { events } = loaderData;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Event Map
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {events.length} in-person events in the next 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="flex-1 relative">
        <EventMap events={events} />
      </div>
    </div>
  );
}
