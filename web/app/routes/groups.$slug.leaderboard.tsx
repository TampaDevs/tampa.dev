/**
 * Group Leaderboard Page
 *
 * Displays group-scoped XP leaderboard with podium (top 3) and compact list (4+).
 */

import type { Route } from "./+types/groups.$slug.leaderboard";
import type React from "react";
import { Link, data as routerData } from "react-router";
import { Avatar } from "@tampadevs/react";
import { Emoji } from "~/components/Emoji";
import { generateMetaTags } from "~/lib/seo";
import type { GroupLeaderboardEntry } from "~/lib/types";

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

export const meta: Route.MetaFunction = ({ data }) => {
  if (!data?.group) {
    return [{ title: "Group Not Found | Tampa.dev" }];
  }

  return generateMetaTags({
    title: `${data.group.name} Leaderboard`,
    description: `See who's leading in ${data.group.name}. View top contributors and their XP scores.`,
    url: `/groups/${data.group.urlname}/leaderboard`,
    image: data.group.photoUrl || undefined,
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const slug = encodeURIComponent(params.slug!);
  const headers: Record<string, string> = { Accept: "application/json" };

  // Fetch group by slug
  const groupRes = await fetch(`${API_HOST}/2026-01-25/groups/${slug}`, { headers });
  if (!groupRes.ok) {
    throw routerData(null, { status: 404 });
  }
  const group = (await groupRes.json()) as {
    id: string;
    name: string;
    urlname: string;
    photoUrl: string | null;
  };

  // Fetch leaderboard + current user in parallel
  const meHeaders = cookieHeader ? { ...headers, Cookie: cookieHeader } : headers;
  const [lbRes, meRes] = await Promise.all([
    fetch(`${API_HOST}/groups/${slug}/leaderboard?limit=50`, { headers }),
    cookieHeader
      ? fetch(`${API_HOST}/me`, { headers: meHeaders })
      : Promise.resolve(null),
  ]);

  const entries: GroupLeaderboardEntry[] = lbRes.ok
    ? ((await lbRes.json()) as { data: { entries?: GroupLeaderboardEntry[] } }).data.entries ?? []
    : [];

  let currentUserId: string | null = null;
  if (meRes?.ok) {
    const meData = (await meRes.json()) as { id?: string };
    currentUserId = meData.id ?? null;
  }

  return { group, entries, currentUserId };
}

/* --- Podium configuration --- */

interface PodiumConfig {
  maxWidth: string;
  avatarSize: "xl" | "lg" | "md";
  nameClass: string;
  accent: string;
  rankPanelPx: string;
  rankTextSize: string;
  xpTextSize: string;
  contentPadding: string;
}

const podiumConfigs: Record<number, PodiumConfig> = {
  1: {
    maxWidth: "max-w-[21rem] sm:max-w-2xl",
    avatarSize: "xl",
    nameClass: "text-xl sm:text-2xl",
    accent: "#FFD700",
    rankPanelPx: "px-5 sm:px-9 py-4 sm:py-6",
    rankTextSize: "text-3xl sm:text-5xl",
    xpTextSize: "text-sm sm:text-lg",
    contentPadding: "p-3.5 sm:p-6",
  },
  2: {
    maxWidth: "max-w-[21rem] sm:max-w-xl",
    avatarSize: "lg",
    nameClass: "text-lg sm:text-xl",
    accent: "#C0C0C0",
    rankPanelPx: "px-5 sm:px-7 py-3.5 sm:py-5",
    rankTextSize: "text-2xl sm:text-4xl",
    xpTextSize: "text-xs sm:text-base",
    contentPadding: "p-3 sm:p-5",
  },
  3: {
    maxWidth: "max-w-[21rem] sm:max-w-lg",
    avatarSize: "md",
    nameClass: "text-base sm:text-lg",
    accent: "#CD7F32",
    rankPanelPx: "px-5 sm:px-6 py-3 sm:py-4",
    rankTextSize: "text-xl sm:text-3xl",
    xpTextSize: "text-xs sm:text-sm",
    contentPadding: "p-3 sm:p-4",
  },
};

/* --- Components --- */

function PodiumCard({
  entry,
  config,
}: {
  entry: GroupLeaderboardEntry;
  config: PodiumConfig;
}) {
  const formattedScore = entry.score.toLocaleString();
  const profileLink = entry.username ? `/p/${entry.username}` : "#";

  return (
    <div className={`w-full ${config.maxWidth} mx-auto`}>
      <Link
        to={profileLink}
        className="block rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900 relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
      >
        {/* Accent gradient tint */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${config.accent}18 0%, transparent 60%)`,
          }}
        />
        {/* Top edge highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.accent}30, transparent)`,
          }}
        />

        <div className="relative flex">
          {/* Left rank panel */}
          <div
            className={`flex flex-col items-center justify-center ${config.rankPanelPx} border-r border-gray-200/30 dark:border-gray-700/30 flex-shrink-0`}
            style={{
              background: `linear-gradient(180deg, ${config.accent}12 0%, ${config.accent}06 100%)`,
            }}
          >
            <span
              className={`font-bold leading-none ${config.rankTextSize}`}
              style={{ color: config.accent }}
            >
              {entry.rank}
            </span>
          </div>

          {/* Center content */}
          <div
            className={`flex items-center gap-4 flex-1 min-w-0 ${config.contentPadding}`}
          >
            <Avatar
              src={entry.avatarUrl || undefined}
              name={entry.name || entry.username || "User"}
              size={config.avatarSize}
              ring
            />
            <div className="min-w-0">
              <h3
                className={`font-bold text-gray-900 dark:text-white ${config.nameClass} truncate`}
              >
                {entry.name || entry.username || "Anonymous"}
              </h3>
              {entry.username && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{entry.username}
                </p>
              )}
            </div>
          </div>

          {/* Right XP score */}
          <div
            className={`flex flex-col items-center justify-center ${config.contentPadding} flex-shrink-0`}
          >
            <span
              className={`font-bold tabular-nums leading-none ${config.xpTextSize}`}
              style={{ color: config.accent }}
            >
              {formattedScore}
            </span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
              XP
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CompactEntry({
  entry,
  isLast,
  isCurrentUser,
}: {
  entry: GroupLeaderboardEntry;
  isLast: boolean;
  isCurrentUser: boolean;
}) {
  const profileLink = entry.username ? `/p/${entry.username}` : "#";

  return (
    <Link
      to={profileLink}
      className={`flex items-center gap-3 px-4 py-3 sm:px-6 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors ${
        !isLast ? "border-b border-gray-100 dark:border-gray-800/50" : ""
      } ${isCurrentUser ? "bg-coral/5 dark:bg-coral/10" : ""}`}
    >
      {/* Rank */}
      <span className="w-8 text-center font-semibold text-sm text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
        #{entry.rank}
      </span>

      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar
          src={entry.avatarUrl || undefined}
          name={entry.name || entry.username || "User"}
          size="sm"
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-gray-900 dark:text-white truncate block">
          {entry.name || entry.username || "Anonymous"}
          {isCurrentUser && (
            <span className="ml-2 text-xs font-medium text-coral">(You)</span>
          )}
        </span>
        {entry.username && (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
            @{entry.username}
          </span>
        )}
      </div>

      {/* XP */}
      <div className="flex-shrink-0 text-right">
        <span className="font-bold text-sm tabular-nums text-gray-900 dark:text-white">
          {entry.score.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
          XP
        </span>
      </div>
    </Link>
  );
}

function CompactList({
  entries,
  currentUserId,
}: {
  entries: GroupLeaderboardEntry[];
  currentUserId: string | null;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900 overflow-hidden">
        {entries.map((entry, i) => (
          <CompactEntry
            key={entry.userId}
            entry={entry}
            isLast={i === entries.length - 1}
            isCurrentUser={currentUserId !== null && entry.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

/* --- Float animation config per rank --- */

const podiumFloatStyles: Record<number, React.CSSProperties> = {
  1: { animation: "podium-float 4s ease-in-out infinite", animationDelay: "0s" },
  2: { animation: "podium-float 4.5s ease-in-out infinite", animationDelay: "0.8s" },
  3: { animation: "podium-float 5s ease-in-out infinite", animationDelay: "1.6s" },
};

/* --- Card entrance stagger config --- */

const podiumEntranceStyles: Record<number, React.CSSProperties> = {
  1: { animation: "lb-card-enter 0.6s cubic-bezier(0.22,1,0.36,1) both", animationDelay: "0.1s" },
  2: { animation: "lb-card-enter 0.6s cubic-bezier(0.22,1,0.36,1) both", animationDelay: "0.25s" },
  3: { animation: "lb-card-enter 0.6s cubic-bezier(0.22,1,0.36,1) both", animationDelay: "0.4s" },
};

/* --- Decorative particles (stable across renders) --- */

const HEADER_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (i * 17 + 7) % 100,
  y: (i * 23 + 11) % 80 + 10,
  size: (i % 3) + 1.5,
  delay: (i * 0.7) % 8,
  duration: (i % 4) + 5,
  opacity: (i % 5) * 0.06 + 0.08,
}));

export default function GroupLeaderboardPage({
  loaderData,
}: Route.ComponentProps) {
  const { group, entries, currentUserId } = loaderData;

  const topThree = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Podium Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-gray-50/80 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950">
        {/* Subtle dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle, #94A3B8 0.75px, transparent 0.75px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Decorative gradient mesh blobs */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none opacity-20 dark:opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #F9706640 0%, transparent 70%)" }}
        />
        <div
          className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-15 dark:opacity-[0.07] blur-3xl"
          style={{ background: "radial-gradient(circle, #D4A01530 0%, transparent 70%)" }}
        />

        {/* Floating decorative particles */}
        <div className="absolute inset-0 pointer-events-none">
          {HEADER_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-gray-400 dark:bg-gray-500"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animation: `lb-particle-drift ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
                "--lb-p-opacity": p.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          {/* Breadcrumb */}
          <nav className="mb-8">
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
                  to={`/groups/${group.urlname}`}
                  className="text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  {group.name}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 dark:text-white font-medium">
                Leaderboard
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="text-center mb-10" style={{ animation: "lb-fade-in-up 0.5s ease-out both" }}>
            {/* Trophy icon */}
            <div className="inline-flex items-center justify-center mb-4">
              <span
                style={{ animation: "lb-trophy-shimmer 6s ease-in-out infinite", color: "#D4A015" }}
              >
                <Emoji emoji="🏆" size={48} />
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              {group.photoUrl && (
                <img
                  src={group.photoUrl}
                  alt={group.name}
                  className="w-12 h-12 rounded-xl object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                {group.name} Leaderboard
              </h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Top contributors in this group
            </p>
            <Link
              to={`/groups/${group.urlname}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-coral hover:text-coral-light border border-coral/30 hover:border-coral/50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to {group.name}
            </Link>
          </div>

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No members have earned XP in this group yet.
              </p>
            </div>
          )}

          {/* Podium cards */}
          {topThree.length > 0 && (
            <div className="space-y-4 flex flex-col items-center">
              {topThree.map((entry) => {
                const config = podiumConfigs[entry.rank];
                if (!config) return null;
                return (
                  <div
                    key={entry.userId}
                    className="w-full"
                    style={podiumEntranceStyles[entry.rank]}
                  >
                    <div style={podiumFloatStyles[entry.rank]}>
                      <PodiumCard
                        entry={entry}
                        config={config}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Decorative divider between podium and list --- */}
      {rest.length > 0 && (
        <div className="relative py-6">
          <div className="flex items-center justify-center gap-4">
            <div
              className="h-px flex-1 max-w-32"
              style={{ background: "linear-gradient(90deg, transparent, #F9706640)" }}
            />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              and {rest.length} more
            </span>
            <div
              className="h-px flex-1 max-w-32"
              style={{ background: "linear-gradient(270deg, transparent, #F9706640)" }}
            />
          </div>
        </div>
      )}

      {/* Remaining entries */}
      {rest.length > 0 && (
        <CompactList entries={rest} currentUserId={currentUserId} />
      )}
    </div>
  );
}
