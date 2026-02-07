/**
 * Public User Profile Page
 *
 * Displays a user's public profile at /p/:username
 * Features a hero banner with glass overlay, a floating profile card,
 * theme color accents, and sections for badges, achievements, groups, and portfolio.
 */

import { Link, data, useRouteLoaderData } from "react-router";
import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { Avatar } from "~/components/Avatar";
import type { Route } from "./+types/p.$username";
import { generateMetaTags } from "~/lib/seo";
import { inferSocialPlatform } from "~/components/SocialLinkIcon";
import { BadgeDetailModal } from "~/components/BadgeDetailModal";
import { Emoji } from "~/components/Emoji";
import { getTrophyTier, TrophyIcon, type TrophyTier } from "~/lib/trophy-tiers";
import { getRarityTier } from "~/lib/rarity";
import { GroupBadgeSection } from "~/components/GroupBadgeSection";
import type { GroupBadgeGroup } from "~/lib/types";

interface PublicBadge {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
  points?: number;
  awardedAt: string | null;
  rarity?: { tier: string; percentage: number };
}

interface PublicAchievement {
  key: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
}

interface UnifiedBadgeItem {
  name: string;
  key: string;
  icon: string;
  color: string;
  description?: string;
  points?: number;
  awardedAt?: string | null;
  rarity?: { tier: string; percentage: number };
}

interface PublicProfile {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  heroImageUrl: string | null;
  themeColor: string | null;
  socialLinks: string[] | null;
  githubUsername: string | null;
  favoriteGroups: Array<{
    slug: string;
    name: string;
    photoUrl: string | null;
  }>;
  badges?: PublicBadge[];
  achievements?: PublicAchievement[];
  portfolioItems?: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string | null;
    imageUrl: string | null;
  }>;
  memberSince: string;
}

