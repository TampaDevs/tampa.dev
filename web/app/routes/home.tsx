import type { Route } from "./+types/home";
import { Link, useRouteLoaderData } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { fetchEvents, fetchGroups, toLocalGroup } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import {
  eventsToJsonLd,
  websiteJsonLd,
  organizationJsonLd,
  faqPageJsonLd,
  type FAQItem,
} from "~/lib/structured-data";
import { AddToCalendar, EventCard, EventCarousel, GroupCard, NewsletterSignup, StructuredData } from "~/components";
import { OnboardingChecklist, type OnboardingStep } from "~/components/OnboardingChecklist";
import { useWS } from "~/hooks/WebSocketProvider";
import { getFavorites } from "~/lib/favorites";
import type { Event } from "~/lib/types";

interface OnboardingStepResponse {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  dismissed: boolean;
}

const HOMEPAGE_FAQS: FAQItem[] = [
  {
    question: "What is the best website for tech events in Tampa Bay?",
    answer:
      "Tampa.dev is the Tampa Bay tech events calendar. It aggregates developer meetups, startup events, and tech community gatherings from dozens of independent groups across Tampa, St. Petersburg, Clearwater, and the wider Tampa Bay area into a single, searchable calendar.",
  },
  {
    question: "Where can I find Tampa developer meetups?",
    answer:
      "Tampa.dev lists developer meetups from groups across Tampa Bay, including meetups focused on JavaScript, Python, cloud computing, AI/ML, cybersecurity, and more. Browse the full calendar at tampa.dev/calendar or explore groups at tampa.dev/groups.",
  },
  {
    question: "How do I submit an event or add my group?",
    answer:
      "To add your tech group or community to Tampa.dev, open an issue on the Tampa.dev GitHub repository. Once your group is added, its events are automatically synced and displayed on the calendar.",
  },
  {
    question: "Is this only Tampa events or all of Tampa Bay?",
    answer:
      "Tampa.dev covers the entire Tampa Bay area, including Tampa, St. Petersburg, Clearwater, Brandon, Sarasota, and surrounding cities. Both in-person and online events from the region are listed.",
  },
  {
    question: "Why build in Tampa Bay?",
    answer:
      "Tampa Bay sits on the Eastern time zone, aligned with NYC, DC, and Boston, with a lower cost of living and a growing community of builders across software, startups, and entrepreneurship. Tampa.dev brings it all together in one calendar.",
  },
  {
    question: "Are there founder meetups in Tampa Bay?",
    answer:
      "Yes. Tampa Bay has a growing community of founders and startup builders. Tampa.dev aggregates founder meetups, pitch nights, demo days, and startup networking events from groups across the region.",
  },
];

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tampa Bay Tech Events Calendar",
    description:
      "The Tampa Bay tech events calendar for developers, founders, and startup builders. Browse meetups, tech talks, and community events across Tampa, St. Petersburg, and Clearwater.",
    url: "/",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

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

  const apiBase = `${apiHost}/2026-01-25`;

  // Fetch onboarding steps if user is authenticated
  let onboardingSteps: OnboardingStepResponse[] = [];
  if (cookieHeader) {
    try {
      const onboardingRes = await fetch(`${apiHost}/me/onboarding`, {
        headers: {
          Accept: "application/json",
          Cookie: cookieHeader,
        },
      });
      if (onboardingRes.ok) {
        const onboardingData = (await onboardingRes.json()) as {
          steps?: OnboardingStepResponse[];
        };
        onboardingSteps = onboardingData.steps || [];
      }
    } catch {
      // Silently fail - onboarding is not critical
    }
  }

  return {
    events: events.slice(0, 12),
    featuredEvent: events[0] ?? null,
    upcomingEvents: events.slice(1, 7),
    featuredGroups,
    allGroups,
    totalGroups: allGroups.length,
    totalEvents: events.length,
    apiBase,
    onboardingSteps,
  };
}

