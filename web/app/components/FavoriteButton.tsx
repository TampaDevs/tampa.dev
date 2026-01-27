import { useState, useEffect } from "react";
import { isFavorite, toggleFavorite } from "~/lib/favorites";

interface FavoriteButtonProps {
  slug: string;
  size?: "small" | "medium";
}

export function FavoriteButton({ slug, size = "medium" }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setFavorited(isFavorite(slug));
    setIsLoaded(true);
  }, [slug]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleFavorite(slug);
    setFavorited(result.isFavorite);
  }

  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-10 h-10",
  }[size];

  const iconSize = {
    small: "w-4 h-4",
    medium: "w-5 h-5",
  }[size];

  if (!isLoaded) {
    return (
      <button
        type="button"
        className={`${sizeClasses} rounded-full backdrop-blur-sm bg-black/20 flex items-center justify-center shadow-sm`}
        disabled
      >
        <svg
          className={`${iconSize} text-white/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${sizeClasses} rounded-full backdrop-blur-sm bg-black/20 flex items-center justify-center shadow-sm transition-all hover:scale-110 hover:bg-black/30 active:scale-95`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      {favorited ? (
        <svg
          className={`${iconSize} text-coral drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ) : (
        <svg
          className={`${iconSize} text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-colors`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}
