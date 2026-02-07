/**
 * Profile Achievements Tab
 *
 * Achievements progress and earned badges display.
 */

import { useOutletContext } from "react-router";
import { useState, useRef, useCallback, useLayoutEffect } from "react";
import type { Route } from "./+types/profile.achievements";
import type { AchievementInfo, ProfileBadge, ProfileContext } from "~/lib/profile-types";
import { fetchCurrentUser } from "~/lib/admin-api.server";
import { getTrophyTier, TrophyIcon, type TrophyTier } from "~/lib/trophy-tiers";
import { getRarityTier } from "~/lib/rarity";
import { BadgeDetailModal } from "~/components/BadgeDetailModal";
import { Emoji } from "~/components/Emoji";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) return { achievements: [] };

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  const response = await fetch(`${apiUrl}/profile/achievements`, { headers });
  let achievements: AchievementInfo[] = [];
  if (response.ok) {
    const json = await response.json() as { data: AchievementInfo[] };
    achievements = json.data || [];
  }

  return { achievements };
}

function ProfileTiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y - rect.height / 2) / (rect.height / 2)) * -4;
    const ry = ((x - rect.width / 2) / (rect.width / 2)) * 4;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--sx", `${(x / rect.width) * 100}%`);
    el.style.setProperty("--sy", `${(y / rect.height) * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
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
        <div className="relative">{children}</div>
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

function BadgePillWithPopover({ badge, onSelect }: { badge: ProfileBadge; onSelect: (badge: ProfileBadge) => void }) {
  const [open, setOpen] = useState(false);
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
      className="relative"
      onMouseEnter={() => (badge.description || (badge.points && badge.points > 0) || badge.rarity) && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <ProfileTiltCard className="rounded-full">
        <button
          type="button"
          onClick={() => onSelect(badge)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm backdrop-blur-sm border border-white/20 cursor-pointer"
          style={{
            backgroundColor: `${badge.color}dd`,
          }}
        >
          <Emoji emoji={badge.icon} size={16} /> {badge.name}
        </button>
      </ProfileTiltCard>
      {open && (badge.description || (badge.points && badge.points > 0) || badge.rarity) && (
        <div ref={popoverRef} className={`absolute ${popoverPositionClass} top-full mt-2 z-20 w-52 p-3 rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs shadow-xl backdrop-blur-sm border border-white/10`}>
          <div className={`absolute ${arrowPositionClass} -top-1 w-2 h-2 rotate-45 bg-gray-900/95 dark:bg-gray-800/95 border-l border-t border-white/10`} />
          {badge.description && <p className="relative leading-relaxed">{badge.description}</p>}
          {badge.points != null && badge.points > 0 && (
            <p className="relative mt-1.5 text-xs font-semibold text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" /></svg>
              {badge.points} XP
            </p>
          )}
          {badge.rarity && (
            <p className="relative mt-1.5 text-xs font-medium flex items-center gap-1" style={{ color: getRarityTier(badge.rarity.percentage).color }}>
              {getRarityTier(badge.rarity.percentage).label} — {badge.rarity.percentage.toFixed(1)}% of members
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AchievementsSection({
  achievements,
  showAchievements,
}: {
  achievements: AchievementInfo[];
  showAchievements: boolean;
}) {
  const [visible, setVisible] = useState(showAchievements);
  const [saving, setSaving] = useState(false);

  const toggleVisibility = async () => {
    const newValue = !visible;
    setVisible(newValue);
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ showAchievements: newValue }),
      });
    } catch {
      setVisible(!newValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Achievements
        </h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {saving ? "Saving..." : visible ? "Visible on profile" : "Hidden from profile"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            onClick={toggleVisibility}
            disabled={saving}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${visible ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${visible ? "translate-x-4" : "translate-x-0"
                }`}
            />
          </button>
        </label>
      </div>
      {(() => {
        const inProgress = achievements
          .filter((a) => a.completedAt === null)
          .sort((a, b) => {
            const pctA = a.targetValue > 0 ? a.currentValue / a.targetValue : 0;
            const pctB = b.targetValue > 0 ? b.currentValue / b.targetValue : 0;
            return pctB - pctA;
          });

        return (
          <div className="space-y-4">
            {inProgress.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  In Progress
                  <span className="ml-1.5 text-gray-400 dark:text-gray-500">({inProgress.length})</span>
                </h3>
                <div className="space-y-1">
                  {inProgress.map((a) => {
                    const pct = Math.min(100, Math.round((a.currentValue / a.targetValue) * 100));
                    const barColor = a.color || "var(--color-coral, #f97066)";
                    return (
                      <div
                        key={a.key}
                        className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        title={a.description}
                      >
                        {a.icon && <Emoji emoji={a.icon} size={16} />}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                            {a.name}
                            {a.hidden && (
                              <span title="Hidden achievement">
                                <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                </svg>
                              </span>
                            )}
                          </span>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                          {a.currentValue}/{a.targetValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </section>
  );
}

function AchievementsBadgesTab({
  achievements,
  showAchievements,
  badges,
}: {
  achievements: AchievementInfo[];
  showAchievements: boolean;
  badges: ProfileBadge[];
}) {
  const [modalBadge, setModalBadge] = useState<ProfileBadge | null>(null);

  const tierOrder: TrophyTier[] = ['diamond', 'platinum', 'gold', 'silver'];
  const tiers: { tier: TrophyTier; label: string; items: ProfileBadge[] }[] = [];

  for (const t of tierOrder) {
    const tierInfo = getTrophyTier(t === 'diamond' ? 100 : t === 'platinum' ? 50 : t === 'gold' ? 25 : 1);
    const items = badges.filter((badge) => {
      const itemTier = getTrophyTier(badge.points || 0);
      return itemTier?.tier === t;
    });
    items.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));
    if (items.length > 0) {
      tiers.push({ tier: t, label: tierInfo!.label, items });
    }
  }

  const noTierItems = badges.filter((badge) => !getTrophyTier(badge.points || 0));
  noTierItems.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));

  const hasBadges = tiers.length > 0 || noTierItems.length > 0;

  return (
    <>
      {achievements.length > 0 && (
        <AchievementsSection
          achievements={achievements}
          showAchievements={showAchievements}
        />
      )}

      {hasBadges && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Badges
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
            {tiers.map(({ tier, label, items }) => (
              <div key={tier}>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrophyIcon tier={tier} size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((badge) => (
                    <BadgePillWithPopover key={badge.slug} badge={badge} onSelect={setModalBadge} />
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
                  {noTierItems.map((badge) => (
                    <BadgePillWithPopover key={badge.slug} badge={badge} onSelect={setModalBadge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {achievements.length === 0 && !hasBadges && (
        <div className="mt-6 text-center py-12">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-500 dark:text-gray-400">
            No achievements yet. Start participating to earn badges!
          </p>
        </div>
      )}

      {modalBadge && (
        <BadgeDetailModal
          badge={{
            name: modalBadge.name,
            slug: modalBadge.slug,
            icon: modalBadge.icon,
            color: modalBadge.color,
            description: modalBadge.description,
            points: modalBadge.points,
            rarity: modalBadge.rarity,
          }}
          onClose={() => setModalBadge(null)}
        />
      )}
    </>
  );
}

export default function AchievementsTab({ loaderData }: Route.ComponentProps) {
  const { user } = useOutletContext<ProfileContext>();
  const { achievements } = loaderData;

  return (
    <AchievementsBadgesTab
      achievements={achievements}
      showAchievements={user.showAchievements !== false}
      badges={user.badges || []}
    />
  );
}
