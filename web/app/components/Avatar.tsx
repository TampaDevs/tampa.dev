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
      <AvatarStyles />
    </>
  );
}

function AvatarStyles() {
  return (
    <style>{`
      .td-avatar {
        position: relative;
        width: var(--avatar-size);
        height: var(--avatar-size);
        overflow: visible;
        background: linear-gradient(135deg, #2B3447 0%, #1C2438 100%);
        border: 2px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }

      .td-avatar--circle {
        border-radius: 9999px;
      }

      .td-avatar--square {
        border-radius: 0.5rem;
      }

      .td-avatar--ring {
        box-shadow: 0 0 0 3px var(--avatar-ring-color, #E85A4F);
      }

      .td-avatar__image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }

      .td-avatar__initials {
        font-size: var(--avatar-font-size);
        font-weight: 600;
        color: white;
        text-transform: uppercase;
        user-select: none;
      }

      .td-avatar__status {
        position: absolute;
        width: var(--status-size);
        height: var(--status-size);
        bottom: var(--status-bottom);
        right: var(--status-right);
        border-radius: 9999px;
        border: 2px solid #1C2438;
      }

      .td-avatar__status--online {
        background-color: #10B981;
      }

      .td-avatar__status--offline {
        background-color: #6B7280;
      }

      .td-avatar__status--busy {
        background-color: #EF4444;
      }

      .td-avatar__status--away {
        background-color: #F59E0B;
      }
    `}</style>
  );
}
