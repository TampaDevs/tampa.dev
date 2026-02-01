/**
 * Link Account Page
 *
 * Handles linking an identity provider to an existing Tampa.dev account.
 * External apps (e.g., Slack bot) send users to /link/{provider}?redirectTo={url}
 *
 * States:
 * 1. Not logged in → redirect to /login with returnTo back here
 * 2. Logged in, not linked → show link prompt with provider button
 * 3. Already linked → show "already linked" with continue button
 * 4. Just linked (?linked=1) → show success with auto-redirect countdown
 */

import { Link, redirect, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/link.$provider";
import {
  fetchCurrentUser,
  fetchAuthProviders,
  type AuthIdentity,
} from "~/lib/admin-api.server";
import { ProviderIcon, providerStyles } from "./login";

const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  linkedin: "LinkedIn",
  slack: "Slack",
  meetup: "Meetup",
  eventbrite: "Eventbrite",
  apple: "Apple",
};

export const meta: Route.MetaFunction = ({ params }) => {
  const providerName = PROVIDER_NAMES[params.provider!] || params.provider;
  return [
    { title: `Link ${providerName} | Tampa.dev` },
    {
      name: "description",
      content: `Link your ${providerName} account to Tampa.dev`,
    },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const provider = params.provider!;
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo") || "";
  const linked = url.searchParams.get("linked") === "1";

  // Validate provider against configured list
  const providers = await fetchAuthProviders();
  const providerConfig = providers.find((p) => p.provider === provider);

  if (!providerConfig) {
    throw new Response("Provider not found", { status: 404 });
  }

  // Check authentication
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    const currentPath = `/link/${provider}${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
    throw redirect(`/login?returnTo=${encodeURIComponent(currentPath)}`);
  }

  // Check if provider is already linked
  const existingIdentity =
    user.identities?.find((i) => i.provider === provider) || null;

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    provider,
    providerName: providerConfig.name,
    providerAuthUrl: providerConfig.authUrl,
    existingIdentity,
    redirectTo,
    linked,
  };
}

export default function LinkProviderPage({
  loaderData,
}: Route.ComponentProps) {
  const {
    provider,
    providerName,
    existingIdentity,
    linked,
  } = loaderData;
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  const displayName = PROVIDER_NAMES[provider] || providerName;

  if (linked || existingIdentity) {
    return (
      <LinkSuccessView
        {...loaderData}
        displayName={displayName}
        justLinked={linked}
      />
    );
  }

  return (
    <LinkPromptView
      {...loaderData}
      displayName={displayName}
      error={error}
    />
  );
}

function LinkSuccessView({
  provider,
  displayName,
  existingIdentity,
  justLinked,
  redirectTo,
}: {
  provider: string;
  displayName: string;
  existingIdentity: AuthIdentity | null;
  justLinked: boolean;
  redirectTo: string;
}) {
  const finalRedirect = redirectTo || "/profile";
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!justLinked) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = finalRedirect;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [justLinked, finalRedirect]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-4xl font-bold text-white">
              Tampa<span className="text-coral">.dev</span>
            </span>
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
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
          </div>

          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-white/10 flex items-center justify-center text-white">
            <ProviderIcon provider={provider} />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {justLinked
              ? `${displayName} Successfully Linked!`
              : `${displayName} Already Linked`}
          </h1>

          {existingIdentity && (
            <p className="text-white/60 mb-2">
              {existingIdentity.username
                ? `Connected as @${existingIdentity.username}`
                : existingIdentity.email
                  ? `Connected as ${existingIdentity.email}`
                  : "Account connected"}
            </p>
          )}

          {justLinked && countdown > 0 && (
            <p className="text-white/40 text-sm mb-6">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
          )}

          {finalRedirect !== "/profile" && (
            <p className="text-white/30 text-xs mb-4 break-all">
              Redirecting to: {finalRedirect}
            </p>
          )}

          <a
            href={finalRedirect}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral-dark transition-colors"
          >
            Continue
          </a>
        </div>

        <div className="text-center">
          <Link
            to="/profile"
            className="text-sm text-white/40 hover:text-coral transition-colors"
          >
            Go to profile
          </Link>
        </div>
      </div>
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  session_required: "You must be signed in to link accounts.",
  unauthorized_link: "Could not link account. Please try again.",
  identity_already_linked: "This account is already linked to another user.",
  link_failed: "Failed to link account. Please try again.",
  oauth_failed: "Sign-in failed. Please try again.",
};

function LinkPromptView({
  userId,
  userName,
  userEmail,
  provider,
  displayName,
  providerAuthUrl,
  redirectTo,
  error,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
  provider: string;
  displayName: string;
  providerAuthUrl: string;
  redirectTo: string;
  error: string | null;
}) {
  // Build returnTo for after OAuth completes — back to this page with linked=1
  const returnToAfterLink = `/link/${provider}?linked=1${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;
  const authUrl = `${providerAuthUrl}?linkUserId=${userId}&returnTo=${encodeURIComponent(returnToAfterLink)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-4xl font-bold text-white">
              Tampa<span className="text-coral">.dev</span>
            </span>
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm text-center">
              {ERROR_MESSAGES[error] || "An error occurred. Please try again."}
            </p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <ProviderIcon provider={provider} />
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Link your {displayName} account
          </h1>
          <p className="text-white/60 text-center mb-2">
            Connect your {displayName} account to your Tampa.dev profile to
            unlock integrations and verify your identity.
          </p>
          <p className="text-white/40 text-center text-sm mb-8">
            Signed in as {userName || userEmail}
          </p>

          <a
            href={authUrl}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-colors ${
              providerStyles[provider] ||
              "bg-white text-gray-900 hover:bg-gray-100"
            }`}
          >
            <ProviderIcon provider={provider} />
            Link {displayName}
          </a>

          {redirectTo && (
            <p className="mt-4 text-white/30 text-xs text-center break-all">
              After linking, you will be redirected to: {redirectTo}
            </p>
          )}
        </div>

        <div className="text-center">
          <Link
            to="/profile"
            className="text-sm text-white/40 hover:text-coral transition-colors"
          >
            Go to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
