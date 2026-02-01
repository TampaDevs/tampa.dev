/**
 * Client-side favorites management
 *
 * Uses localStorage for all users (anonymous and authenticated).
 * Authenticated users can sync with the server for cross-device access.
 */

const FAVORITES_KEY = "tampa_dev_favorites";
const SYNC_KEY = "tampa_dev_favorites_synced";

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
 * Set favorites in localStorage
 */
function setFavorites(favorites: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/**
 * Add a group to favorites (localStorage only)
 */
export function addFavorite(slug: string): string[] {
  const favorites = getFavorites();
  if (!favorites.includes(slug)) {
    favorites.push(slug);
    setFavorites(favorites);
  }
  return favorites;
}

/**
 * Remove a group from favorites (localStorage only)
 */
export function removeFavorite(slug: string): string[] {
  const favorites = getFavorites().filter((f) => f !== slug);
  setFavorites(favorites);
  return favorites;
}

/**
 * Toggle a group's favorite status (localStorage only)
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

// ============== API-backed functions for authenticated users ==============

const API_BASE = typeof window !== "undefined"
  ? "" // Same origin in browser
  : (process.env.EVENTS_API_URL || "https://api.tampa.dev");

/**
 * Sync localStorage favorites with the server
 * Merges local favorites with server favorites and returns the combined list.
 */
export async function syncFavoritesWithServer(): Promise<{
  favorites: string[];
  added: number;
  synced: boolean;
}> {
  const localFavorites = getFavorites();

  try {
    const response = await fetch(`${API_BASE}/api/favorites/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ slugs: localFavorites }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Not authenticated, just return local favorites
        return { favorites: localFavorites, added: 0, synced: false };
      }
      throw new Error("Failed to sync favorites");
    }

    const json = await response.json() as {
      data: {
        favorites: Array<{ groupSlug: string }>;
        added: number;
      };
    };
    const data = json.data;

    // Update localStorage with merged favorites
    const serverSlugs = data.favorites.map((f) => f.groupSlug);
    setFavorites(serverSlugs);

    // Mark as synced
    localStorage.setItem(SYNC_KEY, new Date().toISOString());

    return { favorites: serverSlugs, added: data.added, synced: true };
  } catch (error) {
    console.error("Failed to sync favorites:", error);
    return { favorites: localFavorites, added: 0, synced: false };
  }
}

/**
 * Add a favorite via API (for authenticated users)
 */
export async function addFavoriteAsync(slug: string): Promise<boolean> {
  // Always update localStorage first
  addFavorite(slug);

  try {
    const response = await fetch(`${API_BASE}/api/favorites/${encodeURIComponent(slug)}`, {
      method: "POST",
      credentials: "include",
    });

    if (response.status === 401) {
      // Not authenticated, localStorage update is sufficient
      return true;
    }

    return response.ok;
  } catch (error) {
    console.error("Failed to add favorite via API:", error);
    return true; // localStorage was updated, so return true
  }
}

/**
 * Remove a favorite via API (for authenticated users)
 */
export async function removeFavoriteAsync(slug: string): Promise<boolean> {
  // Always update localStorage first
  removeFavorite(slug);

  try {
    const response = await fetch(`${API_BASE}/api/favorites/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.status === 401) {
      // Not authenticated, localStorage update is sufficient
      return true;
    }

    return response.ok;
  } catch (error) {
    console.error("Failed to remove favorite via API:", error);
    return true; // localStorage was updated, so return true
  }
}

/**
 * Toggle a favorite via API (for authenticated users)
 */
export async function toggleFavoriteAsync(
  slug: string
): Promise<{ favorites: string[]; isFavorite: boolean }> {
  const wasFavorite = isFavorite(slug);

  if (wasFavorite) {
    await removeFavoriteAsync(slug);
  } else {
    await addFavoriteAsync(slug);
  }

  return {
    favorites: getFavorites(),
    isFavorite: !wasFavorite,
  };
}

/**
 * Get favorites from server (for authenticated users)
 */
export async function getFavoritesFromServer(): Promise<string[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/favorites`, {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null; // Not authenticated
      }
      throw new Error("Failed to fetch favorites");
    }

    const json = await response.json() as {
      data: Array<{ groupSlug: string }>;
    };

    return json.data.map((f) => f.groupSlug);
  } catch (error) {
    console.error("Failed to fetch favorites from server:", error);
    return null;
  }
}

/**
 * Check if favorites have been synced with server
 */
export function hasBeenSynced(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SYNC_KEY) !== null;
}

/**
 * Clear sync status (e.g., on logout)
 */
export function clearSyncStatus(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SYNC_KEY);
}
