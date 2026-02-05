/**
 * Group Management — Events List
 *
 * Lists all events for a managed group with filter tabs and summary cards.
 */

import type { Route } from "./+types/groups.$slug.manage.events";
import { Link, useOutletContext, useSearchParams, data } from "react-router";
import { fetchManagedEvents } from "~/lib/group-manage-api.server";
import type { ManagedGroup, ManagedEvent } from "~/lib/group-manage-api.server";

type FilterTab = "all" | "upcoming" | "past" | "drafts" | "cancelled";

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  const events = await fetchManagedEvents(groupId, cookieHeader);

  return { events };
}

function getFilteredEvents(events: ManagedEvent[], filter: FilterTab): ManagedEvent[] {
  const now = new Date();

  switch (filter) {
    case "upcoming":
      return events.filter(
        (e) => e.status !== "cancelled" && e.status !== "draft" && new Date(e.startTime) >= now
      );
    case "past":
      return events.filter(
        (e) => e.status !== "cancelled" && e.status !== "draft" && new Date(e.startTime) < now
      );
    case "drafts":
      return events.filter((e) => e.status === "draft");
    case "cancelled":
      return events.filter((e) => e.status === "cancelled");
    case "all":
    default:
      return events;
  }
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  draft: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
};

function formatEventDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  } catch {
    return iso;
  }
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "drafts", label: "Drafts" },
  { key: "cancelled", label: "Cancelled" },
];

export default function ManageEventsPage({ loaderData }: Route.ComponentProps) {
  const { events } = loaderData;
  const group = useOutletContext<ManagedGroup>();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = (searchParams.get("filter") as FilterTab) || "all";

  const filteredEvents = getFilteredEvents(events, activeFilter);

  function handleFilterChange(filter: FilterTab) {
    if (filter === "all") {
      searchParams.delete("filter");
    } else {
      searchParams.set("filter", filter);
    }
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Events
        </h2>
        <Link
          to="new"
          className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = getFilteredEvents(events, tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  isActive
                    ? "text-gray-500 dark:text-gray-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {activeFilter === "all"
              ? "No events yet. Create your first event to get started."
              : `No ${activeFilter} events found.`}
          </p>
          {activeFilter === "all" && (
            <Link
              to="new"
              className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:hover:text-coral-light font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.active;
            const isPast = new Date(event.startTime) < new Date();

            return (
              <Link
                key={event.id}
                to={`/groups/${group.urlname}/manage/events/${event.id}`}
                className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-coral/30 dark:hover:border-coral/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-semibold truncate ${
                          isPast
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {event.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {event.status}
                      </span>
                      {event.platform && event.platform !== "tampa.dev" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {event.platform}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      {/* Date/Time */}
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {formatEventDateTime(event.startTime)}
                      </span>

                      {/* Event Type */}
                      <span className="inline-flex items-center gap-1 capitalize">
                        {event.eventType === "online" ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        {event.eventType === "physical" ? "In-Person" : event.eventType}
                      </span>

                      {/* Venue (if present) */}
                      {event.venue?.name && (
                        <span className="truncate">{event.venue.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    {/* RSVPs */}
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {event.rsvpSummary.confirmed}
                        {event.rsvpSummary.waitlisted > 0 && (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            /{event.rsvpSummary.waitlisted}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">RSVPs</div>
                    </div>

                    {/* Checkins */}
                    <div className="text-center">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {event.checkinCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Checkins</div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
