/**
 * Group Management Layout Route
 *
 * Provides the management shell with sidebar navigation for group organizers.
 * Requires authentication and appropriate group role - redirects to login if not authenticated,
 * returns 403 if user does not have dashboard access.
 */

import { Outlet, NavLink, Link, redirect, data } from "react-router";
import { useState, useRef, useEffect } from "react";
import type { Route } from "./+types/groups.$slug.manage";
import { fetchCurrentUser } from "~/lib/admin-api.server";
import {
  fetchManagedGroup,
  fetchMyRole,
} from "~/lib/group-manage-api.server";
import type {
  ManagedGroup,
  GroupPermissions,
} from "~/lib/group-manage-api.server";

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  const groupName = loaderData?.group?.name ?? "Group";
  return [
    { title: `Manage ${groupName} | Tampa.dev` },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    throw redirect(`/login?returnTo=/groups/${params.slug}/manage`);
  }

  // Resolve group ID from slug via the public API
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const groupRes = await fetch(
    `${apiHost}/groups/${encodeURIComponent(params.slug!)}`,
    { headers: { Accept: "application/json" } }
  );

  if (!groupRes.ok) {
    throw data(null, { status: 404 });
  }

  const publicGroup = (await groupRes.json()) as { id: string; urlname: string };

  // Fetch the user's role in this group
  let userRole: string;
  let permissions: GroupPermissions;

  try {
    const roleData = await fetchMyRole(publicGroup.id, cookieHeader);
    userRole = roleData.role;
    permissions = roleData.permissions;
  } catch {
    throw data({ error: "Unable to verify your role in this group." }, { status: 403 });
  }

  // If the user has no role, deny access
  if (userRole === "none" || !permissions.canViewDashboard) {
    throw data(
      { error: "You do not have permission to manage this group." },
      { status: 403 }
    );
  }

  // Fetch the full managed group details
  let group: ManagedGroup;
  try {
    group = await fetchManagedGroup(publicGroup.id, cookieHeader);
  } catch {
    throw data(
      { error: "Unable to load group management data." },
      { status: 500 }
    );
  }

  return { group, userRole, permissions };
}

function buildNavLinks(slug: string) {
  return [
    {
      to: `/groups/${slug}/manage`,
      label: "Overview",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      end: true,
    },
    {
      to: `/groups/${slug}/manage/events`,
      label: "Events",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      end: false,
    },
    {
      to: `/groups/${slug}/manage/members`,
      label: "Team",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      end: false,
    },
    {
      to: `/groups/${slug}/manage/badges`,
      label: "Badges",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      end: false,
    },
    {
      to: `/groups/${slug}/manage/checkins`,
      label: "Checkins",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      end: false,
    },
    {
      to: `/groups/${slug}/manage/settings`,
      label: "Settings",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      end: false,
    },
  ];
}

export default function GroupManageLayout({ loaderData }: Route.ComponentProps) {
  const { group, userRole, permissions } = loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navLinks = buildNavLinks(group.urlname);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!sidebarOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [sidebarOpen]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-navy dark:bg-gray-950 border-b border-navy-light/20 dark:border-gray-800">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link to={`/groups/${group.urlname}/manage`} className="flex items-center gap-2.5">
              {group.photoUrl ? (
                <img
                  src={group.photoUrl}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-coral/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-coral">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate max-w-48">
                  {group.name}
                </span>
                <span className="text-xs font-medium text-white/50 border-l border-white/20 pl-2">
                  Manage
                </span>
              </div>
              <span className="sm:hidden text-sm font-semibold text-white truncate max-w-32">
                Manage
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-coral/15 text-coral capitalize">
              {userRole}
            </span>
            <Link
              to={`/groups/${group.urlname}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Group</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-14">
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            {/* Group identity at top of sidebar */}
            <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {group.photoUrl ? (
                  <img
                    src={group.photoUrl}
                    alt={group.name}
                    className="w-10 h-10 rounded-xl object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder-group.svg";
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-coral/10 dark:bg-coral/20 flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-coral">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {group.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {userRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-coral/10 text-coral dark:bg-coral/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    }`
                  }
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Back to group link at bottom */}
            <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
              <Link
                to={`/groups/${group.urlname}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Back to Group
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div
              ref={sidebarRef}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col pt-14"
            >
              {/* Group identity */}
              <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {group.photoUrl ? (
                    <img
                      src={group.photoUrl}
                      alt={group.name}
                      className="w-10 h-10 rounded-xl object-cover shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder-group.svg";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-coral/10 dark:bg-coral/20 flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-coral">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {userRole}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-coral/10 text-coral dark:bg-coral/20"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                      }`
                    }
                  >
                    {link.icon}
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Back to group */}
              <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
                <Link
                  to={`/groups/${group.urlname}`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back to Group
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 md:ml-64">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet context={{ group, userRole, permissions }} />
          </div>
        </main>
      </div>
    </div>
  );
}
