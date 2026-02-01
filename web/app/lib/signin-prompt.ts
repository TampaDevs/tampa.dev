/**
 * Sign-In Prompt — Simple pub/sub event emitter
 *
 * Allows any component (e.g. FavoriteButton) to request the sign-in prompt
 * without prop drilling. The root App component subscribes and shows the modal
 * when appropriate (only for unauthenticated users who haven't dismissed recently).
 */

type Listener = () => void;

const listeners: Set<Listener> = new Set();

/**
 * Subscribe to sign-in prompt requests.
 * Returns an unsubscribe function.
 */
export function onSignInPrompt(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Request the sign-in prompt to be shown.
 * Any component can call this — the root layout decides whether to actually show it.
 */
export function triggerSignInPrompt(): void {
  listeners.forEach((fn) => fn());
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers for 30-day dismissal                          */
/* ------------------------------------------------------------------ */

const DISMISS_KEY = "signin-prompt-dismissed";
const DISMISS_DAYS = 30;

/**
 * Check whether the sign-in prompt was dismissed within the last 30 days.
 */
export function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;

    const dismissedAt = new Date(stored).getTime();
    const now = Date.now();
    const daysSince = (now - dismissedAt) / (1000 * 60 * 60 * 24);

    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

/**
 * Record that the user dismissed the sign-in prompt.
 */
export function setDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
}
