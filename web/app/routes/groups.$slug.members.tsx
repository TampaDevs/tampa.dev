/**
 * Group Members Page
 *
 * Displays public users who have favorited this group.
 */

import { Link, data } from "react-router";
import { Avatar } from "~/components/Avatar";
import type { Route } from "./+types/groups.$slug.members";
import { generateMetaTags } from "~/lib/seo";

interface GroupMember {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  favoritedAt: string;
}

interface GroupMembersData {
  groupName: string;
  groupSlug: string;
  members: GroupMember[];
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  if (!loaderData) {
    return [{ title: "Group Not Found | Tampa.dev" }];
  }

  return generateMetaTags({
    title: `${loaderData.groupName} Members | Tampa.dev`,
    description: `Members who follow ${loaderData.groupName} on Tampa.dev`,
    url: `/groups/${loaderData.groupSlug}/members`,
  });
};

export async function loader({ params }: Route.LoaderArgs) {
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  const response = await fetch(
    `${apiUrl}/groups/${encodeURIComponent(params.slug!)}/members`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw data(null, { status: 404 });
  }

  return (await response.json()) as GroupMembersData;
}

export default function GroupMembersPage({ loaderData }: Route.ComponentProps) {
  const { groupName, groupSlug, members } = loaderData;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
          <li>
            <Link
              to={`/groups/${groupSlug}`}
              className="text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
            >
              {groupName}
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 dark:text-white font-medium">
            Members
          </li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {groupName} Members
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {members.length} public member{members.length !== 1 ? "s" : ""} following this group
      </p>

      {members.length === 0 ? (
        <div className="text-center py-16">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            No public members yet. Be the first to favorite this group and land here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Link
              key={member.username}
              to={`/p/${member.username}`}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-coral/30 dark:hover:border-coral/30 transition-colors"
            >
              <Avatar
                src={member.avatarUrl || undefined}
                name={member.name || member.username}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {member.name || member.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{member.username}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Joined{" "}
                  {new Date(member.favoritedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
