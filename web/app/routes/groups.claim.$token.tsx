/**
 * Group Claim Page
 *
 * Allows a user to claim ownership/admin of an existing group
 * via an invite token. Clean centered card layout matching
 * the claim.$code.tsx aesthetic.
 */

import { Link, data } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/groups.claim.$token";
import { generateMetaTags } from "~/lib/seo";
import {
  fetchGroupClaimInfo,
  fetchCurrentUser,
  API_HOST,
} from "~/lib/api.server";

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  const groupName = loaderData?.claimInfo?.groupName ?? "Group";
  return generateMetaTags({
    title: `Claim ${groupName}`,
    description: `Claim ownership of ${groupName} on Tampa.dev`,
    url: "/groups/claim",
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";

  const claimInfo = await fetchGroupClaimInfo(params.token!);

  if (!claimInfo) {
    throw data(null, { status: 404 });
  }

  const user = await fetchCurrentUser(cookieHeader);

  return {
    claimInfo,
    user,
    token: params.token!,
    apiUrl: API_HOST,
  };
}

type ClaimStatus = "idle" | "loading" | "success" | "pending" | "error";

export default function GroupClaimPage({ loaderData }: Route.ComponentProps) {
  const { claimInfo, user, token, apiUrl } = loaderData;

  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isLoggedIn = !!user;

  async function handleClaim() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${apiUrl}/groups/claim/${encodeURIComponent(token)}`,
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
        if (claimInfo.autoApprove) {
          setStatus("success");
        } else {
          setStatus("pending");
        }
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(
          errorData.error ||
            "Failed to claim group. The token may be expired or invalid."
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
            "radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gray-900/70 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          {/* Group photo and name */}
          <div className="flex flex-col items-center text-center mb-6">
            {claimInfo.groupPhotoUrl && (
              <img
                src={claimInfo.groupPhotoUrl}
                alt={claimInfo.groupName}
                className="w-16 h-16 rounded-xl object-cover mb-4 border border-gray-600/50"
              />
            )}
            <h1 className="text-2xl font-bold text-white mb-1">
              {claimInfo.groupName}
            </h1>
            {claimInfo.groupDescription && (
              <p className="text-gray-400 text-sm leading-relaxed mt-2 line-clamp-3">
                {claimInfo.groupDescription}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700/50 my-6" />

          {/* Action area */}
          {status === "success" ? (
            <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">&#127881;</div>
              <h3 className="text-lg font-bold text-green-300 mb-2">
                Group claimed!
              </h3>
              <p className="text-green-400/80 text-sm mb-5">
                You are now the owner of{" "}
                <strong className="text-green-300">{claimInfo.groupName}</strong>.
                You can manage it from your group dashboard.
              </p>
              <Link
                to={`/groups/${claimInfo.groupId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors text-sm"
              >
                Manage Group
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
          ) : status === "pending" ? (
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">&#9203;</div>
              <h3 className="text-lg font-bold text-amber-300 mb-2">
                Request Submitted
              </h3>
              <p className="text-amber-400/80 text-sm mb-5">
                Your claim request has been submitted. An admin will review it.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold transition-colors text-sm"
              >
                Back to Home
              </Link>
            </div>
          ) : status === "error" ? (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">&#9888;&#65039;</div>
              <h3 className="text-lg font-bold text-red-300 mb-2">
                Could Not Claim Group
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
              <h3 className="text-lg font-semibold text-white mb-2">
                Claim This Group
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                You need to be signed in to claim ownership of this group.
              </p>
              <Link
                to={`/login?redirect=${encodeURIComponent(`/groups/claim/${token}`)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
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
                Log in to claim this group
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">
                Claim This Group
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                {claimInfo.autoApprove
                  ? `Claim ownership of ${claimInfo.groupName}. You will be granted owner access immediately.`
                  : `Request ownership of ${claimInfo.groupName}. An admin will review your request.`}
              </p>
              <button
                type="button"
                onClick={handleClaim}
                disabled={status === "loading"}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                    {claimInfo.autoApprove ? "Claiming..." : "Submitting..."}
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    {claimInfo.autoApprove ? "Claim Group" : "Request to Claim"}
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
