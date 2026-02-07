/**
 * OAuth Authorization Page
 *
 * Beautiful consent screen for "Sign in with Tampa.dev"
 * Users approve third-party apps to access their Tampa.dev account here.
 */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { redirect, useLoaderData, useFetcher } from "react-router";
import { Avatar } from "@tampadevs/react";
import type { Route } from "./+types/oauth.authorize";
import { fetchCurrentUser } from "~/lib/admin-api.server";

// Group scopes into categories for a cleaner consent screen.
// Maps each scope (including legacy aliases) to a display group.
const SCOPE_TO_GROUP: Record<string, string> = {
  openid: "identity",
  user: "profile", "read:user": "profile", "user:email": "profile", profile: "profile",
  "read:events": "events", "write:events": "events",
  "events:read": "events", "rsvp:read": "events", "rsvp:write": "events",
  "read:groups": "groups", "groups:read": "groups",
  "read:favorites": "favorites", "write:favorites": "favorites",
  "favorites:read": "favorites", "favorites:write": "favorites",
  "read:portfolio": "portfolio", "write:portfolio": "portfolio",
  "manage:groups": "management", "manage:events": "management",
  "manage:checkins": "management", "manage:badges": "management",
  admin: "admin",
  offline_access: "offline",
};

const GROUP_DISPLAY_ORDER = [
  "identity", "profile", "events", "groups", "favorites", "portfolio", "management", "admin", "offline",
];

interface GroupDisplay {
  key: string;
  label: string;
  icon: string;
  description: string;
  order: number;
}

function getGroupDisplay(
  groupKey: string,
  scopes: Set<string>,
): { label: string; icon: string; description: string } | null {
  switch (groupKey) {
    case "identity":
      return { label: "Identity", icon: "id", description: "Verify your identity and receive an ID token" };
    case "profile": {
      const hasFullUser = scopes.has("user") || scopes.has("profile");
      const hasEmail = scopes.has("user:email");
      const hasReadUser = scopes.has("read:user");
      if (hasFullUser)
        return { label: "Your Profile", icon: "user", description: "Read and update your profile, email, and avatar" };
      if (hasReadUser && hasEmail)
        return { label: "Your Profile", icon: "user", description: "View your profile information and email address" };
      if (hasReadUser)
        return { label: "Your Profile", icon: "user", description: "View your public profile information" };
      if (hasEmail)
        return { label: "Email Address", icon: "email", description: "View your email address" };
      return { label: "Your Profile", icon: "user", description: "View your profile information" };
    }
    case "events": {
      const hasWrite = scopes.has("write:events") || scopes.has("rsvp:write");
      if (hasWrite)
        return { label: "Events", icon: "calendar", description: "View events and RSVP or check in on your behalf" };
      return { label: "Events", icon: "calendar", description: "View upcoming events and event details" };
    }
    case "groups":
      return { label: "Groups", icon: "users", description: "View tech groups and community details" };
    case "favorites": {
      const hasWrite = scopes.has("write:favorites") || scopes.has("favorites:write");
      if (hasWrite)
        return { label: "Favorites", icon: "heart", description: "View and manage your favorite groups" };
      return { label: "Favorites", icon: "heart", description: "See which groups you've favorited" };
    }
    case "portfolio": {
      const hasWrite = scopes.has("write:portfolio");
      if (hasWrite)
        return { label: "Portfolio", icon: "briefcase", description: "View and manage your portfolio items and projects" };
      return { label: "Portfolio", icon: "briefcase", description: "View your portfolio items and projects" };
    }
    case "management": {
      const capabilities: string[] = [];
      if (scopes.has("manage:groups")) capabilities.push("groups");
      if (scopes.has("manage:events")) capabilities.push("events");
      if (scopes.has("manage:checkins")) capabilities.push("check-ins");
      if (scopes.has("manage:badges")) capabilities.push("badges");
      const capStr = capabilities.length > 1
        ? capabilities.slice(0, -1).join(", ") + ", and " + capabilities[capabilities.length - 1]
        : capabilities[0] || "resources";
      return { label: "Group Management", icon: "settings", description: `Create and manage ${capStr} in groups you own or co-manage` };
    }
    case "admin":
      return { label: "Administration", icon: "shield", description: "Full administrative access to the Tampa.dev platform" };
    case "offline":
      return { label: "Background Access", icon: "refresh", description: "Stay signed in and access your data in the background" };
    default:
      return null;
  }
}

