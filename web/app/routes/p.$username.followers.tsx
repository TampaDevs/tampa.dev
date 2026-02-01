import type { Route } from "./+types/p.$username.followers";
import { Link } from "react-router";
import { Avatar } from "@tampadevs/react";
import { generateMetaTags } from "~/lib/seo";

interface Follower {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  followedAt: string | null;
}

interface UserProfile {
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  themeColor: string | null;
}

const PAGE_SIZE = 24;

const CORAL_GRADIENT =
  "linear-gradient(135deg, #C44D44 0%, #E85A4F 40%, #F07167 100%)";

function formatFollowedSince(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data) return [];
  const { profile } = data;
  const displayName = profile.name || profile.username;
  return generateMetaTags({
    title: `${displayName}'s Followers`,
    description: `People following ${displayName} on Tampa.dev`,
    url: `/p/${profile.username}/followers`,
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiUrl =
    import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const username = encodeURIComponent(params.username!);

  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const [profileRes, followersRes] = await Promise.all([
    fetch(`${apiUrl}/users/${username}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(
      `${apiUrl}/users/${username}/followers?limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: { Accept: "application/json" } }
    ),
  ]);

  if (!profileRes.ok) {
    throw new Response("Not Found", { status: 404 });
  }

  const profile = ((await profileRes.json()) as { data: UserProfile }).data;

  let followers: Follower[] = [];
  let total = 0;
  let limit = PAGE_SIZE;

  if (followersRes.ok) {
    const body = (await followersRes.json()) as { data: Follower[]; pagination: { total: number; limit: number; offset: number } };
    followers = body.data ?? [];
    total = body.pagination.total ?? 0;
    limit = body.pagination.limit ?? PAGE_SIZE;
  }

  return {
    profile,
    followers,
    total,
    limit,
    offset,
  };
}

export default function FollowersPage({ loaderData }: Route.ComponentProps) {
  const { profile, followers, total, limit, offset } = loaderData;
  const displayName = profile.name || profile.username;

  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;
  const nextOffset = offset + limit;
  const prevOffset = Math.max(0, offset - limit);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit) || 1;

  function buildPageUrl(newOffset: number): string {
    const params = new URLSearchParams();
    if (newOffset > 0) params.set("offset", newOffset.toString());
    const qs = params.toString();
    return qs
      ? `/p/${profile.username}/followers?${qs}`
      : `/p/${profile.username}/followers`;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            to={`/p/${profile.username}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to profile
          </Link>

          <div className="flex items-center gap-4">
            <Avatar
              src={profile.avatarUrl || undefined}
              name={displayName}
              size="md"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {displayName}&apos;s Followers
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span>{" "}
                {total === 1 ? "follower" : "followers"}
              </p>
            </div>
          </div>
        </div>

        {/* Followers Grid */}
        {followers.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No followers yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {followers.map((follower) => (
                <Link
                  key={follower.username}
                  to={`/p/${follower.username}`}
                  className="group block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="relative h-1.5 overflow-hidden">
                    <div className="absolute inset-0" style={{ background: CORAL_GRADIENT }} />
                    <div className="absolute inset-0 backdrop-blur-[0.5px] bg-white/[0.03]" />
                  </div>
                  <div className="p-5 pt-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3">
                        <Avatar src={follower.avatarUrl || undefined} name={follower.name || follower.username} size="sm" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate w-full">
                        {follower.name || follower.username}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">
                        @{follower.username}
                      </p>
                    </div>
                    {follower.followedAt && (
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                        Followed since {formatFollowedSince(follower.followedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                {hasPrevPage ? (
                  <Link to={buildPageUrl(prevOffset)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 font-medium text-sm cursor-not-allowed">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                    Previous
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                {hasNextPage ? (
                  <Link to={buildPageUrl(nextOffset)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Next
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 font-medium text-sm cursor-not-allowed">
                    Next
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