interface FollowerEntry {
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

interface FollowersResponse {
  followers: FollowerEntry[];
  total: number;
}

interface FollowingResponse {
  following: FollowerEntry[];
  total: number;
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

const THEME_ACCENT: Record<string, string> = {
  coral: "#E85A4F",
  ocean: "#0891B2",
  sunset: "#F59E0B",
  forest: "#059669",
  violet: "#7C3AED",
  rose: "#E11D48",
  slate: "#475569",
  sky: "#0284C7",
};

function getThemeGradient(themeColor: string | null): string {
  return THEME_GRADIENTS[themeColor || "coral"] || THEME_GRADIENTS.coral;
}

function getThemeAccent(themeColor: string | null): string {
  return THEME_ACCENT[themeColor || "coral"] || THEME_ACCENT.coral;
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  if (!loaderData?.profile) {
    return [{ title: "User Not Found | Tampa.dev" }];
  }

  const profile = loaderData.profile;
  return generateMetaTags({
    title: `${profile.name || profile.username} | Tampa.dev`,
    description:
      profile.bio ||
      `${profile.name || profile.username}'s profile on Tampa.dev`,
    image: profile.heroImageUrl || profile.avatarUrl || undefined,
    url: `/p/${profile.username}`,
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || "";
  const username = encodeURIComponent(params.username!);

  const response = await fetch(
    `${apiUrl}/users/${username}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw data(null, { status: 404 });
  }

  const profile = ((await response.json()) as { data: PublicProfile }).data;

  // Fetch followers, following, follow status, and group badges all in parallel
  const [followersRes, followingRes, followStatusRes, groupBadgesRes] = await Promise.all([
    fetch(`${apiUrl}/users/${username}/followers?limit=5`, {
      headers: { Accept: "application/json" },
    }).catch(() => null),
    fetch(`${apiUrl}/users/${username}/following?limit=0`, {
      headers: { Accept: "application/json" },
    }).catch(() => null),
    cookieHeader
      ? fetch(`${apiUrl}/me/following/${username}`, {
        headers: {
          Accept: "application/json",
          Cookie: cookieHeader,
        },
      }).catch(() => null)
      : Promise.resolve(null),
    fetch(`${apiUrl}/users/${username}/group-badges`, {
      headers: { Accept: "application/json" },
    }).catch(() => null),
  ]);

  let followersData: FollowersResponse = { followers: [], total: 0 };
  let followingData: FollowingResponse = { following: [], total: 0 };
  let isFollowing = false;
  let groupBadges: GroupBadgeGroup[] = [];

  if (followersRes?.ok) {
    const body = (await followersRes.json()) as { data: FollowerEntry[]; pagination: { total: number } };
    followersData = { followers: body.data, total: body.pagination.total };
  }
  if (followingRes?.ok) {
    const body = (await followingRes.json()) as { data: FollowerEntry[]; pagination: { total: number } };
    followingData = { following: body.data, total: body.pagination.total };
  }
  if (followStatusRes?.ok) {
    const statusData = ((await followStatusRes.json()) as { data: { following: boolean } }).data;
    isFollowing = statusData.following;
  }
  if (groupBadgesRes?.ok) {
    const gbData = (await groupBadgesRes.json()) as { groups?: GroupBadgeGroup[] };
    groupBadges = gbData.groups ?? [];
  }

  return {
    profile,
    followersData,
    followingData,
    isFollowing,
    groupBadges,
  };
}

function SocialLink({
  href,
  label,
  icon,
  accent,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 transition-colors"
      style={{ ["--accent" as string]: accent }}
      onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "")}
    >
      {icon}
      {label}
    </a>
  );
}

/**
 * TiltCard — SponsorGrid-style 3D parallax card.
 * Tracks mouse position and applies subtle rotateX/rotateY with a radial shine overlay.
 */
function TiltCard({
  children,
  className = "",
  accentTint,
}: {
  children: React.ReactNode;
  className?: string;
  accentTint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const rx = ((y - rect.height / 2) / (rect.height / 2)) * -4;
      const ry = ((x - rect.width / 2) / (rect.width / 2)) * 4;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--sx", `${(x / rect.width) * 100}%`);
      el.style.setProperty("--sy", `${(y / rect.height) * 100}%`);
    });
  }, []);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    const el = ref.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
    setHovered(false);
  }, []);

  return (
    <div
      style={{ perspective: "800px", display: "inline-block" }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
    >
      <div
        ref={ref}
        className={`relative ${className}`}
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        }}
      >
        {/* Subtle accent tint */}
        {accentTint && (
          <div
            className="absolute inset-0 pointer-events-none rounded-[inherit]"
            style={{
              background: `linear-gradient(135deg, ${accentTint}0a 0%, transparent 60%)`,
            }}
          />
        )}
        <div className="relative">{children}</div>
        {/* Mouse-tracking shine overlay */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle at var(--sx, 50%) var(--sy, 50%), rgba(255,255,255,0.10) 0%, transparent 60%)",
            opacity: hovered ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

/**
 * BadgePill — tappable pill that reveals its description in a popover.
 * Desktop: description shown on hover (title) and on click.
 * Mobile: tap to toggle the popover.
 */
function BadgePill({ item, onSelect }: { item: UnifiedBadgeItem; onSelect: (item: UnifiedBadgeItem) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverAlign, setPopoverAlign] = useState<"center" | "left" | "right">("center");

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    if (rect.left < 0) {
      setPopoverAlign("left");
    } else if (rect.right > window.innerWidth) {
      setPopoverAlign("right");
    } else {
      setPopoverAlign("center");
    }
  }, [open]);

  const popoverPositionClass =
    popoverAlign === "left"
      ? "left-0"
      : popoverAlign === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  const arrowPositionClass =
    popoverAlign === "left"
      ? "left-4"
      : popoverAlign === "right"
        ? "right-4"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => (item.description || (item.points && item.points > 0) || item.rarity) && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <TiltCard className="rounded-full">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm backdrop-blur-sm border border-white/20 cursor-pointer"
          style={{
            backgroundColor: `${item.color}dd`,
          }}
        >
          <Emoji emoji={item.icon} size={16} /> {item.name}
        </button>
      </TiltCard>
      {open && (item.description || (item.points && item.points > 0) || item.rarity) && (
        <div ref={popoverRef} className={`absolute ${popoverPositionClass} top-full mt-2 z-20 w-52 p-3 rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs shadow-xl backdrop-blur-sm border border-white/10`}>
          <div className={`absolute ${arrowPositionClass} -top-1 w-2 h-2 rotate-45 bg-gray-900/95 dark:bg-gray-800/95 border-l border-t border-white/10`} />
          {item.description && <p className="relative leading-relaxed">{item.description}</p>}
          {item.points != null && item.points > 0 && (
            <p className="relative mt-1.5 text-xs font-semibold text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" /></svg>
              {item.points} XP
            </p>
          )}
          {item.rarity && (
            <p className="relative mt-1.5 text-xs font-medium flex items-center gap-1" style={{ color: getRarityTier(item.rarity.percentage).color }}>
              {getRarityTier(item.rarity.percentage).label} — {item.rarity.percentage.toFixed(1)}% of members
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PublicProfilePage({
  loaderData,
}: Route.ComponentProps) {
  const { profile, followersData, followingData, isFollowing: initialIsFollowing, groupBadges } = loaderData;
  const displayName = profile.name || profile.username;
  const accent = getThemeAccent(profile.themeColor);

  // Get current user from root loader to determine if viewing own profile
  const rootData = useRouteLoaderData("root") as {
    user?: { username: string | null } | null;
  } | undefined;
  const currentUser = rootData?.user;
  const isOwnProfile = !!(currentUser?.username && currentUser.username === profile.username);
  const isLoggedIn = !!currentUser;

  // Follow state
  const [following, setFollowing] = useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(followersData.total);

  async function handleFollowToggle() {
    setFollowLoading(true);
    try {
      const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
      const method = following ? "DELETE" : "POST";
      const res = await fetch(
        `${apiUrl}/users/${encodeURIComponent(profile.username)}/follow`,
        {
          method,
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
      if (res.ok) {
        setFollowing(!following);
        setFollowerCount((prev) => (following ? prev - 1 : prev + 1));
      }
    } catch {
      // Silently fail
    } finally {
      setFollowLoading(false);
    }
  }

  // Merge badges + achievements into a unified list, deduplicating by name
  const unifiedItems: UnifiedBadgeItem[] = [];
  const seenNames = new Set<string>();

  for (const badge of profile.badges || []) {
    const matchingAchievement = (profile.achievements || []).find(
      (a: PublicAchievement) => a.name === badge.name || a.key === badge.slug
    );
    unifiedItems.push({
      name: badge.name,
      key: badge.slug,
      icon: badge.icon,
      color: badge.color,
      description: badge.description || matchingAchievement?.description,
      points: badge.points,
      awardedAt: badge.awardedAt,
      rarity: badge.rarity,
    });
    seenNames.add(badge.name);
  }

  for (const achievement of profile.achievements || []) {
    if (!seenNames.has(achievement.name)) {
      unifiedItems.push({
        name: achievement.name,
        key: achievement.key,
        icon: achievement.icon || "\u{1F3C6}",
        color: achievement.color || "#22c55e",
        description: achievement.description,
      });
      seenNames.add(achievement.name);
    }
  }

  // Group by trophy tier, sort within each by rarity (rarest first)
  const tiers: { tier: TrophyTier; label: string; items: UnifiedBadgeItem[] }[] = [];
  const tierOrder: TrophyTier[] = ['diamond', 'platinum', 'gold', 'silver'];

  for (const t of tierOrder) {
    const tierInfo = getTrophyTier(t === 'diamond' ? 100 : t === 'platinum' ? 50 : t === 'gold' ? 25 : 1);
    const items = unifiedItems.filter((item) => {
      const itemTier = getTrophyTier(item.points || 0);
      return itemTier?.tier === t;
    });
    // Sort by rarity ascending (rarest = lowest percentage first)
    items.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));
    if (items.length > 0) {
      tiers.push({ tier: t, label: tierInfo!.label, items });
    }
  }

  // Items with 0 points (no tier) go in an "Other" section
  const noTierItems = unifiedItems.filter((item) => !getTrophyTier(item.points || 0));
  noTierItems.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));

  // Deduplicate: if githubUsername is set and a github.com link exists in socialLinks, skip it
  const githubUrl = profile.githubUsername
    ? `https://github.com/${profile.githubUsername}`
    : null;
  const filteredSocialLinks = (profile.socialLinks || []).filter((url) => {
    if (!githubUrl) return true;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host.includes("github.com")) {
        return !url.toLowerCase().includes(profile.githubUsername!.toLowerCase());
      }
      return true;
    } catch {
      return true;
    }
  });

  const hasSocialLinks = !!githubUrl || filteredSocialLinks.length > 0;

  const [modalBadge, setModalBadge] = useState<UnifiedBadgeItem | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Banner */}
      <div className="relative h-52 sm:h-64 md:h-72">
        {profile.heroImageUrl ? (
          <>
            <img
              src={profile.heroImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Glass overlay for material texture on hero image */}
            <div className="absolute inset-0 backdrop-blur-[1px] bg-white/5 dark:bg-black/10" />
          </>
        ) : (
          <>
            <div
              className="w-full h-full"
              style={{ background: getThemeGradient(profile.themeColor) }}
            />
            {/* Very subtle frost for texture on gradient */}
            <div className="absolute inset-0 backdrop-blur-[0.5px] bg-white/[0.03]" />
          </>
        )}
      </div>

      {/* Profile Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6 relative">
        {/* Floating Profile Card */}
        <div className="-mt-28 sm:-mt-32 relative z-10">
          <div
            className="glass-card rounded-2xl p-6 sm:p-8 border border-gray-200/60 dark:border-gray-700/60 shadow-lg bg-white/[0.96] dark:bg-gray-900/[0.90] backdrop-blur-xl relative overflow-hidden"
          >
            {/* Subtle accent tint */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${accent}0a 0%, transparent 50%)` }}
            />
            {/* Avatar + Identity */}
            <div className="relative flex items-center sm:items-end gap-3 sm:gap-4">
              <div className="shrink-0">
                <Avatar
                  src={profile.avatarUrl || undefined}
                  name={displayName}
                  size="lg"
                  ring
                  ringColor={accent}
                  className="w-16 h-16 sm:w-28 sm:h-28 shadow-md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {displayName}
                </h1>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  @{profile.username}
                </p>
              </div>
              {/* Follow/Unfollow Button - only show when viewing another user's profile while logged in */}
              {isLoggedIn && !isOwnProfile && (
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${following
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800"
                      : "text-white"
                      }`}
                    style={!following ? { backgroundColor: accent } : undefined}
                  >
                    {followLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : following ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Following
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Follow
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-700 dark:text-gray-300 mt-4 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                {githubUrl && (
                  <SocialLink
                    href={githubUrl}
                    label={`@${profile.githubUsername}`}
                    accent={accent}
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        />
                      </svg>
                    }
                  />
                )}
                {filteredSocialLinks.map((url) => {
                  const { icon, label } = inferSocialPlatform(url);
                  return (
                    <SocialLink
                      key={url}
                      href={url}
                      label={label}
                      icon={icon}
                      accent={accent}
                    />
                  );
                })}
              </div>
            )}

            {/* Member Since + accent dot */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/40">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: accent }}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Member since{" "}
                {new Date(profile.memberSince).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Social Stats Card */}
        {(followerCount > 0 || followingData.total > 0) && (
          <section className="mt-6 glass-card rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ background: `linear-gradient(135deg, ${accent}0a 0%, transparent 50%)` }}
            />
            <div className="relative flex items-center gap-6">
              {/* Follower Count */}
              <Link
                to={`/p/${profile.username}/followers`}
                className="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {followerCount}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {followerCount === 1 ? "Follower" : "Followers"}
                </span>
              </Link>

              {/* Following Count */}
              <Link
                to={`/p/${profile.username}/following`}
                className="flex flex-col items-center text-center hover:opacity-80 transition-opacity"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {followingData.total}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Following
                </span>
              </Link>

              {/* Follower Avatar Stack */}
              {followersData.followers.length > 0 && (
                <Link to={`/p/${profile.username}/followers`} className="ml-auto flex items-center hover:opacity-80 transition-opacity">
                  <div className="flex -space-x-2">
                    {followersData.followers.slice(0, 5).map((follower) => (
                      <div
                        key={follower.username}
                        title={follower.name || follower.username}
                      >
                        <Avatar
                          src={follower.avatarUrl || undefined}
                          name={follower.name || follower.username}
                          size="xs"
                          className="ring-2 ring-white dark:ring-gray-900"
                        />
                      </div>
                    ))}
                  </div>
                  {followerCount > 5 && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      +{followerCount - 5}
                    </span>
                  )}
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Badges */}
        {(tiers.length > 0 || noTierItems.length > 0) && (
          <section
            className="mt-6 glass-card rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative z-10"
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ background: `linear-gradient(135deg, ${accent}0a 0%, transparent 50%)` }}
            />
            <h2
              className="relative text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: accent }}
            >
              Badges
            </h2>
            <div className="relative space-y-4">
              {tiers.map(({ tier, label, items }) => (
                <div key={tier}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrophyIcon tier={tier} size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <BadgePill key={item.key} item={item} onSelect={setModalBadge} />
                    ))}
                  </div>
                </div>
              ))}
              {noTierItems.length > 0 && (
                <div>
                  {tiers.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Other
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {noTierItems.map((item) => (
                      <BadgePill key={item.key} item={item} onSelect={setModalBadge} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Group Achievements */}
        {groupBadges && groupBadges.length > 0 && (
          <GroupBadgeSection groups={groupBadges} className="mt-6" />
        )}

        {/* Favorite Groups */}
        {profile.favoriteGroups.length > 0 && (
          <section
            className="mt-6 glass-card rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ background: `linear-gradient(135deg, ${accent}0a 0%, transparent 50%)` }}
            />
            <h2
              className="relative text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: accent }}
            >
              Favorite Groups
            </h2>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.favoriteGroups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/groups/${group.slug}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/40 bg-white/40 dark:bg-gray-800/40 transition-all hover:shadow-md hover:bg-white/60 dark:hover:bg-gray-800/60"
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${accent}40`)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                >
                  {group.photoUrl ? (
                    <img
                      src={group.photoUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-400">
                        {group.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {group.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <section
            className="mt-6 glass-card rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative overflow-hidden"
          >
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{ background: `linear-gradient(135deg, ${accent}0a 0%, transparent 50%)` }}
            />
            <h2
              className="relative text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: accent }}
            >
              Portfolio
            </h2>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200/40 dark:border-gray-700/40 bg-white/40 dark:bg-gray-800/40 overflow-hidden"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-sm transition-colors"
                        style={{ color: accent }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {new URL(item.url).hostname}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
      {modalBadge && (
        <BadgeDetailModal
          badge={{
            name: modalBadge.name,
            slug: modalBadge.key,
            icon: modalBadge.icon,
            color: modalBadge.color,
            description: modalBadge.description,
            points: modalBadge.points,
            awardedAt: modalBadge.awardedAt,
            rarity: modalBadge.rarity,
          }}
          onClose={() => setModalBadge(null)}
        />
      )}
    </div>
  );
}
