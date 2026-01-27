import type { Route } from "./+types/groups.$slug";
import { Link } from "react-router";
import { fetchEvents } from "~/lib/api.server";
import { generateMetaTags } from "~/lib/seo";
import { groupToJsonLd, eventsToJsonLd } from "~/lib/structured-data";
import { AddToCalendar, EventCard, StructuredData } from "~/components";
import { getGroupBySlug } from "~/data/groups";
import { data } from "react-router";

const API_BASE = "https://events.api.tampa.dev/2026-01-25";

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data?.group) {
    return [{ title: "Group Not Found | Tampa Tech Events" }];
  }

  const tags = generateMetaTags({
    title: data.group.name,
    description: data.group.description,
    image: data.group.logo,
    url: `/groups/${data.group.slug}`,
  });

  // Add RSS feed discovery link if group has events
  if (data.group.meetupUrlname) {
    tags.push({
      tagName: "link",
      rel: "alternate",
      type: "application/rss+xml",
      title: `${data.group.name} Events`,
      href: `${API_BASE}/rss?groups=${data.group.meetupUrlname}`,
    });
  }

  return tags;
};

export async function loader({ params }: Route.LoaderArgs) {
  const group = getGroupBySlug(params.slug!);

  if (!group) {
    throw data(null, { status: 404 });
  }

  let events: Awaited<ReturnType<typeof fetchEvents>> = [];

  if (group.meetupUrlname) {
    events = await fetchEvents({
      groups: [group.meetupUrlname],
      withinDays: 60,
    });
  }

  return {
    group,
    events,
  };
}

export default function GroupDetail({ loaderData }: Route.ComponentProps) {
  const { group, events } = loaderData;

  return (
    <>
      <StructuredData
        data={[groupToJsonLd(group), ...(events.length > 0 ? [eventsToJsonLd(events)] : [])]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/groups"
                className="text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
              >
                Groups
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 dark:text-white font-medium">
              {group.name}
            </li>
          </ol>
        </nav>

        {/* Group Header */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="flex-shrink-0">
            <img
              src={group.logo}
              alt={group.name}
              className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover shadow-lg"
              onError={(e) => {
                e.currentTarget.src = "/images/placeholder-group.png";
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {group.name}
              </h1>
              {group.meetupUrlname && (
                <a
                  href={`${API_BASE}/rss?groups=${group.meetupUrlname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-coral dark:text-gray-500 dark:hover:text-coral transition-colors"
                  title={`RSS feed for ${group.name}`}
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
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {group.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-navy/5 dark:bg-white/10 text-navy/70 dark:text-gray-300 border border-navy/10 dark:border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {group.description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={group.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
              >
                Visit Website
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

              {group.meetupUrlname && (
                <AddToCalendar
                  groupUrlname={group.meetupUrlname}
                  groupName={group.name}
                  label="Subscribe"
                  size="small"
                />
              )}

              {group.socialLinks?.slack && (
                <a
                  href={group.socialLinks.slack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#4A154B] hover:bg-[#611f69] text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                  </svg>
                  Join Slack
                </a>
              )}

              {group.socialLinks?.discord && (
                <a
                  href={group.socialLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Join Discord
                </a>
              )}

              {group.socialLinks?.meetup && (
                <a
                  href={group.socialLinks.meetup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16.933 16.933">
                    <path d="M14.382 15.4c-1.283-.226-2.61-1.053-2.87-2.416-.146-1.186.082-2.403.675-3.443l1.802-3.387c.353-.692-.466-1.536-1.102-.972-.8.762-1.11 1.858-1.607 2.813-.646 1.323-1.168 2.718-1.957 3.965-.388.613-1.064 1.27-1.852.987-.875-.268-.643-1.29-.357-1.922.487-1.44 1.3-2.786 1.494-4.313.32-.876-.97-1.515-1.414-.66l-1.72 4.082c-.502 1.13-.647 2.38-1.133 3.5-.455.884-1.62 1-2.5.895-.952-.128-1.87-.895-1.83-1.914-.1-1.475.567-2.85.9-4.257.45-1.527.984-3.034 1.614-4.496.473-.965 1.224-2.115 2.435-2.096 1.08-.12 1.945.66 2.923.946 1.166.192 1.64-1.36 2.79-1.266.887-.042 1.375 1.092 2.258.914 1.028-.34 2.305-.5 3.214.21.81.764.544 2.008.264 2.956-.626 2.08-1.983 3.892-2.388 6.043-.19.745.066 1.782.987 1.82.735.108 1.88.244 1.928 1.184-.382.954-1.694.99-2.55.818z" />
                  </svg>
                  Meetup
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Upcoming Events
          </h2>

          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <p className="text-gray-500 dark:text-gray-400">
                {group.meetupUrlname
                  ? "No upcoming events scheduled. Check back soon!"
                  : "This group doesn't list events through Meetup. Visit their website for event information."}
              </p>
              <a
                href={group.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral hover:underline"
              >
                Visit {group.name} →
              </a>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
