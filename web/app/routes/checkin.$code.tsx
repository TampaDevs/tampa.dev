/**
 * Event Check-In Page
 *
 * Clean spotlight-style check-in page with centered card layout,
 * dark gradient background, and clear state management.
 */

import { Link, data } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/checkin.$code";
import { generateMetaTags } from "~/lib/seo";
import { fetchCheckinInfo, fetchCurrentUser, API_HOST } from "~/lib/api.server";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Check In",
    description: "Check in to an event on Tampa.dev",
    url: "/checkin",
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";

  const checkinInfo = await fetchCheckinInfo(params.code!);

  if (!checkinInfo) {
    throw data(null, { status: 404 });
  }

  const user = await fetchCurrentUser(cookieHeader);

  return {
    checkinInfo,
    user,
    code: params.code!,
    apiUrl: API_HOST,
  };
}

type CheckinStatus = "idle" | "loading" | "success" | "error";

export default function CheckinPage({ loaderData }: Route.ComponentProps) {
  const { checkinInfo, user, code, apiUrl } = loaderData;

  const [status, setStatus] = useState<CheckinStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isLoggedIn = !!user;

  const eventDate = new Date(checkinInfo.eventStartTime);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleCheckin() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/checkin/${encodeURIComponent(code)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setStatus("success");
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(
          errorData.error || "Failed to check in. The code may be expired or invalid."
        );
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden bg-gradient-to-b from-[#0B1120] via-[#111827] to-[#0B1120]">
      {/* Subtle radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-900/70 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Group photo & name */}
          <div className="flex items-center gap-3 mb-6">
            {checkinInfo.groupPhotoUrl && (
              <img
                src={checkinInfo.groupPhotoUrl}
                alt={checkinInfo.groupName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <span className="text-sm font-medium text-gray-400">
              {checkinInfo.groupName}
            </span>
          </div>

          {/* Event title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {checkinInfo.eventTitle}
          </h1>

          {/* Date and time */}
          <p className="text-gray-400 text-sm mb-8">
            {formattedDate} at {formattedTime}
          </p>

          {/* Action area */}
          {status === "success" ? (
            <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">&#9989;</div>
              <h3 className="text-lg font-bold text-green-300 mb-2">
                You're checked in!
              </h3>
              <p className="text-green-400/80 text-sm mb-5">
                Enjoy the event. You've been marked as present.
              </p>
              <Link
                to={`/groups/${checkinInfo.groupSlug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors text-sm"
              >
                View Event Group
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          ) : status === "error" ? (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">&#9888;&#65039;</div>
              <h3 className="text-lg font-bold text-red-300 mb-2">
                Check-In Failed
              </h3>
              <p className="text-red-400/80 text-sm mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          ) : !isLoggedIn ? (
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-5">
                You need to be signed in to check in to this event.
              </p>
              <Link
                to={`/login?redirect=${encodeURIComponent(`/checkin/${code}`)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Log in to check in
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={handleCheckin}
                disabled={status === "loading"}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {status === "loading" ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Checking in...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Check In
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
