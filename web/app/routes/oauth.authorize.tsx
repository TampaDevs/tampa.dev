/**
 * OAuth Authorization Page
 *
 * Beautiful consent screen for "Sign in with Tampa.dev"
 * Users approve third-party apps to access their Tampa.dev account here.
 */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { redirect, useLoaderData, useFetcher } from "react-router";
import { Button, Avatar } from "@tampadevs/react";
import type { Route } from "./+types/oauth.authorize";
import { fetchCurrentUser, type AuthUser } from "~/lib/admin-api.server";

// Scope descriptions for the UI
const SCOPE_INFO: Record<string, { label: string; description: string; icon: string }> = {
  profile: {
    label: "Your Profile",
    description: "Read your name, email, and avatar",
    icon: "user",
  },
  "events:read": {
    label: "Events",
    description: "View upcoming events and calendar",
    icon: "calendar",
  },
  "groups:read": {
    label: "Groups",
    description: "View tech groups and communities",
    icon: "users",
  },
  "rsvp:write": {
    label: "RSVPs",
    description: "RSVP to events on your behalf",
    icon: "check",
  },
};

interface OAuthRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope?: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

interface ClientInfo {
  clientId: string;
  clientName?: string;
  logoUri?: string;
  clientUri?: string;
  policyUri?: string;
  tosUri?: string;
  redirectUris?: string[];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("Cookie") || undefined;

  // Check if user is logged in
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    // Store the OAuth URL and redirect to login
    // After login, we'll redirect back here
    const returnUrl = encodeURIComponent(url.toString());
    return redirect(`/login?returnTo=${returnUrl}`);
  }

  // Parse OAuth parameters
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope");
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");

  if (!clientId || !redirectUri || !responseType) {
    return {
      error: "Missing required OAuth parameters",
      user,
      oauthRequest: null,
      client: null,
    };
  }

  // Call API to parse the request and get client info
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  try {
    const parseResponse = await fetch(`${apiUrl}/oauth/internal/parse-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ url: url.toString() }),
    });

    const parseData = await parseResponse.json() as {
      success: boolean;
      oauthRequest?: OAuthRequest;
      client?: ClientInfo;
      error?: string;
    };

    if (!parseData.success) {
      return {
        error: parseData.error || "Failed to parse OAuth request",
        user,
        oauthRequest: null,
        client: null,
      };
    }

    return {
      error: null,
      user,
      oauthRequest: parseData.oauthRequest,
      client: parseData.client,
      requestedScopes: scope?.split(" ") || ["profile"],
    };
  } catch (error) {
    console.error("Failed to parse OAuth request:", error);
    return {
      error: "Failed to communicate with authorization server",
      user,
      oauthRequest: null,
      client: null,
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "deny") {
    // User denied - redirect back with error
    const redirectUri = formData.get("redirectUri") as string;
    const state = formData.get("state") as string;
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "access_denied");
    errorUrl.searchParams.set("error_description", "User denied the authorization request");
    if (state) errorUrl.searchParams.set("state", state);
    return redirect(errorUrl.toString());
  }

  if (intent === "approve") {
    // User approved - complete authorization via API
    const oauthRequestJson = formData.get("oauthRequest") as string;
    const userId = formData.get("userId") as string;
    const approvedScopesJson = formData.get("approvedScopes") as string;

    const oauthRequest = JSON.parse(oauthRequestJson);
    const approvedScopes = JSON.parse(approvedScopesJson);

    const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

    try {
      const completeResponse = await fetch(`${apiUrl}/oauth/internal/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          oauthRequest,
          userId,
          approvedScopes,
        }),
      });

      const completeData = await completeResponse.json() as {
        success: boolean;
        redirectTo?: string;
        error?: string;
      };

      if (!completeData.success || !completeData.redirectTo) {
        throw new Error(completeData.error || "Failed to complete authorization");
      }

      return redirect(completeData.redirectTo);
    } catch (error) {
      console.error("Failed to complete authorization:", error);
      // Redirect back with error
      const redirectUri = oauthRequest.redirectUri;
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set("error", "server_error");
      errorUrl.searchParams.set("error_description", "Authorization server error");
      if (oauthRequest.state) errorUrl.searchParams.set("state", oauthRequest.state);
      return redirect(errorUrl.toString());
    }
  }

  return { error: "Invalid action" };
}

