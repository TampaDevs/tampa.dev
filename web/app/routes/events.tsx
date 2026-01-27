import type { Route } from "./+types/events";
import { useSearchParams } from "react-router";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { eventsToJsonLd } from "~/lib/structured-data";
import { EventCard, StructuredData } from "~/components";
import { groups, getMeetupUrlnames } from "~/data/groups";
import { formatEventDate, isToday, isThisWeek } from "~/lib/utils";
import type { Event } from "~/lib/types";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Upcoming Tech Events",
    description:
      "Find upcoming tech meetups, developer events, and networking opportunities in Tampa Bay. Filter by date, type, and community.",
    url: "/events",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const dateFilter = url.searchParams.get("date");
  const typeFilter = url.searchParams.get("type");
  const groupFilter = url.searchParams.get("groups");

  let events = await fetchEvents({
    groups: getMeetupUrlnames(),
    withinDays: 60,
  });

  // Apply type filter
  if (typeFilter === "in-person") {
    events = events.filter((e) => !e.isOnline);
  } else if (typeFilter === "online") {
    events = events.filter((e) => e.isOnline);
  }

  // Apply group filter
  if (groupFilter) {
    const groupSlugs = groupFilter.split(",");
    const urlnames = groups
      .filter((g) => groupSlugs.includes(g.slug))
      .map((g) => g.meetupUrlname?.toLowerCase())
      .filter(Boolean);
    events = events.filter((e) =>
      urlnames.includes(e.group.urlname.toLowerCase())
    );
  }

  // Group events by date category
  const today = events.filter((e) => isToday(e.dateTime));
  const thisWeek = events.filter((e) => !isToday(e.dateTime) && isThisWeek(e.dateTime));
  const later = events.filter((e) => !isToday(e.dateTime) && !isThisWeek(e.dateTime));

  return {
    events,
    today,
    thisWeek,
    later,
    filters: {
      date: dateFilter,
      type: typeFilter,
      groups: groupFilter,
    },
  };
}

function EventSection({
  title,
  events,
}: {
  title: string;
  events: Event[];
}) {
  if (events.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} variant="compact" />
        ))}
      </div>
    </div>
  );
}

export default function Events({ loaderData }: Route.ComponentProps) {
  const { events, today, thisWeek, later, filters } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  return (
    <>
      <StructuredData data={eventsToJsonLd(events)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Upcoming Events
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {events.length} events in the next 60 days
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
          {/* Event Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Event Type
            </label>
            <select
              value={filters.type || ""}
              onChange={(e) => updateFilter("type", e.target.value || null)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              <option value="in-person">In-Person</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Group
            </label>
            <select
              value={filters.groups || ""}
              onChange={(e) => updateFilter("groups", e.target.value || null)}
              className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Groups</option>
              {groups
                .filter((g) => g.meetupUrlname)
                .map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(filters.type || filters.groups) && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No events found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <>
            <EventSection title="Today" events={today} />
            <EventSection title="This Week" events={thisWeek} />
            <EventSection title="Coming Up" events={later} />
          </>
        )}
      </div>
    </>
  );
}
