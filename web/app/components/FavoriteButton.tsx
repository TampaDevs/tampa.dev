import { useState, useEffect, useRef } from "react";
import { isFavorite, toggleFavoriteAsync } from "~/lib/favorites";
import { triggerSignInPrompt } from "~/lib/signin-prompt";

interface FavoriteButtonProps {
  slug: string;
  size?: "small" | "medium";
  count?: number;
}

const HEART_PATH =
  "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z";

export function FavoriteButton({ slug, size = "medium", count }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setFavorited(isFavorite(slug));
    setIsLoaded(true);
  }, [slug]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (isUpdating) return;

    const newState = !favorited;
    setFavorited(newState);
    setIsUpdating(true);

    // Trigger burst animation on favorite (not unfavorite)
    if (newState) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 600);

      // Nudge unauthenticated users to sign in (root.tsx decides whether to show)
      triggerSignInPrompt();
    }

    try {
      await toggleFavoriteAsync(slug);
    } catch (error) {
      setFavorited(!newState);
      console.error("Failed to toggle favorite:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  const isSmall = size === "small";
  const iconSize = isSmall ? "w-4 h-4" : "w-5 h-5";
  const showCount = count !== undefined && count > 0;

  // Base pill sizing — expands when count is shown
  const pillClass = showCount
    ? isSmall
      ? "h-8 px-2.5 gap-1"
      : "h-10 px-3 gap-1.5"
    : isSmall
      ? "w-8 h-8"
      : "w-10 h-10";

  if (!isLoaded) {
    return (
      <button
        type="button"
        className={`${pillClass} rounded-full backdrop-blur-sm bg-black/20 flex items-center justify-center shadow-sm`}
        disabled
      >
        <svg
          className={`${iconSize} text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={HEART_PATH} />
        </svg>
        {showCount && (
          <span className="text-xs font-medium text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`${pillClass} relative rounded-full backdrop-blur-sm bg-black/20 flex items-center justify-center shadow-sm transition-all hover:scale-110 hover:bg-black/30 active:scale-95`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      {/* Heart icon */}
      {favorited ? (
        <svg
          className={`${iconSize} text-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform ${showBurst ? "animate-[heart-pop_0.35s_ease-out]" : ""}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d={HEART_PATH} />
        </svg>
      ) : (
        <svg
          className={`${iconSize} text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-colors`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={HEART_PATH} />
        </svg>
      )}

      {/* Count label */}
      {showCount && (
        <span className="text-xs font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {count}
        </span>
      )}

      {/* Burst particles */}
      {showBurst && <BurstEffect />}

      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes burst-particle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: var(--burst-end) scale(0); }
        }
      `}</style>
    </button>
  );
}

/** Six tiny dots that fly outward from the center */
function BurstEffect() {
  const particles = [
    { color: "#E85A4F", end: "translate(-10px, -12px)" },
    { color: "#F4A261", end: "translate(10px, -12px)" },
    { color: "#E76F51", end: "translate(14px, 0px)" },
    { color: "#E85A4F", end: "translate(10px, 12px)" },
    { color: "#F4A261", end: "translate(-10px, 12px)" },
    { color: "#E76F51", end: "translate(-14px, 0px)" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 4,
            height: 4,
            backgroundColor: p.color,
            "--burst-end": p.end,
            animation: `burst-particle 0.5s ease-out ${i * 0.03}s forwards`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
