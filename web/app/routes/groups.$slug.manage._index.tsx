/**
 * Group Management Dashboard - Overview (Index Route)
 *
 * Displays key stats, quick actions, and recent events for the managed group.
 * Receives group context from the parent layout via useOutletContext.
 */

import { Link, useOutletContext } from "react-router";
import type { Route } from "./+types/groups.$slug.manage._index";
import { fetchCurrentUser } from "~/lib/admin-api.server";
import {
  fetchManagedEvents,
  fetchMembers,
} from "~/lib/group-manage-api.server";
import type {
  ManagedGroup,
  ManagedEvent,
  GroupMember,
  GroupPermissions,
} from "~/lib/group-manage-api.server";

interface OutletContext {
  group: ManagedGroup;
  userRole: string;
  permissions: GroupPermissions;
}

export const meta: Route.MetaFunction = ({ matches }) => {
  const parentData = matches.find(
    (m) => m.id === "routes/groups.$slug.manage"
  )?.data as { group?: ManagedGroup } | undefined;
  const groupName = parentData?.group?.name ?? "Group";
  return [{ title: `Dashboard - ${groupName} | Tampa.dev` }];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    return { events: [], members: [] };
  }

  // Resolve group ID from slug
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const groupRes = await fetch(
    `${apiHost}/groups/${encodeURIComponent(params.slug!)}`,
    { headers: { Accept: "application/json" } }
  );

  if (!groupRes.ok) {
    return { events: [], members: [] };
  }

  const publicGroup = (await groupRes.json()) as { id: string };

  let events: ManagedEvent[] = [];
  let members: GroupMember[] = [];

  try {
    const [eventsData, membersData] = await Promise.all([
      fetchManagedEvents(publicGroup.id, cookieHeader),
      fetchMembers(publicGroup.id, cookieHeader),
    ]);
    events = eventsData;
    members = membersData;
  } catch (err) {
    console.error("Failed to fetch group management data:", err);
  }

  return { events, members };
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: "coral" | "navy" | "green" | "purple";
}) {
  const accentStyles = {
    coral: "bg-coral/10 text-coral dark:bg-coral/20",
    navy: "bg-navy/10 text-navy dark:bg-navy-light/20 dark:text-navy-light",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentStyles[accent]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  to,
  label,
  icon,
  variant = "secondary",
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        variant === "primary"
          ? "bg-coral hover:bg-coral-dark text-white"
          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function RecentEventRow({ event }: { event: ManagedEvent }) {
  const isUpcoming =
    new Date(event.startTime) > new Date() && event.status !== "cancelled";
  const isPast = new Date(event.startTime) <= new Date();

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      {/* Date badge */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase leading-none">
          {new Date(event.startTime).toLocaleDateString("en-US", {
            month: "short",
            timeZone: "America/New_York",
          })}
        </span>
        <span className="text-lg font-bold text-gray-900 dark:text-white leading-none mt-0.5">
          {new Date(event.startTime).toLocaleDateString("en-US", {
            day: "numeric",
            timeZone: "America/New_York",
          })}
        </span>
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {event.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {formatEventDate(event.startTime)}
        </p>
      </div>

      {/* Status + stats */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1" title="RSVPs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {event.rsvpSummary.confirmed}
          </span>
          <span className="flex items-center gap-1" title="Checkins">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {event.checkinCount}
          </span>
        </div>

        {event.status === "cancelled" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Cancelled
          </span>
        ) : event.status === "draft" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Draft
          </span>
        ) : isUpcoming ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Upcoming
          </span>
        ) : isPast ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            Past
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function GroupManageDashboard({
  loaderData,
}: Route.ComponentProps) {
  const { events, members } = loaderData;
  const { group, userRole, permissions } =
    useOutletContext<OutletContext>();

  const now = new Date();

  const upcomingEvents = events.filter(
    (e) => new Date(e.startTime) > now && e.status !== "cancelled"
  );

  const totalRsvps = upcomingEvents.reduce(
    (sum, e) => sum + e.rsvpSummary.confirmed,
    0
  );

  const totalCheckins = events.reduce((sum, e) => sum + e.checkinCount, 0);

  // Show the 5 most recent events (upcoming first, then past)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Overview of {group.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Members"
          value={members.length}
          accent="navy"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Events"
          value={upcomingEvents.length}
          accent="coral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          label="Upcoming RSVPs"
          value={totalRsvps}
          accent="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Checkins"
          value={totalCheckins}
          accent="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {permissions.canManageEvents && (
            <QuickActionButton
              to={`/groups/${group.urlname}/manage/events/new`}
              label="Create Event"
              variant="primary"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            />
          )}
          {permissions.canManageMembers && (
            <QuickActionButton
              to={`/groups/${group.urlname}/manage/members`}
              label="Manage Members"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            />
          )}
          <QuickActionButton
            to={`/groups/${group.urlname}`}
            label="View Group"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Events
          </h2>
          <Link
            to={`/groups/${group.urlname}/manage/events`}
            className="text-sm font-medium text-coral hover:text-coral-dark dark:hover:text-coral-light transition-colors"
          >
            View all
          </Link>
        </div>

        {recentEvents.length > 0 ? (
          <div className="px-5 py-1">
            {recentEvents.map((event) => (
              <RecentEventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
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
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No events yet.
            </p>
            {permissions.canManageEvents && (
              <Link
                to={`/groups/${group.urlname}/manage/events/new`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral hover:text-coral-dark dark:hover:text-coral-light transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first event
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Member Activity Summary */}
      {members.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Team Members
            </h2>
            {permissions.canManageMembers && (
              <Link
                to={`/groups/${group.urlname}/manage/members`}
                className="text-sm font-medium text-coral hover:text-coral-dark dark:hover:text-coral-light transition-colors"
              >
                Manage
              </Link>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="flex flex-wrap gap-3">
              {members.slice(0, 8).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full"
                >
                  {member.user?.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        {(member.user?.name || member.user?.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {member.user?.name || member.user?.username || member.user?.email || "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {member.role}
                  </span>
                </div>
              ))}
              {members.length > 8 && (
                <Link
                  to={`/groups/${group.urlname}/manage/members`}
                  className="flex items-center px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-coral transition-colors"
                >
                  +{members.length - 8} more
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
