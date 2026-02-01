/**
 * GroupBadgeSection — collapsible section for displaying group-specific badges
 * on user profiles.
 *
 * Each group is rendered as a collapsible card with a header showing the group
 * photo, name, XP total, and an expand/collapse chevron. When expanded, a grid
 * of badge pills is displayed with icon, name, and points.
 */

import { useState } from "react";
import { Link } from "react-router";
import type { GroupBadgeGroup, GroupBadgeInfo } from "~/lib/types";
import { Emoji } from "~/components/Emoji";

interface GroupBadgeSectionProps {
  groups: GroupBadgeGroup[];
  className?: string;
}

function GroupInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
        {initials}
      </span>
    </div>
  );
}

function BadgeIcon({ badge }: { badge: GroupBadgeInfo }) {
  const bgColor = badge.color || "#6366f1";

  if (badge.icon) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] leading-none shrink-0"
        style={{ backgroundColor: `${bgColor}33` }}
      >
        <Emoji emoji={badge.icon} size={14} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white leading-none shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {badge.name.charAt(0).toUpperCase()}
    </span>
  );
}

function GroupBadgePill({ badge }: { badge: GroupBadgeInfo }) {
  const bgColor = badge.color || "#6366f1";

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm backdrop-blur-sm border border-white/20"
      style={{ backgroundColor: `${bgColor}dd` }}
      title={badge.description || undefined}
    >
      <BadgeIcon badge={badge} />
      <span className="truncate max-w-[120px]">{badge.name}</span>
      {badge.points > 0 && (
        <span className="opacity-80 tabular-nums shrink-0">
          {badge.points} XP
        </span>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function GroupCard({
  group,
  defaultExpanded,
}: {
  group: GroupBadgeGroup;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-gray-200/40 dark:border-gray-700/40 bg-white/40 dark:bg-gray-800/40 overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
      >
        {/* Group photo or initials */}
        {group.groupPhotoUrl ? (
          <img
            src={group.groupPhotoUrl}
            alt=""
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
        ) : (
          <GroupInitials name={group.groupName} />
        )}

        {/* Group name (links to group page) */}
        <Link
          to={`/groups/${group.groupSlug}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-sm text-gray-900 dark:text-white truncate hover:underline"
        >
          {group.groupName}
        </Link>

        {/* XP total */}
        <span className="ml-auto text-xs font-semibold text-amber-500 dark:text-amber-400 tabular-nums shrink-0 flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" />
          </svg>
          {group.totalXp} XP
        </span>

        {/* Expand/collapse chevron */}
        <ChevronIcon expanded={expanded} />
      </button>

      {/* Badge grid */}
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {group.badges.map((badge) => (
              <GroupBadgePill key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GroupBadgeSection({ groups, className }: GroupBadgeSectionProps) {
  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <section
      className={`glass-card rounded-xl p-5 border border-gray-200/60 dark:border-gray-700/60 bg-white/[0.92] dark:bg-gray-900/[0.88] backdrop-blur-xl relative overflow-hidden ${className || ""}`}
    >
      {/* Section title */}
      <h2 className="relative text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" />
        </svg>
        Group Achievements
      </h2>

      {/* Group cards */}
      <div className="relative space-y-3">
        {groups.map((group, index) => (
          <GroupCard
            key={group.groupId}
            group={group}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
