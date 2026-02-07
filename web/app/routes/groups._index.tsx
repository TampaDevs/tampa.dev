import type { Route } from "./+types/groups._index";
import { generateMetaTags } from "~/lib/seo";
import { GroupCard, StructuredData } from "~/components";
import { fetchGroups, toLocalGroup, extractTags } from "~/lib/api.server";
import { useSearchParams } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { useWS } from "~/hooks/WebSocketProvider";
import { getFavorites, FAVORITES_CHANGED_EVENT } from "~/lib/favorites";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tampa Bay Tech Groups & Communities",
    description:
      "Explore tech groups and communities in Tampa Bay. Developer meetups, startup groups, AI communities, and more across Tampa, St. Petersburg, and Clearwater.",
    url: "/groups",
  });
};

export async function loader() {
  const apiGroups = await fetchGroups();
  const tags = extractTags(apiGroups);
  const groups = apiGroups.map(toLocalGroup);

  return {
    groups,
    tags,
  };
}

export default function Groups({ loaderData }: Route.ComponentProps) {
  const { groups: loaderGroups, tags } = loaderData;
  const { broadcast } = useWS();
  const [searchParams, setSearchParams] = useSearchParams();
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [favoriteCountOverrides, setFavoriteCountOverrides] = useState<Map<string, number>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);
  const activeTag = searchParams.get("tag");

  // Apply real-time favorite count overrides from broadcast WebSocket
  const allGroups = useMemo(() => {
    if (favoriteCountOverrides.size === 0) return loaderGroups;
    return loaderGroups.map((g) => {
      const override = favoriteCountOverrides.get(g.slug);
      return override !== undefined ? { ...g, favoritesCount: override } : g;
    });
  }, [loaderGroups, favoriteCountOverrides]);

  // Listen for broadcast favorite count changes
  useEffect(() => {
    return broadcast.on('favorite.count_changed', (msg) => {
      setFavoriteCountOverrides((prev) => {
        const next = new Map(prev);
        next.set(msg.data.groupSlug, msg.data.favoriteCount);
        return next;
      });
    });
  }, [broadcast]);

  useEffect(() => {
    setFavoriteSlugs(getFavorites());
    setIsLoaded(true);

    // Listen for cross-tab changes (storage event) and same-tab changes (custom event)
    const handleChange = () => setFavoriteSlugs(getFavorites());
    window.addEventListener("storage", handleChange);
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleChange);

    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChange);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);

  const VISIBLE_TAG_COUNT = 8;
  const visibleTags = useMemo(() => {
    if (showAllTags) return tags;
    const top = tags.slice(0, VISIBLE_TAG_COUNT);
    // Always include the active tag so the user can see their selection
    if (activeTag && !top.includes(activeTag)) {
      top.push(activeTag);
    }
    return top;
  }, [tags, showAllTags, activeTag]);
  const hasHiddenTags = tags.length > VISIBLE_TAG_COUNT;

  const filteredGroups = allGroups.filter((g) => {
    if (activeTag && !g.tags.includes(activeTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Sort groups: favorites first (alphabetically), then non-favorites (alphabetically)
  const sortedGroups = useMemo(() => {
    if (!isLoaded) return filteredGroups;

    const favorites = filteredGroups
      .filter((g) => favoriteSlugs.includes(g.slug))
      .sort((a, b) => a.name.localeCompare(b.name));

    const nonFavorites = filteredGroups
      .filter((g) => !favoriteSlugs.includes(g.slug))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...favorites, ...nonFavorites];
  }, [filteredGroups, favoriteSlugs, isLoaded]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tampa Bay Tech Groups",
    itemListElement: filteredGroups.map((group, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Organization",
        name: group.name,
        description: group.description,
        url: group.website,
      },
    })),
  };

  return (
    <>
      <StructuredData data={jsonLd} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tech Groups & Communities
          </h1>
        </div>

        {/* Tags Filter */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setSearchParams(new URLSearchParams())}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeTag
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {visibleTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                params.set("tag", tag);
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTag === tag
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tag}
            </button>
          ))}
          {hasHiddenTags && (
            <button
              type="button"
              onClick={() => setShowAllTags(!showAllTags)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {showAllTags ? "Show less" : `Show all (${tags.length})`}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* Group Count */}
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""} {activeTag ? `tagged "${activeTag}"` : ""} {searchQuery ? `matching "${searchQuery}"` : "building the Tampa Bay tech scene"}
        </p>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedGroups.map((group) => (
            <GroupCard key={group.slug} group={group} />
          ))}
        </div>

        {sortedGroups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400">
              No groups found for "{activeTag}". Try another filter.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
