import type { Route } from "./+types/leaderboard";
import { useLoaderData, useRevalidator, Link } from "react-router";
import { useEffect, useCallback, useRef, useState } from "react";
import { Avatar } from "@tampadevs/react";
import { generateMetaTags } from "~/lib/seo";
import { useWS } from "~/hooks/WebSocketProvider";

interface BadgeInfo {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  name: string;
  avatarUrl: string;
  score: number;
  completedCount: number;
  badges: BadgeInfo[];
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  totalAchievements: number;
}

interface CurrentUser {
  username: string;
}

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Community Leaderboard",
    description:
      "See who's leading the Tampa Bay tech community. View top contributors, their achievements, and badges on the Tampa.dev leaderboard.",
    url: "/leaderboard",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const apiUrl =
    import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  const cookie = request.headers.get("Cookie") || "";

  const [response, meResponse] = await Promise.all([
    fetch(`${apiUrl}/leaderboard?limit=50`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`${apiUrl}/me`, {
      headers: { Cookie: cookie, Accept: "application/json" },
    }).catch(() => null),
  ]);

  let currentUser: CurrentUser | null = null;
  if (meResponse && meResponse.ok) {
    try {
      const meData = (await meResponse.json()) as { username?: string };
      if (meData.username) {
        currentUser = { username: meData.username };
      }
    } catch { }
  }

  if (!response.ok) {
    console.error(`Leaderboard API request failed: ${response.status}`);
    return { entries: [], total: 0, totalAchievements: 0, currentUser };
  }

  const data = (await response.json()) as LeaderboardResponse;

  return {
    entries: data.entries ?? [],
    total: data.total ?? 0,
    totalAchievements: data.totalAchievements ?? 0,
    currentUser,
  };
}

/* ─── Podium configuration ─── */

interface PodiumConfig {
  maxWidth: string;
  avatarSize: "xl" | "lg" | "md";
  nameClass: string;
  accent: string;
  accentOverlay: string;
  rankPanelPx: string;
  rankTextSize: string;
  xpTextSize: string;
  contentPadding: string;
}

const podiumConfigs: Record<number, PodiumConfig> = {
  1: {
    maxWidth: "max-w-2xl",
    avatarSize: "xl",
    nameClass: "text-xl sm:text-2xl",
    accent: "#D4A015",
    accentOverlay: "18",
    rankPanelPx: "px-7 sm:px-9 py-5 sm:py-6",
    rankTextSize: "text-4xl sm:text-5xl",
    xpTextSize: "text-base sm:text-lg",
    contentPadding: "p-5 sm:p-6",
  },
  2: {
    maxWidth: "max-w-xl",
    avatarSize: "lg",
    nameClass: "text-lg sm:text-xl",
    accent: "#94A3B8",
    accentOverlay: "14",
    rankPanelPx: "px-6 sm:px-7 py-4 sm:py-5",
    rankTextSize: "text-3xl sm:text-4xl",
    xpTextSize: "text-sm sm:text-base",
    contentPadding: "p-4 sm:p-5",
  },
  3: {
    maxWidth: "max-w-lg",
    avatarSize: "md",
    nameClass: "text-base sm:text-lg",
    accent: "#CD7F32",
    accentOverlay: "10",
    rankPanelPx: "px-5 sm:px-6 py-3.5 sm:py-4",
    rankTextSize: "text-2xl sm:text-3xl",
    xpTextSize: "text-xs sm:text-sm",
    contentPadding: "p-3.5 sm:p-4",
  },
};

/* ─── Tilt hook ─── */

function useTilt(maxDeg: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rx = ((y - rect.height / 2) / (rect.height / 2)) * -maxDeg;
      const ry = ((x - rect.width / 2) / (rect.width / 2)) * maxDeg;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--sx", `${(x / rect.width) * 100}%`);
      el.style.setProperty("--sy", `${(y / rect.height) * 100}%`);
    },
    [maxDeg],
  );

  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
    setHovered(false);
  }, []);

  return { ref, hovered, onMouseMove, onMouseEnter, onMouseLeave };
}

/* ─── Components ─── */

