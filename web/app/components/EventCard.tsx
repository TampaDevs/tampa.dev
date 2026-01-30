import { Link } from "react-router";
import type { Event, LocalGroupCompat } from "~/lib/types";
import {
  formatEventDate,
  formatEventDay,
  formatEventTime,
  getRelativeTime,
  truncate,
  stripHtml,
} from "~/lib/utils";
import { findGroupByUrlname } from "~/lib/types";

interface EventCardProps {
  event: Event;
  variant?: "default" | "compact" | "featured";
  groups?: LocalGroupCompat[];
}

export function EventCard({ event, variant = "default", groups }: EventCardProps) {
  const localGroup = groups ? findGroupByUrlname(groups, event.group.urlname) : undefined;
  const relativeTime = getRelativeTime(event.dateTime);
  const description = event.description
    ? truncate(stripHtml(event.description), 120)
    : null;

  if (variant === "compact") {
    return (
      <article className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-navy/30 dark:hover:border-navy-light/30 transition-colors">
        <div className="flex-shrink-0 w-16 text-center">
          <div className="text-sm font-semibold text-navy dark:text-gray-300">
            {formatEventDate(event.dateTime).split(" ")[1]}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatEventDay(event.dateTime)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatEventTime(event.dateTime)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <Link to={`/events/${event.id}`} className="block">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate hover:text-navy dark:hover:text-white">
              {event.title}
            </h3>
          </Link>
          {localGroup ? (
            <Link
              to={`/groups/${localGroup.slug}`}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
            >
              {event.group.name}
            </Link>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {event.group.name}
            </span>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            {event.isOnline ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Online
              </span>
            ) : event.venues[0] ? (
              <span className="truncate">{event.venues[0].name}</span>
            ) : null}
            {event.rsvpCount > 0 && (
              <>
                <span>·</span>
                <span>{event.rsvpCount} going</span>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-dark text-white shadow-xl shadow-navy/30">
        {event.photoUrl && (
          <img
            src={event.photoUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        {/* Glass overlay */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-br from-navy/60 via-navy/70 to-navy-dark/80" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
            <span className="uppercase tracking-wide font-semibold">
              {relativeTime}
            </span>
            <span>·</span>
            <span>{formatEventTime(event.dateTime)}</span>
          </div>

          <Link to={`/events/${event.id}`}>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 hover:underline">
              {event.title}
            </h2>
          </Link>

          {localGroup ? (
            <Link
              to={`/groups/${localGroup.slug}`}
              className="text-gray-300 hover:text-white"
            >
              {event.group.name}
            </Link>
          ) : (
            <span className="text-gray-300">{event.group.name}</span>
          )}

          {description && (
            <p className="mt-4 text-gray-300/80 line-clamp-2">{description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {!event.isOnline && event.venues[0] && (
              <div className="flex items-center gap-2">
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
                <span className="text-sm">{event.venues[0].name}</span>
              </div>
            )}
            {event.rsvpCount > 0 && (
              <div className="flex items-center gap-2">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span className="text-sm">{event.rsvpCount} going</span>
              </div>
            )}
          </div>

          <Link
            to={`/events/${event.id}`}
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-coral/15 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
          >
            View Event
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </article>
    );
  }

  // Default variant - used in carousel, needs consistent height
  return (
    <article className="h-full flex flex-col glass-card rounded-xl overflow-hidden transition-all duration-300">
      {/* Image section - always present with fixed height */}
      <div className="h-40 flex-shrink-0 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
        {event.photoUrl ? (
          <img
            src={event.photoUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600"
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
        )}
        {/* Date badge overlay */}
        <div className="absolute top-3 left-3 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 rounded-lg px-2 py-1 shadow-lg shadow-black/10 border border-white/50 dark:border-gray-700/50">
          <div className="text-xs font-semibold text-navy dark:text-gray-300">
            {formatEventDate(event.dateTime).split(" ")[1]}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {formatEventDay(event.dateTime)}
          </div>
        </div>
        {/* Online badge */}
        {event.isOnline && (
          <div className="absolute top-3 right-3 backdrop-blur-md bg-green-500/90 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-green-500/25 border border-green-400/30">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Online
          </div>
        )}
      </div>

      {/* Content section - flex-1 to fill remaining space */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Time */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {formatEventTime(event.dateTime)}
        </div>

        {/* Title - fixed 2 lines */}
        <Link to={`/events/${event.id}`} className="block">
          <h3 className="font-semibold text-gray-900 dark:text-white hover:text-navy dark:hover:text-white transition-colors line-clamp-2 min-h-[3rem]">
            {event.title}
          </h3>
        </Link>

        {/* Group name */}
        {localGroup ? (
          <Link
            to={`/groups/${localGroup.slug}`}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white mt-1"
          >
            {event.group.name}
          </Link>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {event.group.name}
          </span>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* Footer - always at bottom */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
          <div className="flex items-center gap-1 truncate">
            {!event.isOnline && event.venues[0] ? (
              <>
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
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
                </svg>
                <span className="truncate">{event.venues[0].name}</span>
              </>
            ) : (
              <span className="text-green-600 dark:text-green-400">Online Event</span>
            )}
          </div>
          {event.rsvpCount > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{event.rsvpCount}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
