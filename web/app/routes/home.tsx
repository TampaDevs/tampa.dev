import type { Route } from "./+types/home";
import { Link, useRouteLoaderData } from "react-router";
import { useState, useEffect } from "react";
import { fetchEvents, fetchGroups, toLocalGroup } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { eventsToJsonLd, websiteJsonLd } from "~/lib/structured-data";
import { AddToCalendar, EventCard, EventCarousel, GroupCard, NewsletterSignup, StructuredData } from "~/components";
import { getFavorites } from "~/lib/favorites";
import type { Event } from "~/lib/types";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tampa Tech Events",
    description:
      "Discover tech meetups, developer events, and communities in Tampa Bay. Find your next networking opportunity with local software developers, engineers, and technologists.",
    url: "/",
  });
};

export async function loader() {
  const [events, apiGroups] = await Promise.all([
    fetchEvents({ withinDays: 30 }),
    fetchGroups(),
  ]);

  // Convert API groups to LocalGroup format
  const allGroups = apiGroups.map(toLocalGroup);

  // Get featured groups, filling with regular groups if not enough
  let featuredGroups = allGroups.filter(g => g.featured);
  if (featuredGroups.length < 4) {
    const nonFeatured = allGroups.filter(g => !g.featured);
    featuredGroups = [...featuredGroups, ...nonFeatured].slice(0, 4);
  }

  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const apiBase = `${apiHost}/2026-01-25`;

  return {
    events: events.slice(0, 12),
    featuredEvent: events[0] ?? null,
    upcomingEvents: events.slice(1, 7),
    featuredGroups,
    allGroups,
    totalGroups: allGroups.length,
    totalEvents: events.length,
    apiBase,
  };
}

function PersonalizedDashboard({
  userName,
  events,
  allGroups,
  totalGroups,
  totalEvents,
}: {
  userName: string;
  events: Event[];
  allGroups: { slug: string; name: string }[];
  totalGroups: number;
  totalEvents: number;
}) {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFavoriteSlugs(getFavorites());
    setLoaded(true);
  }, []);

  const myEvents = loaded
    ? events.filter((e) => favoriteSlugs.includes(e.group.urlname.toLowerCase())).slice(0, 6)
    : [];
  const hasFavorites = loaded && favoriteSlugs.length > 0;

  return (
    <section className="bg-gradient-to-br from-navy/5 via-coral/5 to-transparent dark:from-navy/20 dark:via-coral/10 dark:to-transparent py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {totalGroups}+ groups and {totalEvents}+ upcoming events in Tampa Bay
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link
              to="/favorites"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorites
            </Link>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </Link>
          </div>
        </div>

        {/* Your Events section */}
        {hasFavorites && myEvents.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                From Your Groups
              </h2>
              <Link
                to="/calendar?favorites=1&view=list"
                className="text-coral hover:underline text-sm font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-coral/30 dark:hover:border-coral/30 transition-colors"
                >
                  <p className="text-xs font-medium text-coral mb-1">
                    {event.group.name}
                  </p>
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(event.dateTime).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/New_York",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : hasFavorites ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No upcoming events from your favorite groups.
            </p>
            <Link to="/calendar" className="text-coral hover:underline text-sm font-medium mt-2 inline-block">
              Browse all events →
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Favorite some groups to see personalized events here.
            </p>
            <Link to="/groups" className="text-coral hover:underline text-sm font-medium mt-2 inline-block">
              Explore groups →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function HeroSection({ totalGroups, totalEvents }: { totalGroups: number; totalEvents: number }) {
  return (
    <section className="relative text-white overflow-hidden">
      {/* Background image */}
      <img
        src="/images/hero.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay - deep navy from the ocean */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy/90 via-navy-dark/85 to-navy-dark/95" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="font-bold">Tampa Bay</span>
            <span className="font-normal"> is a</span>
            <br />
            <span className="font-bold">Technology Hub</span>
          </h1>
          <p className="mt-6 text-xl text-gray-200">
            Discover <span className="font-semibold text-white">{totalGroups}+ tech groups</span> and{" "}
            <span className="font-semibold text-white">{totalEvents}+ upcoming events</span>.
            Connect with developers, engineers, and technologists in Tampa Bay.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-coral/15 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
            >
              Browse Events
              <svg
                className="w-5 h-5"
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
            <Link
              to="/groups"
              className="inline-flex items-center gap-2 backdrop-blur-md bg-white/15 border border-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/25 transition-all hover:-translate-y-0.5"
            >
              Explore Groups
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    events,
    featuredEvent,
    upcomingEvents,
    featuredGroups,
    allGroups,
    totalGroups,
    totalEvents,
    apiBase,
  } = loaderData;

  const rootData = useRouteLoaderData("root") as { user?: { name: string | null; email: string } | null } | undefined;
  const user = rootData?.user;

  return (
    <>
      <StructuredData data={[websiteJsonLd(), eventsToJsonLd(events)]} />

      {/* Hero / Personalized Dashboard */}
      {user ? (
        <PersonalizedDashboard
          userName={user.name || user.email.split("@")[0]}
          events={events}
          allGroups={allGroups}
          totalGroups={totalGroups}
          totalEvents={totalEvents}
        />
      ) : (
        <HeroSection totalGroups={totalGroups} totalEvents={totalEvents} />
      )}

      {/* Featured Event */}
      {featuredEvent && (
        <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${user ? "pt-8" : "-mt-8"}`}>
          <EventCard event={featuredEvent} variant="featured" groups={allGroups} />
        </section>
      )}

      {/* Upcoming Events Carousel */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upcoming Events
            </h2>
            <Link
              to="/calendar"
              className="text-navy dark:text-gray-300 hover:underline text-sm font-medium"
            >
              View all events →
            </Link>
          </div>
          <EventCarousel events={upcomingEvents} groups={allGroups} />
        </section>
      )}

      {/* Featured Groups */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tech Communities
              </h2>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Join {totalGroups}+ groups in Tampa Bay
              </p>
            </div>
            <Link
              to="/groups"
              className="text-navy dark:text-gray-300 hover:underline text-sm font-medium"
            >
              View all groups →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredGroups.slice(0, 4).map((group) => (
              <GroupCard key={group.slug} group={group} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <NewsletterSignup />

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-dark rounded-2xl p-8 md:p-12 text-center border border-white/5">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Never Miss an Event
          </h2>
          <p className="text-gray-300/80 max-w-2xl mx-auto mb-8">
            Subscribe to our calendar feed and get all Tampa Bay tech events
            delivered directly to your calendar app.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <AddToCalendar label="Subscribe" apiBase={apiBase} />
            <a
              href={`${apiBase}/rss`}
              className="inline-flex items-center gap-2 backdrop-blur-md bg-white/15 border border-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/25 transition-all hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
              RSS Feed
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
