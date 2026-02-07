/**
 * Profile Feeds Tab
 *
 * RSS and iCalendar feed URLs for the user's favorite groups.
 */

import { useOutletContext } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/profile.feeds";
import type { FavoriteGroup, ProfileContext } from "~/lib/profile-types";
import { fetchCurrentUser } from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) return { favoriteGroups: [] };

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  const response = await fetch(`${apiUrl}/favorites`, { headers });
  let favoriteGroups: FavoriteGroup[] = [];
  if (response.ok) {
    const json = await response.json() as { data: FavoriteGroup[] };
    favoriteGroups = json.data || [];
  }

  return { favoriteGroups };
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-coral hover:text-coral-dark transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 font-mono truncate"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>
    </div>
  );
}

function FeedsSection({ favoriteGroups, apiBaseUrl }: { favoriteGroups: FavoriteGroup[]; apiBaseUrl: string }) {
  const groupSlugs = favoriteGroups.map((g) => g.groupSlug).join(",");
  const hasGroups = favoriteGroups.length > 0;

  const allEventsRss = `${apiBaseUrl}/rss`;
  const allEventsIcal = `${apiBaseUrl}/ics`;
  const favoritesRss = hasGroups ? `${apiBaseUrl}/rss?groups=${groupSlugs}` : null;
  const favoritesIcal = hasGroups ? `${apiBaseUrl}/ics?groups=${groupSlugs}` : null;

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Event Feeds</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscribe to event feeds in your calendar app or RSS reader.
        </p>
      </div>

      {hasGroups && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Your Favorites ({favoriteGroups.length} group{favoriteGroups.length !== 1 ? "s" : ""})
          </h4>
          <div className="space-y-3">
            <CopyableUrl label="RSS Feed (favorites only)" url={favoritesRss!} />
            <CopyableUrl label="iCalendar Feed (favorites only)" url={favoritesIcal!} />
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          All Events
        </h4>
        <div className="space-y-3">
          <CopyableUrl label="RSS Feed (all events)" url={allEventsRss} />
          <CopyableUrl label="iCalendar Feed (all events)" url={allEventsIcal} />
        </div>
      </div>

      {!hasGroups && (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          Favorite some groups to get a personalized feed with only events from groups you follow.
        </p>
      )}
    </div>
  );
}

export default function FeedsTab({ loaderData }: Route.ComponentProps) {
  const { apiBaseUrl } = useOutletContext<ProfileContext>();

  return (
    <FeedsSection favoriteGroups={loaderData.favoriteGroups} apiBaseUrl={apiBaseUrl} />
  );
}
