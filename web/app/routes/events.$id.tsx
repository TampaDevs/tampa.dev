import type { Route } from "./+types/events.$id";
import { Link, data } from "react-router";
import { marked } from "marked";
import { fetchEventById, fetchGroups, toLocalGroup, findGroupByUrlname } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { eventToJsonLd } from "~/lib/structured-data";
import { AddToCalendar, StructuredData } from "~/components";
import { formatEventDate, formatEventTime, addUtmParams, getRsvpLabel, getSourceDisplayName } from "~/lib/utils";

// Configure marked for lenient rendering
marked.use({
  breaks: true,
  gfm: true,
  pedantic: false,
});

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data?.event) {
    return [{ title: "Event Not Found | Tampa Tech Events" }];
  }

  const event = data.event;
  const venue = event.venues[0];
  const locationText = event.isOnline
    ? "Online Event"
    : venue
      ? `${venue.name}, ${venue.city || "Tampa Bay"}`
      : "Tampa Bay";

  return generateMetaTags({
    title: event.title,
    description: `${formatEventDate(event.dateTime)} at ${formatEventTime(event.dateTime)} - ${locationText}. Hosted by ${event.group.name}. ${event.rsvpCount} attending.`,
    image: event.photoUrl,
    url: `/events/${event.id}`,
  });
};

export async function loader({ params }: Route.LoaderArgs) {
  const [event, apiGroups] = await Promise.all([
    fetchEventById(params.id!),
    fetchGroups(),
  ]);

  if (!event) {
    throw data(null, { status: 404 });
  }

  // Try to find the local group config for additional info
  const groups = apiGroups.map(toLocalGroup);
  const localGroup = findGroupByUrlname(groups, event.group.urlname);

  // Parse markdown description
  // Preprocess to handle common markdown issues from Meetup descriptions
  const descriptionHtml = event.description
    ? marked.parse(
        event.description
          .replace(/\r\n/g, "\n") // Normalize CRLF to LF
          .replace(/^(#{1,6}\s)/gm, "\n\n$1") // Add blank lines before headers (handles start of string too)
          .replace(/\n(#{1,6}\s)/g, "\n\n$1") // Ensure headers always have blank line before
          .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
          .trim()
      )
    : null;

  return {
    event,
    localGroup,
    descriptionHtml,
  };
}

export default function EventDetail({ loaderData }: Route.ComponentProps) {
  const { event, localGroup, descriptionHtml } = loaderData;
  const venue = event.venues[0];

  // Format date for display
  const eventDate = new Date(event.dateTime);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <>
      <StructuredData data={eventToJsonLd(event)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/events"
                className="text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
              >
                Events
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
              {event.title}
            </li>
          </ol>
        </nav>

        {/* Event Header */}
        <article>
          {/* Hero Image */}
          {event.photoUrl && (
            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden mb-8 bg-gray-100 dark:bg-gray-800">
              <img
                src={event.photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Online badge */}
              {event.isOnline && (
                <div className="absolute top-4 right-4 backdrop-blur-md bg-green-500/90 text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-green-500/25 border border-green-400/30">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Online Event
                </div>
              )}
            </div>
          )}

          {/* Event Info */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {event.title}
            </h1>

            {/* Date/Time Card */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex-1">
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-xs font-semibold text-coral uppercase tracking-wide">
                    {eventDate.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {eventDate.getDate()}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {dateStr}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {timeStr}
                  </div>
                </div>
              </div>

              {/* RSVP Count */}
              {event.rsvpCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl sm:flex-none">
                  <svg
                    className="w-6 h-6 text-coral flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {event.rsvpCount}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      attending
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <a
                href={addUtmParams(event.eventUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-coral/15 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
              >
                {getRsvpLabel(event.source)}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              <AddToCalendar event={event} label="Add to Calendar" size="small" />
            </div>
          </div>

          {/* Location */}
          {!event.isOnline && venue && (
            <section className="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-coral"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Location
              </h2>
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                {venue.name}
              </div>
              {event.address && (
                <div className="text-gray-600 dark:text-gray-400 mb-3">
                  {event.address}
                </div>
              )}
              {(event.googleMapsUrl || event.appleMapsUrl) && (
                <div className="flex flex-wrap gap-4">
                  {event.googleMapsUrl && (
                    <a
                      href={event.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      Google Maps
                    </a>
                  )}
                  {event.appleMapsUrl && (
                    <a
                      href={event.appleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Apple Maps
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Description */}
          {descriptionHtml && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                About this event
              </h2>
              <div
                className="prose prose-gray dark:prose-invert max-w-none prose-a:text-coral prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </section>
          )}

          {/* Organizer */}
          <section className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hosted by
            </h2>
            <div className="flex items-center gap-4">
              {(localGroup?.logo || event.group.photo?.baseUrl) && (
                <img
                  src={localGroup?.logo || event.group.photo?.baseUrl}
                  alt={event.group.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {event.group.name}
                </div>
                {event.group.memberCount > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {event.group.memberCount.toLocaleString()} members
                  </div>
                )}
              </div>
              {localGroup ? (
                <Link
                  to={`/groups/${localGroup.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg font-medium transition-colors"
                >
                  View Group
                </Link>
              ) : (
                <a
                  href={event.group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-navy hover:bg-navy-light text-white rounded-lg font-medium transition-colors"
                >
                  View on {getSourceDisplayName(event.source)}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
