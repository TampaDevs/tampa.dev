import type { Route } from "./+types/calendar";
import { useNavigate } from "react-router";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { getMeetupUrlnames } from "~/data/groups";
import { Calendar as CalendarView, type CalendarEvent } from "@tampadevs/react";

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

  // Transform to CalendarEvent format
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

  return { events, calendarEvents };
}

export default function Calendar({ loaderData }: Route.ComponentProps) {
  const { events, calendarEvents } = loaderData;
  const navigate = useNavigate();

  const handleEventClick = (event: CalendarEvent) => {
    if (event.eventUrl) {
      navigate(event.eventUrl);
    }
  };

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

      <CalendarView
        events={calendarEvents}
        days={60}
        hideEmpty
        variant="light"
        fullHeight
        onEventClick={handleEventClick}
      />
    </div>
  );
}
