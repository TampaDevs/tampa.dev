/**
 * Admin Login Page
 *
 * GitHub OAuth login for admin access.
 */

import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/admin.login";

export const meta: Route.MetaFunction = () => [
  { title: "Login | Tampa.dev Admin" },
];

const errorMessages: Record<string, string> = {
  invalid_state: "Invalid OAuth state. Please try again.",
  no_code: "No authorization code received.",
  not_configured: "GitHub OAuth is not configured.",
  token_exchange_failed: "Failed to exchange token with GitHub.",
  no_email: "Could not get email from GitHub.",
  not_authorized: "You are not authorized to access the admin panel.",
  user_creation_failed: "Failed to create user account.",
  oauth_failed: "OAuth authentication failed.",
};

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const returnTo = searchParams.get("returnTo");

  // Build GitHub auth URL with optional returnTo
  const githubAuthUrl = returnTo
    ? `/auth/github?returnTo=${encodeURIComponent(returnTo)}`
    : "/auth/github";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              Tampa<span className="text-coral">.dev</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            {returnTo ? "Sign In" : "Admin Login"}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {returnTo
              ? "Sign in with your GitHub account to continue."
              : "Sign in with your GitHub account to access the admin panel."}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400 text-sm">
              {errorMessages[error] || "An error occurred. Please try again."}
            </p>
          </div>
        )}

        {/* Login card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <a
            href={githubAuthUrl}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Continue with GitHub
          </a>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Only authorized GitHub users can access the admin panel.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-coral"
          >
            &larr; Back to main site
          </Link>
        </div>
      </div>
    </div>
  );
}