function PersonalizedDashboard({
  userName,
  events,
  totalGroups,
  totalEvents,
}: {
  userName: string;
  events: Event[];
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
    <section className="relative overflow-hidden py-12">
      {/* Coral background layer */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #C44D44 0%, #E85A4F 40%, #F07167 100%)" }}
      />
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-white/[0.88] dark:bg-gray-950/[0.85] backdrop-blur-xl" />
      {/* Subtle coral accent tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #E85A4F0a 0%, transparent 50%)" }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {userName} 👋
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight font-bold">
            Tampa Bay's Tech Events Hub
          </h1>
          <p className="mt-6 text-xl text-gray-200">
            Tampa.dev is the community events index for developers, founders, and startup builders across Tampa Bay.
            Browse <span className="font-semibold text-white">{totalGroups}+ tech groups</span> and{" "}
            <span className="font-semibold text-white">{totalEvents}+ upcoming events</span> from
            independent communities in Tampa, St.&nbsp;Petersburg, and Clearwater.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-coral/15 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
            >
              Browse the Events Calendar
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
              Explore Tech Groups
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQAccordionItem({ faq }: { faq: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 md:border-0 md:bg-white md:dark:bg-gray-800 md:rounded-xl md:border md:border-gray-200 md:dark:border-gray-700 md:p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 md:py-0 text-left md:cursor-default"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white md:mb-2 pr-4">
          {faq.question}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all md:block ${open ? "max-h-96 pb-4" : "max-h-0 md:max-h-none"}`}>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {faq.answer}
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        Frequently Asked Questions
      </h2>
      {/* Mobile: accordion list, Desktop: 2-col card grid */}
      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
        {HOMEPAGE_FAQS.map((faq) => (
          <FAQAccordionItem key={faq.question} faq={faq} />
        ))}
      </div>
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {HOMEPAGE_FAQS.map((faq) => (
          <div
            key={faq.question}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {faq.question}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickLinks() {
  const links = [
    { to: "/tampa-bay-tech-events", label: "Tampa Bay tech events" },
    { to: "/tampa-developer-meetups", label: "Developer meetups in Tampa" },
    { to: "/tampa-startup-events", label: "Tampa startup events" },
    { to: "/tampa-founder-meetups", label: "Founder meetups in Tampa Bay" },
    { to: "/st-petersburg-tech-events", label: "St. Petersburg tech events" },
    { to: "/clearwater-tech-events", label: "Clearwater tech events" },
    { to: "/tampa-ai-meetups", label: "Tampa AI & ML meetups" },
    { to: "/tampa-entrepreneurship-events", label: "Entrepreneurship events" },
    { to: "/map", label: "Event map" },
    { to: "/builders", label: "Build on Tampa.dev" },
  ];

  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Explore Tech in Tampa Bay
        </h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-coral/50 hover:text-coral dark:hover:text-coral transition-colors"
            >
              {link.label}
            </Link>
          ))}
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
    onboardingSteps: initialOnboardingSteps,
  } = loaderData;

  const rootData = useRouteLoaderData("root") as { user?: { name: string | null; email: string } | null } | undefined;
  const user = rootData?.user;

  const { personal } = useWS();

  // Onboarding checklist state
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(
    initialOnboardingSteps || []
  );
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  // Real-time onboarding step completion via WebSocket
  useEffect(() => {
    return personal.on('onboarding.step_completed', (msg) => {
      setOnboardingSteps((prev) =>
        prev.map((s) =>
          s.key === msg.data.stepKey ? { ...s, completed: true } : s
        )
      );
    });
  }, [personal]);

  const visibleSteps = onboardingSteps.filter((s) => !s.dismissed);
  const hasIncompleteSteps = visibleSteps.some((s) => !s.completed);
  const showChecklist = user && !checklistDismissed && hasIncompleteSteps && visibleSteps.length > 0;

  const handleDismissStep = useCallback(
    async (stepKey: string) => {
      // Optimistic update
      setOnboardingSteps((prev) =>
        prev.map((s) => (s.key === stepKey ? { ...s, dismissed: true } : s))
      );
      try {
        const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
        await fetch(`${apiUrl}/me/onboarding/${encodeURIComponent(stepKey)}/dismiss`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
      } catch {
        // Revert on failure
        setOnboardingSteps((prev) =>
          prev.map((s) => (s.key === stepKey ? { ...s, dismissed: false } : s))
        );
      }
    },
    []
  );

  const handleDismissAll = useCallback(async () => {
    setChecklistDismissed(true);
    try {
      const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
      await fetch(`${apiUrl}/me/onboarding/dismiss-all`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // If the API call fails, the checklist is already hidden for this session
    }
  }, []);

  return (
    <>
      <StructuredData
        data={[
          websiteJsonLd(),
          organizationJsonLd(),
          eventsToJsonLd(events),
          faqPageJsonLd(HOMEPAGE_FAQS),
        ]}
      />

      {/* Hero / Personalized Dashboard */}
      {user ? (
        <PersonalizedDashboard
          userName={(user.name || user.email.split("@")[0]).split(" ")[0]}
          events={events}
          totalGroups={totalGroups}
          totalEvents={totalEvents}
        />
      ) : (
        <HeroSection totalGroups={totalGroups} totalEvents={totalEvents} />
      )}

      {/* Onboarding Checklist */}
      {showChecklist && (
        <OnboardingChecklist
          steps={visibleSteps}
          onDismiss={handleDismissStep}
          onDismissAll={handleDismissAll}
        />
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

      {/* FAQ Section */}
      <FAQSection />

      {/* Quick Links / Internal Linking */}
      <QuickLinks />

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
