/**
 * Public Login Page
 *
 * GitHub OAuth login for all users.
 * Available at tampa.dev/login
 */

import { Link, useSearchParams, redirect } from "react-router";
import type { Route } from "./+types/login";
import { fetchCurrentUser } from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = () => [
  { title: "Sign In | Tampa.dev" },
  { name: "description", content: "Sign in to Tampa.dev with your GitHub account" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  // If already logged in, redirect to home or returnTo
  if (user) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo");
    return redirect(returnTo || "/");
  }

  return null;
}

const errorMessages: Record<string, string> = {
  invalid_state: "Authentication failed. Please try again.",
  no_code: "No authorization code received from GitHub.",
  not_configured: "GitHub sign-in is not configured.",
  token_exchange_failed: "Failed to complete sign-in with GitHub.",
  no_email: "Could not get your email from GitHub. Please ensure your email is visible.",
  user_creation_failed: "Failed to create your account. Please try again.",
  oauth_failed: "Sign-in failed. Please try again.",
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const returnTo = searchParams.get("returnTo");

  // Build GitHub auth URL with optional returnTo
  const githubAuthUrl = returnTo
    ? `/auth/github?returnTo=${encodeURIComponent(returnTo)}`
    : "/auth/github";

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
            Welcome Back
          </h1>
          <p className="text-white/60 text-center mb-8">
            Sign in to access your favorites, RSVPs, and more
          </p>

          <a
            href={githubAuthUrl}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Continue with GitHub
          </a>

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
