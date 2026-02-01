import { useState } from "react";
import { Link } from "react-router";

interface RsvpButtonProps {
  eventId: string;
  initialStatus: "confirmed" | "waitlisted" | null;
  capacity: number | null;
  confirmed: number;
  waitlisted: number;
  isLoggedIn: boolean;
  apiUrl?: string;
  loginUrl?: string;
  className?: string;
}

export function RsvpButton({
  eventId,
  initialStatus,
  capacity,
  confirmed: initialConfirmed,
  waitlisted: initialWaitlisted,
  isLoggedIn,
  apiUrl = "",
  loginUrl = "/login",
  className = "",
}: RsvpButtonProps) {
  const [status, setStatus] = useState<"confirmed" | "waitlisted" | null>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [waitlisted, setWaitlisted] = useState(initialWaitlisted);

  async function handleRsvp() {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/events/${encodeURIComponent(eventId)}/rsvp`,
        {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { status: "confirmed" | "waitlisted" };
        setStatus(data.status);
        if (data.status === "confirmed") {
          setConfirmed((prev) => prev + 1);
        } else if (data.status === "waitlisted") {
          setWaitlisted((prev) => prev + 1);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    const previousStatus = status;
    // Optimistic update
    setStatus(null);
    if (previousStatus === "confirmed") {
      setConfirmed((prev) => Math.max(0, prev - 1));
    } else if (previousStatus === "waitlisted") {
      setWaitlisted((prev) => Math.max(0, prev - 1));
    }
    try {
      const res = await fetch(
        `${apiUrl}/events/${encodeURIComponent(eventId)}/rsvp`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        }
      );
      if (!res.ok) {
        // Revert optimistic update on failure
        setStatus(previousStatus);
        if (previousStatus === "confirmed") {
          setConfirmed((prev) => prev + 1);
        } else if (previousStatus === "waitlisted") {
          setWaitlisted((prev) => prev + 1);
        }
      }
    } catch {
      // Revert optimistic update on error
      setStatus(previousStatus);
      if (previousStatus === "confirmed") {
        setConfirmed((prev) => prev + 1);
      } else if (previousStatus === "waitlisted") {
        setWaitlisted((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  const spinner = (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const baseClasses = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60";

  // Not logged in
  if (!isLoggedIn) {
    return (
      <Link
        to={loginUrl}
        className={`${baseClasses} bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 ${className}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Log in to RSVP
      </Link>
    );
  }

  // Confirmed
  if (status === "confirmed") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className={`${baseClasses} bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 ${className}`}
      >
        {loading ? spinner : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Going
          </>
        )}
      </button>
    );
  }

  // Waitlisted
  if (status === "waitlisted") {
    return (
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className={`${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 ${className}`}
      >
        {loading ? spinner : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waitlisted
          </>
        )}
      </button>
    );
  }

  // Not RSVP'd — default state
  const isFull = capacity !== null && confirmed >= capacity;

  return (
    <button
      type="button"
      onClick={handleRsvp}
      disabled={loading}
      className={`${baseClasses} bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white shadow-md shadow-coral/15 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5 transition-all ${className}`}
    >
      {loading ? spinner : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {isFull ? "Join Waitlist" : "RSVP"}
        </>
      )}
    </button>
  );
}
