import type { Route } from "./+types/members";
import { useLoaderData, Link, useSearchParams, Form } from "react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar } from "@tampadevs/react";
import { generateMetaTags } from "~/lib/seo";
import { Emoji } from "~/components/Emoji";

interface Badge {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface AvailableBadge {
  slug: string;
  name: string;
  icon: string;
  color: string;
  points: number;
  awardedCount: number;
}

interface Member {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  themeColor: string | null;
  badges: Badge[];
  memberSince: string;
}

const THEME_GRADIENTS: Record<string, string> = {
  coral: "linear-gradient(135deg, #C44D44 0%, #E85A4F 40%, #F07167 100%)",
  ocean: "linear-gradient(135deg, #0E7490 0%, #0891B2 40%, #06B6D4 100%)",
  sunset: "linear-gradient(135deg, #D97706 0%, #F59E0B 40%, #FBBF24 100%)",
  forest: "linear-gradient(135deg, #047857 0%, #059669 40%, #10B981 100%)",
  violet: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 40%, #A78BFA 100%)",
  rose: "linear-gradient(135deg, #BE123C 0%, #E11D48 40%, #FB7185 100%)",
  slate: "linear-gradient(135deg, #334155 0%, #475569 40%, #94A3B8 100%)",
  sky: "linear-gradient(135deg, #0369A1 0%, #0284C7 40%, #38BDF8 100%)",
};

interface MembersResponse {
  users: Member[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 24;

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Community Members",
    description:
      "Browse the Tampa Bay tech community member directory. Discover developers, founders, and builders across Tampa, St. Petersburg, and Clearwater.",
    url: "/members",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const badge = url.searchParams.get("badge") || "";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const apiUrl =
    import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  const params = new URLSearchParams();
  params.set("limit", PAGE_SIZE.toString());
  params.set("offset", offset.toString());
  if (search) {
    params.set("search", search);
  }
  if (badge) {
    params.set("badge", badge);
  }

  const [response, badgesResponse] = await Promise.all([
    fetch(`${apiUrl}/users?${params.toString()}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`${apiUrl}/badges`, {
      headers: { Accept: "application/json" },
    }),
  ]);

  let availableBadges: AvailableBadge[] = [];
  if (badgesResponse.ok) {
    const badgesData = (await badgesResponse.json()) as { badges: AvailableBadge[] };
    availableBadges = badgesData.badges ?? [];
  }

  if (!response.ok) {
    console.error(`Members API request failed: ${response.status}`);
    return {
      users: [],
      total: 0,
      limit: PAGE_SIZE,
      offset: 0,
      search,
      badge,
      availableBadges,
    };
  }

  const json = (await response.json()) as { data: Member[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } };

  return {
    users: json.data ?? [],
    total: json.pagination?.total ?? 0,
    limit: json.pagination?.limit ?? PAGE_SIZE,
    offset: json.pagination?.offset ?? offset,
    search,
    badge,
    availableBadges,
  };
}

function truncateBio(bio: string, maxLength = 80): string {
  if (!bio || bio.length <= maxLength) return bio || "";
  return bio.slice(0, maxLength).trimEnd() + "...";
}

function formatMemberSince(dateString: string): string {
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

function BadgePill({ badge }: { badge: Badge }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${badge.color}20`,
        color: badge.color,
      }}
    >
      <Emoji emoji={badge.icon} size={14} />
      {badge.name}
    </span>
  );
}

/** Parse comma-separated badge param into an array of slugs */
function parseBadgeSlugs(param: string): string[] {
  return param ? param.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Serialize slug array back into comma-separated param */
function serializeBadgeSlugs(slugs: string[]): string {
  return slugs.join(",");
}

function BadgeFilterDropdown({
  badges,
  activeSlugs,
  onToggle,
  onClear,
  onRemove,
}: {
  badges: AvailableBadge[];
  activeSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  onRemove: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeBadges = activeSlugs
    .map((slug) => badges.find((b) => b.slug === slug))
    .filter((b): b is AvailableBadge => !!b);

  const filtered = query
    ? badges.filter((b) =>
        b.name.toLowerCase().includes(query.toLowerCase())
      )
    : badges;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleToggle = useCallback(
    (slug: string) => {
      onToggle(slug);
    },
    [onToggle]
  );

  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      {/* Active badge chips */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Filtered by</span>
          {activeBadges.map((b) => (
            <span
              key={b.slug}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${b.color}20`,
                color: b.color,
              }}
            >
              <Emoji emoji={b.icon} size={14} />
              {b.name}
              <button
                type="button"
                onClick={() => onRemove(b.slug)}
                className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label={`Remove ${b.name} filter`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {activeBadges.length > 1 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown trigger */}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter by badge
          {activeSlugs.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral/20 text-coral text-xs font-bold">
              {activeSlugs.length}
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search badges..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Badge list */}
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No badges found
                </p>
              ) : (
                filtered.map((b) => {
                  const isActive = activeSlugs.includes(b.slug);
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => handleToggle(b.slug)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-gray-50 dark:bg-gray-700/50"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isActive
                            ? "border-coral bg-coral"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${b.color}20` }}
                      >
                        <Emoji emoji={b.icon} size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {b.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {b.awardedCount} member{b.awardedCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { users, total, limit, offset, search, badge, availableBadges } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSlugs = parseBadgeSlugs(badge);
  const activeBadgeObjs = activeSlugs
    .map((slug) => availableBadges.find((b) => b.slug === slug))
    .filter((b): b is AvailableBadge => !!b);

  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  const nextOffset = offset + limit;
  const prevOffset = Math.max(0, offset - limit);

  function buildPageUrl(newOffset: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (badge) params.set("badge", badge);
    if (newOffset > 0) params.set("offset", newOffset.toString());
    const qs = params.toString();
    return qs ? `/members?${qs}` : "/members";
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  function updateBadgeParam(slugs: string[]) {
    const next = new URLSearchParams(searchParams);
    if (slugs.length > 0) {
      next.set("badge", serializeBadgeSlugs(slugs));
    } else {
      next.delete("badge");
    }
    next.delete("offset");
    setSearchParams(next);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Community Members
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            {activeBadgeObjs.length > 0 ? (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                {" "}member{total !== 1 ? "s" : ""} with{" "}
                {activeBadgeObjs.map((b, i) => (
                  <span key={b.slug}>
                    {i > 0 && " + "}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium" style={{ backgroundColor: `${b.color}20`, color: b.color }}>
                      <Emoji emoji={b.icon} size={14} /> {b.name}
                    </span>
                  </span>
                ))}
              </>
            ) : search ? (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                {" "}result{total !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
                {" "}member{total !== 1 ? "s" : ""} building the Tampa Bay tech scene
              </>
            )}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <Form method="get" action="/members">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-5 w-5 text-gray-400 dark:text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search members by name or username..."
                className="block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 pl-11 pr-4 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
              />
            </div>
          </Form>
        </div>

        {/* Badge Filter */}
        {availableBadges.length > 0 && (
          <BadgeFilterDropdown
            badges={availableBadges}
            activeSlugs={activeSlugs}
            onToggle={(slug) => {
              const next = activeSlugs.includes(slug)
                ? activeSlugs.filter((s) => s !== slug)
                : [...activeSlugs, slug];
              updateBadgeParam(next);
            }}
            onRemove={(slug) => {
              updateBadgeParam(activeSlugs.filter((s) => s !== slug));
            }}
            onClear={() => {
              updateBadgeParam([]);
            }}
          />
        )}

        {/* Members Grid */}
        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {search
                ? "No members found."
                : "No members have set their profile to public yet."}
            </p>
            {search && (
              <Link
                to="/members"
                className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear search
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {users.map((member) => (
                <Link
                  key={member.username}
                  to={`/p/${member.username}`}
                  className="group block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {/* Theme gradient accent with subtle frost */}
                  <div className="relative h-1.5 overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{ background: THEME_GRADIENTS[member.themeColor || "coral"] || THEME_GRADIENTS.coral }}
                    />
                    <div className="absolute inset-0 backdrop-blur-[0.5px] bg-white/[0.03]" />
                  </div>

                  <div className="p-5 pt-4">
                    {/* Avatar & Name */}
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3">
                        <Avatar
                          src={member.avatarUrl}
                          name={member.name}
                          size="sm"
                        />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate w-full">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">
                        @{member.username}
                      </p>
                    </div>

                    {/* Bio */}
                    {member.bio && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center line-clamp-2">
                        {truncateBio(member.bio)}
                      </p>
                    )}

                    {/* Badges */}
                    {member.badges && member.badges.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                        {member.badges.slice(0, 3).map((b) => (
                          <BadgePill key={b.slug} badge={b} />
                        ))}
                        {member.badges.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            +{member.badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Member Since */}
                    {member.memberSince && (
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
                        Member since {formatMemberSince(member.memberSince)}
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
                  <Link
                    to={buildPageUrl(prevOffset)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 font-medium text-sm cursor-not-allowed">
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Previous
                  </span>
                )}

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>

                {hasNextPage ? (
                  <Link
                    to={buildPageUrl(nextOffset)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Next
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 font-medium text-sm cursor-not-allowed">
                    Next
                    <svg
                      className="w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
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
