import type { Route } from "./+types/favorites";
import { Link } from "react-router";
import { generateMetaTags } from "~/lib/seo";
import { groups } from "~/data/groups";
import { GroupCard } from "~/components";
import { useEffect, useState } from "react";
import { getFavorites } from "~/lib/favorites";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Your Favorites",
    description: "Your favorite tech groups in Tampa Bay.",
    url: "/favorites",
    noIndex: true, // Don't index personal pages
  });
};

export default function Favorites() {
  const [favoritesSlugs, setFavoritesSlugs] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setFavoritesSlugs(getFavorites());
    setIsLoaded(true);
  }, []);

  const favoriteGroups = groups.filter((g) => favoritesSlugs.includes(g.slug));

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Your Favorites
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {favoriteGroups.length > 0
            ? `${favoriteGroups.length} groups you're following`
            : "Groups you favorite will appear here"}
        </p>
      </div>

      {favoriteGroups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteGroups.map((group) => (
            <GroupCard key={group.slug} group={group} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No favorites yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Browse groups and click the heart icon to add them to your
            favorites. Your selections are saved locally in your browser.
          </p>
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Browse Groups
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
        </div>
      )}
    </div>
  );
}
