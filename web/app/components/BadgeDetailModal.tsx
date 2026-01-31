/**
 * BadgeDetailModal
 *
 * A modal overlay that displays detailed badge information when a user
 * clicks on a badge pill. Features a large badge icon with a colored glow,
 * trophy tier display, award date, and a link to see other members with
 * the same badge.
 */

import { useEffect } from "react";
import { Link } from "react-router";
import { getTrophyTier, TrophyIcon } from "~/lib/trophy-tiers";
import { getRarityTier } from "~/lib/rarity";

interface BadgeDetailModalProps {
  badge: {
    name: string;
    slug: string;
    icon: string;
    color: string;
    description?: string | null;
    points?: number;
    awardedAt?: string | null;
    rarity?: { tier: string; percentage: number };
  };
  onClose: () => void;
}

export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const trophyTier = badge.points ? getTrophyTier(badge.points) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "badgeModalFadeIn 0.2s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden"
        style={{ animation: "badgeModalScaleIn 0.2s ease-out" }}
      >
        {/* Accent top bar */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: badge.color }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-8 flex flex-col items-center text-center">
          {/* Glow circle + badge icon */}
          <div className="relative mb-4">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-30"
              style={{
                backgroundColor: badge.color,
                width: "96px",
                height: "96px",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
            <div
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${badge.color}33 0%, ${badge.color}11 60%, transparent 100%)`,
              }}
            >
              <span className="text-6xl drop-shadow-lg">{badge.icon}</span>
            </div>
          </div>

          {/* Badge name */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {badge.name}
          </h3>

          {/* Badge description */}
          {badge.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {badge.description}
            </p>
          )}

          {/* Trophy tier + XP display */}
          {trophyTier && badge.points && badge.points > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <TrophyIcon tier={trophyTier.tier} size={18} />
              <span
                className="text-sm font-semibold"
                style={{ color: trophyTier.color }}
              >
                {trophyTier.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {badge.points} XP
              </span>
            </div>
          )}

          {/* Rarity indicator */}
          {badge.rarity && (
            <p
              className="mt-3 text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ color: getRarityTier(badge.rarity.percentage).color }}
            >
              {getRarityTier(badge.rarity.percentage).label} — {badge.rarity.percentage.toFixed(1)}% of members
            </p>
          )}

          {/* Awarded date */}
          {badge.awardedAt && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Awarded on{" "}
              {new Date(badge.awardedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          {/* Link to see other members */}
          <Link
            to={`/members?badge=${encodeURIComponent(badge.slug)}`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            See other members with this badge
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes badgeModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes badgeModalScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
