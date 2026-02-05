/**
 * GroupAvatar — reusable avatar component for groups with initials fallback.
 *
 * Shows the group photo if available, otherwise displays initials derived
 * from the group name. Supports multiple sizes and shapes.
 */
import { clsx } from "clsx";

export type GroupAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type GroupAvatarShape = "circle" | "rounded";

export interface GroupAvatarProps {
  /** Group photo URL */
  photoUrl?: string | null;
  /** Group name (used for alt text and initials fallback) */
  name: string;
  /** Size variant */
  size?: GroupAvatarSize;
  /** Shape variant */
  shape?: GroupAvatarShape;
  /** Optional theme color for the initials background */
  themeColor?: string | null;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses: Record<GroupAvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-lg",
};

const shapeClasses: Record<GroupAvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-xl",
};

/**
 * Extract initials from a group name.
 * Takes up to 2 words and uses their first characters.
 */
function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single word: use first 2 characters
    return words[0].substring(0, 2).toUpperCase();
  }
  // Multiple words: use first char of first 2 words
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function GroupAvatar({
  photoUrl,
  name,
  size = "md",
  shape = "rounded",
  themeColor,
  className,
}: GroupAvatarProps) {
  const sizeClass = sizeClasses[size];
  const shapeClass = shapeClasses[shape];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={clsx(
          sizeClass,
          shapeClass,
          "object-cover flex-shrink-0",
          className
        )}
      />
    );
  }

  // Initials fallback
  const bgStyle = themeColor
    ? { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }
    : { background: "linear-gradient(135deg, #1a365d, #2a4a7f)" };

  return (
    <div
      className={clsx(
        sizeClass,
        shapeClass,
        "flex items-center justify-center flex-shrink-0 font-bold text-white",
        className
      )}
      style={bgStyle}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
