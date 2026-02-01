/**
 * Public Login Page
 *
 * Multi-provider OAuth login for all users.
 * Available at tampa.dev/login
 *
 * Dynamically renders sign-in buttons based on which providers
 * have credentials configured on the API.
 */

import { Link, useSearchParams, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/login";
import { fetchCurrentUser, fetchAuthProviders } from "~/lib/admin-api.server";
import { generateMetaTags } from "~/lib/seo";

export const meta: Route.MetaFunction = () => generateMetaTags({
  title: "Sign In",
  description: "Sign in to Tampa.dev to access your favorites, RSVPs, and more.",
  url: "/login",
});

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (user) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo");
    return redirect(returnTo || "/");
  }

  const providers = await fetchAuthProviders();

  return { providers };
}

const errorMessages: Record<string, string> = {
  invalid_state: "Authentication failed. Please try again.",
  no_code: "No authorization code received.",
  not_configured: "This sign-in method is not configured.",
  token_exchange_failed: "Failed to complete sign-in. Please try again.",
  no_email: "Could not get your email. Please ensure your email is visible on your account.",
  user_creation_failed: "Failed to create your account. Please try again.",
  oauth_failed: "Sign-in failed. Please try again.",
  session_required: "You must be signed in to link accounts.",
  unauthorized_link: "Could not link account. Please try again.",
  identity_already_linked: "This account is already linked to another user.",
};

/** SVG icons for each provider */
export function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "github":
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      );
    case "google":
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "slack":
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z" />
          <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z" />
          <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312z" />
          <path fill="#ECB22E" d="M15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
        </svg>
      );
    case "meetup":
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.98 11.16c.24-.67.17-1.42-.23-2.01-.49-.72-1.44-.95-2.17-.6l-.12.07c-.63.39-.9 1.15-.66 1.83.25.72.95 1.16 1.68 1.12.49-.03.94-.3 1.2-.7.08-.13.15-.27.2-.41l.1-.3zm10.98 3.79c-.48-.18-1.01.03-1.24.49-.35.7-.93 1.24-1.64 1.54-.76.32-1.62.3-2.36-.04-.83-.38-1.42-1.14-1.6-2.03-.08-.39-.07-.8.03-1.19.16-.63.54-1.17 1.06-1.54.43-.3.96-.47 1.48-.47.28 0 .57.05.84.14.83.29 1.47.97 1.73 1.82.06.19.27.29.46.23.19-.06.3-.27.23-.46-.33-1.08-1.14-1.93-2.18-2.3-.34-.12-.7-.19-1.06-.2-.66-.02-1.32.16-1.88.54-.67.45-1.14 1.13-1.33 1.93-.13.49-.14 1.01-.03 1.51.23 1.12 1 2.07 2.05 2.55.58.27 1.2.39 1.82.37.59-.03 1.16-.18 1.68-.46.89-.47 1.57-1.24 1.92-2.17.12-.31-.03-.66-.34-.78h-.01zM12.06 2C6.5 2 2 6.5 2 12.06c0 5.55 4.5 10.06 10.06 10.06 5.55 0 10.06-4.5 10.06-10.06C22.12 6.5 17.62 2 12.06 2zm5.6 14.63c-.5.87-1.32 1.5-2.27 1.77-.3.09-.62.13-.93.13-.47 0-.93-.1-1.36-.29-.72-.33-1.29-.89-1.6-1.6-.08-.18-.14-.37-.19-.56-.27.17-.56.3-.87.39-.38.12-.78.17-1.18.14-.81-.06-1.56-.42-2.12-1-.49-.52-.8-1.19-.87-1.9-.04-.38-.01-.76.08-1.13-.39-.11-.74-.31-1.04-.58-.53-.47-.83-1.14-.83-1.84 0-.42.11-.83.32-1.19.36-.62.96-1.06 1.65-1.19.31-.06.63-.05.94.03-.02-.07-.03-.14-.05-.21-.14-.63-.05-1.3.26-1.86.38-.68 1.03-1.15 1.78-1.28.31-.06.63-.05.93.03.48.12.9.4 1.2.79.37.47.53 1.07.45 1.65-.05.36-.17.7-.37 1 .17-.04.35-.06.53-.06.59 0 1.15.2 1.6.57.56.46.9 1.13.94 1.85.02.3-.02.61-.11.9.31-.08.64-.1.96-.06.82.1 1.55.54 2.02 1.19.4.55.58 1.23.52 1.91-.06.62-.32 1.2-.72 1.66z" />
        </svg>
      );
    case "eventbrite":
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.079 14.766c-.408 1.637-1.842 2.844-3.553 2.844-1.376 0-2.576-.755-3.207-1.876l7.689-1.962c.048-.193.071-.394.071-.6 0-2.761-2.238-4.999-5-4.999S6.08 10.41 6.08 13.172c0 2.762 2.238 5 5 5 2.252 0 4.156-1.49 4.781-3.54l-.782-.866zm-3.553-4.593c1.637 0 3.025.994 3.624 2.41l-6.657 1.698c-.036-.193-.054-.391-.054-.593 0-1.941 1.383-3.515 3.087-3.515z" />
        </svg>
      );
    case "apple":
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.18 4.36 9.97 8.71 9.72c1.26.07 2.14.73 2.88.73.74 0 2.13-.9 3.59-.77.61.03 2.33.25 3.43 1.87-3.17 1.88-2.37 6.07.88 7.24-.67 1.76-1.53 3.5-2.44 4.49zM12.03 9.64c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

export const providerStyles: Record<string, string> = {
  github: "bg-white text-gray-900 hover:bg-gray-100",
  google: "bg-white text-gray-900 hover:bg-gray-100",
  linkedin: "bg-[#0A66C2] text-white hover:bg-[#004182]",
  slack: "bg-[#4A154B] text-white hover:bg-[#3a1039]",
  meetup: "bg-[#ED1C40] text-white hover:bg-[#c4162f]",
  eventbrite: "bg-[#F05537] text-white hover:bg-[#d44429]",
  apple: "bg-black text-white hover:bg-gray-900",
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const { providers } = useLoaderData<typeof loader>();
  const error = searchParams.get("error");
  const returnTo = searchParams.get("returnTo");

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-4xl font-bold text-white">
              Tampa<span className="text-coral">.dev</span>
            </span>
          </Link>
          <p className="mt-4 text-white/60">
            Your gateway to Tampa Bay's tech community
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm text-center">
              {errorMessages[error] || "An error occurred. Please try again."}
            </p>
          </div>
        )}

        {/* Login card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Welcome Back 👋
          </h1>
          <p className="text-white/60 text-center mb-8">
            Sign in to access your favorites, RSVPs, and more
          </p>

          <div className="space-y-3">
            {providers.map((p) => {
              const authUrl = returnTo
                ? `${p.authUrl}?returnTo=${encodeURIComponent(returnTo)}`
                : p.authUrl;

              return (
                <a
                  key={p.provider}
                  href={authUrl}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-colors ${providerStyles[p.provider] || "bg-white text-gray-900 hover:bg-gray-100"
                    }`}
                >
                  <ProviderIcon provider={p.provider} />
                  Continue with {p.name}
                </a>
              );
            })}
          </div>

          <p className="mt-6 text-center text-sm text-white/40">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-coral hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-coral hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Save Favorites</p>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/60">RSVP Events</p>
          </div>
          <div className="p-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-coral/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Get Updates</p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-white/40 hover:text-coral transition-colors"
          >
            &larr; Back to events
          </Link>
        </div>
      </div>
    </div>
  );
}
