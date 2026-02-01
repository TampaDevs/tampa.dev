/**
 * useSignInPrompt — Manages sign-in prompt modal state
 *
 * Listens for triggerSignInPrompt() calls from anywhere in the app
 * (e.g. FavoriteButton) and controls modal visibility with 30-day dismissal.
 *
 * useTimedSignInPrompt — Fires the prompt after a delay on interactive pages.
 * Only fires once per session and respects the same 30-day dismissal window.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  onSignInPrompt,
  isDismissedRecently,
  setDismissed,
} from "~/lib/signin-prompt";

/**
 * Core hook: subscribe to prompt events and manage show/dismiss state.
 *
 * @param user — The authenticated user object (null/undefined = unauthenticated)
 * @returns { showModal, triggerModal, dismissModal }
 */
export function useSignInPrompt(user: unknown) {
  const [showModal, setShowModal] = useState(false);

  const canShow = useCallback(() => {
    // Never show for authenticated users
    if (user) return false;
    // Never show if dismissed within 30 days
    if (isDismissedRecently()) return false;
    return true;
  }, [user]);

  const triggerModal = useCallback(() => {
    if (canShow()) {
      setShowModal(true);
    }
  }, [canShow]);

  const dismissModal = useCallback(() => {
    setShowModal(false);
    setDismissed();
  }, []);

  // Listen for events from triggerSignInPrompt()
  useEffect(() => {
    const unsubscribe = onSignInPrompt(() => {
      triggerModal();
    });
    return unsubscribe;
  }, [triggerModal]);

  return { showModal, triggerModal, dismissModal };
}

/* ------------------------------------------------------------------ */
/*  Timed variant for interactive pages                                */
/* ------------------------------------------------------------------ */

const SESSION_KEY = "signin-prompt-timed-shown";

/**
 * Trigger the sign-in prompt after the user has been on an interactive page
 * for a set duration. Only fires once per browser session.
 *
 * @param user — The authenticated user object (null/undefined = unauthenticated)
 * @param isInteractivePage — Whether the current page qualifies
 * @param delayMs — Milliseconds to wait before triggering (default 45s)
 */
export function useTimedSignInPrompt(
  user: unknown,
  isInteractivePage: boolean,
  delayMs: number = 45000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only for unauthenticated users on qualifying pages
    if (user) return;
    if (!isInteractivePage) return;
    if (typeof window === "undefined") return;
    if (isDismissedRecently()) return;

    // Only once per session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // sessionStorage unavailable — skip
      return;
    }

    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Ignore
      }

      // Import dynamically to avoid circular deps, but since we already
      // imported at the top of this file we can use the event emitter directly
      import("~/lib/signin-prompt").then(({ triggerSignInPrompt }) => {
        triggerSignInPrompt();
      });
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, isInteractivePage, delayMs]);
}
