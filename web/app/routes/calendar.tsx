import type { Route } from "./+types/calendar";
import { Link } from "react-router";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { getMeetupUrlnames } from "~/data/groups";
import { formatEventTime, groupEventsByDate } from "~/lib/utils";
import type { Event } from "~/lib/types";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Events Calendar",
    description:
      "View Tampa Bay tech events in a calendar view. Subscribe to get all events in your calendar app.",
    url: "/calendar",
  });
};

export async function loader() {
  const events = await fetchEvents({
    groups: getMeetupUrlnames(),
    withinDays: 60,
  });

  return { events };
}

export default function Calendar({ loaderData }: Route.ComponentProps) {
  const { events } = loaderData;
  const groupedEvents = groupEventsByDate(events);

  // Get days for the current view (next 30 days)
  const days: { date: Date; events: Event[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateKey = date.toDateString();
    days.push({
      date,
      events: groupedEvents.get(dateKey) ?? [],
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Events Calendar
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {events.length} events in the next 60 days
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {days.map(({ date, events: dayEvents }, index) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const hasEvents = dayEvents.length > 0;

          return (
            <div
              key={date.toISOString()}
              className={`${
                index > 0 ? "border-t border-gray-200 dark:border-gray-800" : ""
              } ${isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            >
              <div className="flex">
                {/* Date column */}
                <div
                  className={`w-24 sm:w-32 flex-shrink-0 p-4 ${
                    isToday ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      isToday
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                </div>

                {/* Events column */}
                <div className="flex-1 p-4">
                  {hasEvents ? (
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <Link
                          key={event.id}
                          to={`/events/${event.id}`}
                          className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {formatEventTime(event.dateTime)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {event.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {event.group.name}
                                {event.venues[0] &&
                                  ` · ${event.venues[0].name}`}
                              </div>
                            </div>
                            {event.isOnline && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Online
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 dark:text-gray-500 py-2">
                      No events
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
