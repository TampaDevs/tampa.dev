/**
 * Local Avatar component — copy of @tampadevs/react Avatar with ringColor prop.
 * Once the DS is updated upstream, replace usages with the DS import and delete this file.
 */
import { clsx } from "clsx";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "online" | "offline" | "busy" | "away";

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  ring?: boolean;
  ringColor?: string;
  status?: AvatarStatus;
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  xs: "24px",
  sm: "32px",
  md: "48px",
  lg: "64px",
  xl: "96px",
  "2xl": "128px",
};

const fontSizeMap: Record<AvatarSize, string> = {
  xs: "0.5rem",
  sm: "0.625rem",
  md: "0.875rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
};

const statusSizeMap: Record<AvatarSize, { size: string; bottom: string; right: string }> = {
  xs: { size: "8px", bottom: "-2px", right: "-2px" },
  sm: { size: "10px", bottom: "-1px", right: "-1px" },
  md: { size: "12px", bottom: "0", right: "0" },
  lg: { size: "14px", bottom: "2px", right: "2px" },
  xl: { size: "18px", bottom: "4px", right: "4px" },
  "2xl": { size: "24px", bottom: "6px", right: "6px" },
};

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  alt,
  name = "",
  size = "md",
  shape = "circle",
  ring = false,
  ringColor,
  status,
  className,
}: AvatarProps) {
  const sizeValue = sizeMap[size];
  const fontSize = fontSizeMap[size];
  const statusSize = statusSizeMap[size];

  return (
    <>
      <div
        className={clsx(
          "td-avatar",
          `td-avatar--${shape}`,
          ring && "td-avatar--ring",
          className
        )}
        style={{
          "--avatar-size": sizeValue,
          "--avatar-font-size": fontSize,
          "--status-size": statusSize.size,
          "--status-bottom": statusSize.bottom,
          "--status-right": statusSize.right,
          ...(ringColor ? { "--avatar-ring-color": ringColor } : {}),
        } as React.CSSProperties}
      >
        {src ? (
          <img src={src} alt={alt || name} className="td-avatar__image" />
        ) : (
          <span className="td-avatar__initials">{getInitials(name)}</span>
        )}
        {status && <span className={`td-avatar__status td-avatar__status--${status}`} />}
      </div>
    </>
  );
}
