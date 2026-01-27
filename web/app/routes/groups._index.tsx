import type { Route } from "./+types/groups._index";
import { generateMetaTags } from "~/lib/seo";
import { GroupCard, StructuredData } from "~/components";
import { groups, getAllTags, getGroupsByTag } from "~/data/groups";
import { useSearchParams } from "react-router";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Tech Groups & Communities",
    description:
      "Explore 22+ tech groups and communities in Tampa Bay. From cloud computing to AI, find your tribe of developers and technologists.",
    url: "/groups",
  });
};

export async function loader() {
  const tags = getAllTags();

  return {
    groups,
    tags,
  };
}

export default function Groups({ loaderData }: Route.ComponentProps) {
  const { groups: allGroups, tags } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag");

  const filteredGroups = activeTag
    ? getGroupsByTag(activeTag)
    : allGroups;

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
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {allGroups.length} groups building the Tampa Bay tech scene
          </p>
        </div>

        {/* Tags Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
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
          {tags.map((tag) => (
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
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGroups.map((group) => (
            <GroupCard key={group.slug} group={group} />
          ))}
        </div>

        {filteredGroups.length === 0 && (
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