function groupRequestedScopes(scopes: string[]): GroupDisplay[] {
  const grouped = new Map<string, Set<string>>();

  for (const scope of scopes) {
    const groupKey = SCOPE_TO_GROUP[scope];
    if (!groupKey) continue;
    if (!grouped.has(groupKey)) grouped.set(groupKey, new Set());
    grouped.get(groupKey)!.add(scope);
  }

  const result: GroupDisplay[] = [];

  for (const [groupKey, scopeSet] of grouped) {
    const order = GROUP_DISPLAY_ORDER.indexOf(groupKey);
    const display = getGroupDisplay(groupKey, scopeSet);
    if (display) {
      result.push({ ...display, key: groupKey, order: order >= 0 ? order : 99 });
    }
  }

  result.sort((a, b) => a.order - b.order);
  return result;
}

interface OAuthRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope?: string[];
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
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
  // OIDC nonce parameter (captured from raw URL, not parseAuthRequest)
  const nonce = url.searchParams.get("nonce");
  // Standard OAuth prompt parameter: 'consent' forces the consent screen
  const prompt = url.searchParams.get("prompt");

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
      existingGrant?: { scopes: string[] };
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

    // Filter out scopes the user isn't eligible to grant.
    // The backend enforces this too (filterScopesForUser in src/lib/scopes.ts) —
    // this is purely for UX so users don't see permissions they cannot grant.
    //
    // SYNC NOTE: This must stay in sync with ADMIN_ONLY_SCOPES in
    // src/lib/scopes.ts. We inline it because the web app can't import
    // from src/. If new role-gated scopes are added there, update here too.
    const rawScopes = scope?.split(" ") || ["profile"];
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const requestedScopes = isAdmin
      ? rawScopes
      : rawScopes.filter((s) => s !== "admin");

    // Skip consent for returning users:
    // If user has already authorized this app with the same or broader scopes,
    // auto-approve (unless prompt=consent forces the consent screen).
    if (
      parseData.existingGrant &&
      parseData.oauthRequest &&
      prompt !== "consent"
    ) {
      const existingScopes = new Set(parseData.existingGrant.scopes);
      const allScopesCovered = requestedScopes.every((s) => existingScopes.has(s));

      if (allScopesCovered) {
        // Auto-approve: call the complete endpoint directly
        // Inject nonce from the raw URL into the oauthRequest (parseAuthRequest strips it)
        const oauthReqWithNonce = nonce
          ? { ...parseData.oauthRequest, nonce }
          : parseData.oauthRequest;
        const completeResponse = await fetch(`${apiUrl}/oauth/internal/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({
            oauthRequest: oauthReqWithNonce,
            userId: user.id,
            approvedScopes: requestedScopes,
          }),
        });

        const completeData = await completeResponse.json() as {
          success: boolean;
          redirectTo?: string;
          error?: string;
        };

        if (completeData.success && completeData.redirectTo) {
          return redirect(completeData.redirectTo);
        }
        // If auto-approve failed, fall through to show consent screen
      }
    }

    // Inject nonce from the raw URL into the oauthRequest (parseAuthRequest strips it)
    const oauthRequestWithNonce = nonce
      ? { ...parseData.oauthRequest, nonce }
      : parseData.oauthRequest;

    return {
      error: null,
      user,
      oauthRequest: oauthRequestWithNonce,
      client: parseData.client,
      requestedScopes,
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

function PermissionIcon({ icon }: { icon: string }) {
  const icons: Record<string, ReactNode> = {
    id: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
      </svg>
    ),
    user: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
    heart: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    briefcase: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m10 0H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    refresh: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  };

  return icons[icon] || icons.user;
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
        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl font-bold text-white">
            Tampa<span className="text-coral">.dev</span>
          </h1>
          <p className="text-white/60 text-base mt-2">Sign in with Tampa.dev</p>
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
              {groupRequestedScopes(scopes).map((group) => (
                <li key={group.key} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-coral/10 text-coral flex items-center justify-center">
                    <PermissionIcon icon={group.icon} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {group.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {group.description}
                    </p>
                  </div>
                </li>
              ))}
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
          You can revoke access at any time from your{" "}
          <a href="/profile?tab=accounts" className="text-white/60 hover:text-white underline">
            account settings
          </a>
        </p>
      </div>
    </div>
  );
}
