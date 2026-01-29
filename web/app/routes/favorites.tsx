import type { Route } from "./+types/favorites";
import { Link, useRouteLoaderData } from "react-router";
import { generateMetaTags } from "~/lib/seo";
import { fetchGroups, toLocalGroup, type LocalGroupCompat } from "~/lib/api.server";
import { GroupCard } from "~/components";
import { useEffect, useState, useRef, useCallback } from "react";
import { getFavorites, isFavorite, syncFavoritesWithServer, hasBeenSynced } from "~/lib/favorites";

export async function loader() {
  const apiGroups = await fetchGroups();
  const groups = apiGroups.map(toLocalGroup);
  return { groups };
}

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Your Favorites",
    description: "Your favorite tech groups in Tampa Bay.",
    url: "/favorites",
    noIndex: true, // Don't index personal pages
  });
};

interface FadingGroupCardProps {
  group: LocalGroupCompat;
  onRemove: (slug: string) => void;
}

function FadingGroupCard({ group, onRemove }: FadingGroupCardProps) {
  const [isUnfavorited, setIsUnfavorited] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check favorite status periodically and on storage changes
  useEffect(() => {
    const checkFavoriteStatus = () => {
      if (!isFavorite(group.slug)) {
        setIsUnfavorited(true);
      }
    };

    // Check immediately
    checkFavoriteStatus();

    // Listen for storage changes (from other tabs or same-tab changes)
    const handleStorage = () => checkFavoriteStatus();
    window.addEventListener("storage", handleStorage);

    // Also poll occasionally to catch same-tab changes
    const interval = setInterval(checkFavoriteStatus, 100);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [group.slug]);

  // Handle removal with delay after mouse leaves
  useEffect(() => {
    if (isUnfavorited && !isHovered) {
      removeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        // After fade animation completes, remove from list
        setTimeout(() => onRemove(group.slug), 300);
      }, 1000);
    }

    return () => {
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
      }
    };
  }, [isUnfavorited, isHovered, group.slug, onRemove]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`transition-all duration-300 ${
        isUnfavorited && !isHovered ? "opacity-50" : "opacity-100"
      }`}
    >
      <GroupCard group={group} />
    </div>
  );
}

export default function Favorites({ loaderData }: Route.ComponentProps) {
  const { groups } = loaderData;
  const [favoritesSlugs, setFavoritesSlugs] = useState<string[]>([]);
  const [removedSlugs, setRemovedSlugs] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  // Get user from root loader to check if authenticated
  const rootData = useRouteLoaderData("root") as { user?: { id: string } | null } | undefined;
  const isAuthenticated = !!rootData?.user;

  useEffect(() => {
    const loadFavorites = async () => {
      // Start with localStorage favorites
      const localFavorites = getFavorites();
      setFavoritesSlugs(localFavorites);
      setIsLoaded(true);

      // If authenticated and not synced recently, sync with server
      if (isAuthenticated && !hasBeenSynced()) {
        setSyncStatus("syncing");
        try {
          const result = await syncFavoritesWithServer();
          if (result.synced) {
            setFavoritesSlugs(result.favorites);
            setSyncStatus("synced");
          } else {
            setSyncStatus("idle");
          }
        } catch {
          setSyncStatus("error");
        }
      }
    };

    loadFavorites();
  }, [isAuthenticated]);

  const handleRemove = useCallback((slug: string) => {
    setRemovedSlugs((prev) => new Set([...prev, slug]));
  }, []);

  const favoriteGroups = groups.filter(
    (g) => favoritesSlugs.includes(g.slug) && !removedSlugs.has(g.slug)
  );

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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Favorites
          </h1>
          {syncStatus === "syncing" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Syncing...
            </span>
          )}
          {syncStatus === "synced" && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          )}
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {favoriteGroups.length > 0
            ? `${favoriteGroups.length} groups you're following`
            : "Groups you favorite will appear here"}
        </p>
      </div>

      {favoriteGroups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteGroups.map((group) => (
            <FadingGroupCard
              key={group.slug}
              group={group}
              onRemove={handleRemove}
            />
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
            favorites.{" "}
            {isAuthenticated
              ? "Your favorites sync across all your devices."
              : "Sign in to sync favorites across devices."}
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