function ScopeIcon({ scope }: { scope: string }) {
  const icons: Record<string, ReactNode> = {
    user: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const info = SCOPE_INFO[scope];
  return icons[info?.icon || "user"] || icons.user;
}

export default function OAuthAuthorizePage() {
  const { error, user, oauthRequest, client, requestedScopes } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const [hasApproved, setHasApproved] = useState(false);

  // Track when the user clicks approve via fetcher's submitted form data
  useEffect(() => {
    if (fetcher.formData?.get("intent") === "approve") {
      setHasApproved(true);
    }
  }, [fetcher.formData]);

  // If we approved and the fetcher settled back to idle, the redirect target
  // was likely a protocol handler (e.g. claude-desktop://) that opened a popup
  // but left this page sitting here. Redirect to home after a short delay.
  const handleRedirectHome = useCallback(() => {
    window.location.href = "/";
  }, []);

  useEffect(() => {
    if (hasApproved && fetcher.state === "idle") {
      const timer = setTimeout(handleRedirectHome, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasApproved, fetcher.state, handleRedirectHome]);

  // Show a completion screen if we're stuck on the page after approving
  if (hasApproved && fetcher.state === "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              Tampa<span className="text-coral">.dev</span>
            </h1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Authorization Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You've granted access to <strong>{client?.clientName || "the app"}</strong>. You can close this tab or you'll be redirected shortly.
            </p>
            <button
              onClick={handleRedirectHome}
              className="inline-block py-2 px-6 rounded-xl bg-coral hover:bg-coral-dark text-white font-semibold transition-colors"
            >
              Go to Tampa.dev
            </button>
          </div>
          <p className="text-center text-white/40 text-xs mt-6">
            You can revoke access at any time from your account settings
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Authorization Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error}
          </p>
        </div>
      </div>
    );
  }

  const clientName = client?.clientName || client?.clientId || "Unknown App";
  const scopes = requestedScopes || ["profile"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Tampa<span className="text-coral">.dev</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Sign in with Tampa.dev</p>
        </div>

        {/* Consent Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              {client?.logoUri ? (
                <img
                  src={client.logoUri}
                  alt={clientName}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {clientName}
                </h2>
                {client?.clientUri && (
                  <a
                    href={client.clientUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-coral hover:underline"
                  >
                    {new URL(client.clientUri).hostname}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Signing in as:
            </p>
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.avatarUrl || undefined}
                name={user?.name || user?.email || "User"}
                size="sm"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="p-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              This app would like to:
            </p>
            <ul className="space-y-3">
              {scopes.map((scope) => {
                const info = SCOPE_INFO[scope] || { label: scope, description: "Access this permission" };
                return (
                  <li key={scope} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-coral/10 text-coral flex items-center justify-center">
                      <ScopeIcon scope={scope} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {info.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {info.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <fetcher.Form method="post" className="space-y-3">
              <input type="hidden" name="oauthRequest" value={JSON.stringify(oauthRequest)} />
              <input type="hidden" name="userId" value={user?.id || ""} />
              <input type="hidden" name="approvedScopes" value={JSON.stringify(scopes)} />
              <input type="hidden" name="redirectUri" value={oauthRequest?.redirectUri || ""} />
              <input type="hidden" name="state" value={oauthRequest?.state || ""} />

              <button
                type="submit"
                name="intent"
                value="approve"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-coral hover:bg-coral-dark text-white font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Authorizing..." : "Allow Access"}
              </button>

              <button
                type="submit"
                name="intent"
                value="deny"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold transition-colors disabled:opacity-50"
              >
                Deny
              </button>
            </fetcher.Form>

            {/* Legal Links */}
            {(client?.policyUri || client?.tosUri) && (
              <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                By authorizing, you agree to this app's{" "}
                {client.tosUri && (
                  <a href={client.tosUri} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
                    Terms of Service
                  </a>
                )}
                {client.tosUri && client.policyUri && " and "}
                {client.policyUri && (
                  <a href={client.policyUri} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">
                    Privacy Policy
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-6">
          You can revoke access at any time from your account settings
        </p>
      </div>
    </div>
  );
}
