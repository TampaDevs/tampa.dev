import type { Route } from "./+types/home";
import { Link } from "react-router";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { eventsToJsonLd, websiteJsonLd } from "~/lib/structured-data";
import { AddToCalendar, EventCard, EventCarousel, GroupCard, NewsletterSignup, StructuredData } from "~/components";
import { groups, getFeaturedGroups } from "~/data/groups";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tampa Tech Events",
    description:
      "Discover tech meetups, developer events, and communities in Tampa Bay. Find your next networking opportunity with local software developers, engineers, and technologists.",
    url: "/",
  });
};

export async function loader() {
  const events = await fetchEvents({ withinDays: 30 });

  // Get featured groups, filling with regular groups if not enough
  let featuredGroups = getFeaturedGroups();
  if (featuredGroups.length < 4) {
    const nonFeatured = groups.filter(g => !g.featured);
    featuredGroups = [...featuredGroups, ...nonFeatured].slice(0, 4);
  }

  return {
    events: events.slice(0, 12),
    featuredEvent: events[0] ?? null,
    upcomingEvents: events.slice(1, 7),
    featuredGroups,
    totalGroups: groups.length,
    totalEvents: events.length,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    events,
    featuredEvent,
    upcomingEvents,
    featuredGroups,
    totalGroups,
    totalEvents,
  } = loaderData;

  return (
    <>
      <StructuredData data={[websiteJsonLd(), eventsToJsonLd(events)]} />

      {/* Hero Section with background image */}
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Tampa Bay's Tech Community Hub
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              Discover {totalGroups}+ tech groups and {totalEvents}+ upcoming events.
              Connect with developers, engineers, and technologists in Tampa Bay.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/events"
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

      {/* Featured Event */}
      {featuredEvent && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <EventCard event={featuredEvent} variant="featured" />
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
              to="/events"
              className="text-navy dark:text-gray-300 hover:underline text-sm font-medium"
            >
              View all events →
            </Link>
          </div>
          <EventCarousel events={upcomingEvents} />
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
            <AddToCalendar label="Subscribe" />
            <a
              href="https://events.api.tampa.dev/2026-01-25/rss"
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
