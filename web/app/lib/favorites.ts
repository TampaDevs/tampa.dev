/**
 * Client-side favorites management using localStorage
 */

const FAVORITES_KEY = "tampa_dev_favorites";

/**
 * Get favorite group slugs from localStorage
 */
export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Add a group to favorites
 */
export function addFavorite(slug: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(slug)) {
    favorites.push(slug);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
  return favorites;
}

/**
 * Remove a group from favorites
 */
export function removeFavorite(slug: string): string[] {
  const favorites = getFavorites().filter((f) => f !== slug);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

/**
 * Toggle a group's favorite status
 */
export function toggleFavorite(slug: string): { favorites: string[]; isFavorite: boolean } {
  const favorites = getFavorites();
  const isFavorite = favorites.includes(slug);

  if (isFavorite) {
    return { favorites: removeFavorite(slug), isFavorite: false };
  } else {
    return { favorites: addFavorite(slug), isFavorite: true };
  }
}

/**
 * Check if a group is favorited
 */
export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}