function PodiumCard({
  entry,
  config,
}: {
  entry: LeaderboardEntry;
  config: PodiumConfig;
}) {
  const { ref, hovered, onMouseMove, onMouseEnter, onMouseLeave } = useTilt(8);
  const formattedScore = entry.score.toLocaleString();

  return (
    <div
      className={`w-full ${config.maxWidth} mx-auto`}
      style={{ perspective: "800px" }}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={ref}
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        }}
      >
        <Link
          to={`/p/${entry.username}`}
          className="block glass-card rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
        >
          {/* Accent gradient tint */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${config.accent}${config.accentOverlay} 0%, transparent 60%)`,
            }}
          />
          {/* Top edge highlight */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${config.accent}30, transparent)` }}
          />

          <div className="relative flex">
            {/* Left rank panel */}
            <div
              className={`flex flex-col items-center justify-center ${config.rankPanelPx} border-r border-gray-200/30 dark:border-gray-700/30 flex-shrink-0`}
              style={{ background: `linear-gradient(180deg, ${config.accent}12 0%, ${config.accent}06 100%)` }}
            >
              <span
                className={`font-bold leading-none ${config.rankTextSize}`}
                style={{ color: config.accent }}
              >
                {entry.rank}
              </span>
            </div>

            {/* Center content */}
            <div className={`flex items-center gap-4 flex-1 min-w-0 ${config.contentPadding}`}>
              <Avatar
                src={entry.avatarUrl}
                name={entry.name}
                size={config.avatarSize}
                ring
              />
              <div className="min-w-0">
                <h3
                  className={`font-bold text-gray-900 dark:text-white ${config.nameClass} truncate`}
                >
                  {entry.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{entry.username}
                </p>
              </div>
            </div>

            {/* Right XP score */}
            <div className={`flex flex-col items-center justify-center ${config.contentPadding} flex-shrink-0`}>
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

          {/* Shine overlay */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(circle at var(--sx, 50%) var(--sy, 50%), rgba(255,255,255,0.12) 0%, transparent 60%)",
              opacity: hovered ? 1 : 0,
            }}
          />
        </Link>
      </div>
    </div>
  );
}

function CompactEntry({
  entry,
  isLast,
}: {
  entry: LeaderboardEntry;
  isLast: boolean;
}) {
  return (
    <Link
      to={`/p/${entry.username}`}
      className={`flex items-center gap-3 px-4 py-3 sm:px-6 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors ${!isLast ? "border-b border-gray-100 dark:border-gray-800/50" : ""
        }`}
    >
      {/* Rank */}
      <span className="w-8 text-center font-semibold text-sm text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
        #{entry.rank}
      </span>

      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar src={entry.avatarUrl} name={entry.name} size="sm" />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-gray-900 dark:text-white truncate block">
          {entry.name}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
          @{entry.username}
        </span>
      </div>

      {/* XP */}
      <div className="flex-shrink-0 text-right">
        <span className="font-bold text-sm tabular-nums text-gray-900 dark:text-white">
          {entry.score.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">XP</span>
      </div>
    </Link>
  );
}

function CompactList({ entries }: { entries: LeaderboardEntry[] }) {
  const { ref, hovered, onMouseMove, onMouseEnter, onMouseLeave } = useTilt(3);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        style={{ perspective: "1000px" }}
        onMouseMove={onMouseMove}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          ref={ref}
          className="glass-card rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl overflow-hidden relative"
          style={{
            transformStyle: "preserve-3d",
            transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
            transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
          }}
        >
          {entries.map((entry, i) => (
            <CompactEntry
              key={entry.username}
              entry={entry}
              isLast={i === entries.length - 1}
            />
          ))}
          {/* Shine overlay */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(circle at var(--sx, 50%) var(--sy, 50%), rgba(255,255,255,0.08) 0%, transparent 60%)",
              opacity: hovered ? 1 : 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { entries, total, currentUser } = useLoaderData<typeof loader>();
  const { personal } = useWS();
  const revalidator = useRevalidator();

  useEffect(() => {
    return personal.on('score.changed', () => {
      revalidator.revalidate();
    });
  }, [personal, revalidator]);

  const topThree = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ─── Podium Section ─── */}
      <div className="bg-gradient-to-b from-gray-50 via-gray-50/80 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Leaderboard
            </h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              Top contributors in the Tampa Bay tech community
            </p>
            {currentUser && (
              <Link
                to={`/p/${currentUser.username}`}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium text-coral hover:text-coral-light border border-coral/30 hover:border-coral/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                My Achievements
              </Link>
            )}
          </div>

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No participants yet. Complete achievements with a public profile to
                appear here.
              </p>
            </div>
          )}

          {/* Podium cards — decreasing width creates V / plinth shape */}
          {topThree.length > 0 && (
            <div className="space-y-4 flex flex-col items-center">
              {topThree.map((entry) => {
                const config = podiumConfigs[entry.rank];
                if (!config) return null;
                return (
                  <PodiumCard
                    key={entry.username}
                    entry={entry}
                    config={config}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Remaining entries ─── */}
      {rest.length > 0 && <CompactList entries={rest} />}
    </div>
  );
}
