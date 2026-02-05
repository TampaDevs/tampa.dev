/**
 * Managed Groups Landing Page
 *
 * Lists all groups the current user can manage, with links to each
 * group's management dashboard.
 */

import type { Route } from "./+types/groups.manage";
import { Link, redirect } from "react-router";
import { fetchCurrentUser } from "~/lib/api.server";
import { fetchManagedGroups, type ManagedGroup } from "~/lib/group-manage-api.server";
import { generateMetaTags } from "~/lib/seo";
import { GroupAvatar } from "~/components/GroupAvatar";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Manage Groups",
    description: "Manage your Tampa.dev groups.",
    url: "/groups/manage",
    noIndex: true,
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    throw redirect("/login");
  }

  let groups: ManagedGroup[] = [];
  try {
    groups = await fetchManagedGroups(cookieHeader);
  } catch {
    // User may not manage any groups
  }

  return { groups };
}

const roleBadgeStyles: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  volunteer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ManageGroups({ loaderData }: Route.ComponentProps) {
  const { groups } = loaderData;

  return (
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
            Manage
          </li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Manage Groups
      </h1>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.urlname}/manage`}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-coral/40 dark:hover:border-coral/40 hover:shadow-md transition-all"
            >
              {/* Hero / Photo */}
              <div className="h-32 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                {group.heroImageUrl ? (
                  <img
                    src={group.heroImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: group.themeColor
                        ? `linear-gradient(135deg, ${group.themeColor}, ${group.themeColor}88)`
                        : "linear-gradient(135deg, #1a365d, #2a4a7f)",
                    }}
                  />
                )}
                {/* Group avatar overlay */}
                <div className="absolute -bottom-6 left-4">
                  <div className="w-14 h-14 rounded-xl border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-800">
                    <GroupAvatar
                      photoUrl={group.photoUrl}
                      name={group.name}
                      themeColor={group.themeColor}
                      size="lg"
                      shape="rounded"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="pt-8 pb-4 px-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-coral dark:group-hover:text-coral transition-colors line-clamp-1">
                    {group.name}
                  </h2>
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${roleBadgeStyles[group.userRole] || roleBadgeStyles.member}`}
                  >
                    {group.userRole}
                  </span>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  {group.memberCount != null && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {group.memberCount} members
                    </span>
                  )}
                  {!group.isActive && (
                    <span className="text-yellow-600 dark:text-yellow-400">Inactive</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
            You don't manage any groups yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-md mx-auto">
            When you're added as an owner, manager, or volunteer to a group,
            it will appear here.
          </p>
          <Link
            to="/groups"
            className="mt-6 inline-flex items-center gap-2 text-coral hover:text-coral-dark dark:hover:text-coral-light font-medium"
          >
            Browse groups
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
