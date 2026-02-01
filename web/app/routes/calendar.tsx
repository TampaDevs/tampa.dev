import type { Route } from "./+types/calendar";
import { useNavigate, useSearchParams, useRouteLoaderData } from "react-router";
import { useState, useEffect, useRef } from "react";
import { fetchEvents, fetchGroups, toLocalGroup, type LocalGroupCompat } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { eventsToJsonLd } from "~/lib/structured-data";
import { Calendar as CalendarView, type CalendarEvent } from "@tampadevs/react";
import { EventCard, StructuredData } from "~/components";
import { isToday, isThisWeek } from "~/lib/utils";
import { getFavorites } from "~/lib/favorites";
import type { Event } from "~/lib/types";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tampa Bay Tech Events Calendar",
    description:
      "Browse the Tampa Bay tech events calendar. View developer meetups, startup events, and tech community gatherings in a calendar or list view. Subscribe to get events in your calendar app.",
    url: "/calendar",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "calendar";
  const typeFilter = url.searchParams.get("type");
  const groupFilter = url.searchParams.get("groups");
  const favoritesFilter = url.searchParams.get("favorites") === "1";

  const [allEvents, apiGroups] = await Promise.all([
    fetchEvents({ withinDays: 60 }),
    fetchGroups(),
  ]);

  const groups = apiGroups.map(toLocalGroup);

  let events = allEvents;

  // Apply type filter
  if (typeFilter === "in-person") {
    events = events.filter((e) => !e.isOnline);
  } else if (typeFilter === "online") {
    events = events.filter((e) => e.isOnline);
  }

  // Apply group filter
  if (groupFilter) {
    const groupSlugs = groupFilter.split(",");
    const filterUrlnames = groups
      .filter((g) => groupSlugs.includes(g.slug))
      .map((g) => g.slug.toLowerCase());
    events = events.filter((e) =>
      filterUrlnames.includes(e.group.urlname.toLowerCase())
    );
  }

  // Note: favorites filter is applied client-side (needs localStorage)

  // Group events for list view
  const today = events.filter((e) => isToday(e.dateTime));
  const thisWeek = events.filter((e) => !isToday(e.dateTime) && isThisWeek(e.dateTime));
  const later = events.filter((e) => !isToday(e.dateTime) && !isThisWeek(e.dateTime));

  // Transform to CalendarEvent format for calendar view
  const calendarEvents: CalendarEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    dateTime: event.dateTime,
    endTime: event.endTime,
    location: event.venues[0]?.name,
    groupName: event.group.name,
    eventUrl: `/events/${event.id}`,
    isOnline: event.isOnline,
  }));

  return {
    events,
    calendarEvents,
    today,
    thisWeek,
    later,
    groups,
    filters: {
      view,
      type: typeFilter,
      groups: groupFilter,
      favorites: favoritesFilter,
    },
  };
}

function EventSection({
  title,
  events,
  groups,
}: {
  title: string;
  events: Event[];
  groups: LocalGroupCompat[];
}) {
  if (events.length === 0) return null;

  return (
    <div className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} variant="compact" groups={groups} />
        ))}
      </div>
    </div>
  );
}

function GroupCombobox({
  groups,
  value,
  onChange,
}: {
  groups: LocalGroupCompat[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups.find((g) => g.slug === value);
  const filtered = query
    ? groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
    : groups;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={isOpen ? query : selectedGroup?.name || ""}
        placeholder="Search groups..."
        onFocus={() => {
          setIsOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value && !isOpen && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(""); setIsOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            All Groups
          </button>
          {filtered.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => { onChange(g.slug); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${g.slug === value
                  ? "text-coral font-medium"
                  : "text-gray-900 dark:text-white"
                }`}
            >
              {g.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
              No groups found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Calendar({ loaderData }: Route.ComponentProps) {
  const { events, calendarEvents, today, thisWeek, later, groups, filters } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isListView = filters.view === "list";
  const isFavoritesFilter = filters.favorites;

  // Client-side favorites state (for "My Groups" filter)
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  useEffect(() => {
    setFavoriteSlugs(getFavorites());
    setFavoritesLoaded(true);
  }, []);

  // Apply client-side favorites filter
  const filterByFavorites = (eventList: Event[]) => {
    if (!isFavoritesFilter || !favoritesLoaded) return eventList;
    return eventList.filter((e) =>
      favoriteSlugs.includes(e.group.urlname.toLowerCase())
    );
  };

  const filteredEvents = filterByFavorites(events);
  const filteredToday = filterByFavorites(today);
  const filteredThisWeek = filterByFavorites(thisWeek);
  const filteredLater = filterByFavorites(later);
  const filteredCalendarEvents = isFavoritesFilter && favoritesLoaded
    ? calendarEvents.filter((ce) => {
      const event = events.find((e) => e.id === ce.id);
      return event && favoriteSlugs.includes(event.group.urlname.toLowerCase());
    })
    : calendarEvents;

  const handleEventClick = (event: CalendarEvent) => {
    if (event.eventUrl) {
      navigate(event.eventUrl);
    }
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams);
    if (view === "calendar") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    setSearchParams(params);
  };

  const toggleFavoritesFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (isFavoritesFilter) {
      params.delete("favorites");
    } else {
      params.set("favorites", "1");
    }
    setSearchParams(params);
  };

  const hasActiveFilters = !!(filters.type || filters.groups || isFavoritesFilter);

  return (
    <>
      <StructuredData data={eventsToJsonLd(events)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Events
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {filteredEvents.length} events in the next 60 days
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!isListView
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isListView
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
          {/* My Groups Quick Filter */}
          {favoritesLoaded && favoriteSlugs.length > 0 && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={toggleFavoritesFilter}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isFavoritesFilter
                    ? "bg-coral text-white border-coral"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-coral/50"
                  }`}
              >
                <svg className="w-4 h-4" fill={isFavoritesFilter ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                My Groups ({favoriteSlugs.length})
              </button>
            </div>
          )}

          {/* Event Type Filter */}
          <div>
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

          {/* Group Filter (Searchable Combobox) */}
          <div className="flex-1 min-w-[200px]">
            <GroupCombobox
              groups={groups}
              value={filters.groups || ""}
              onChange={(slug) => updateFilter("groups", slug || null)}
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (filters.view !== "calendar") params.set("view", filters.view);
                  setSearchParams(params);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isListView ? (
          // List View
          filteredEvents.length === 0 ? (
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
                {isFavoritesFilter
                  ? "No upcoming events from your favorite groups. Try removing the filter."
                  : "Try adjusting your filters or check back later."}
              </p>
            </div>
          ) : (
            <>
              <EventSection title="Today" events={filteredToday} groups={groups} />
              <EventSection title="This Week" events={filteredThisWeek} groups={groups} />
              <EventSection title="Coming Up" events={filteredLater} groups={groups} />
            </>
          )
        ) : (
          // Calendar View
          <CalendarView
            events={filteredCalendarEvents}
            days={60}
            hideEmpty
            variant="light"
            fullHeight
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </>
  );
}
