/**
 * Admin Login Page
 *
 * Multi-provider OAuth login for admin access.
 */

import { Link, useSearchParams, useLoaderData } from "react-router";
import type { Route } from "./+types/admin.login";
import { fetchAuthProviders } from "~/lib/admin-api.server";
import { ProviderIcon, providerStyles } from "./login";

export const meta: Route.MetaFunction = () => [
  { title: "Login | Tampa.dev Admin" },
];

export async function loader() {
  const providers = await fetchAuthProviders();
  return { providers };
}

const errorMessages: Record<string, string> = {
  invalid_state: "Invalid OAuth state. Please try again.",
  no_code: "No authorization code received.",
  not_configured: "Sign-in is not configured.",
  token_exchange_failed: "Failed to complete sign-in.",
  no_email: "Could not get email from your account.",
  not_authorized: "You are not authorized to access the admin panel.",
  user_creation_failed: "Failed to create user account.",
  oauth_failed: "Authentication failed.",
};

export default function AdminLogin() {
  const [searchParams] = useSearchParams();
  const { providers } = useLoaderData<typeof loader>();
  const error = searchParams.get("error");
  const returnTo = searchParams.get("returnTo");

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
              ? "Sign in to continue."
              : "Sign in to access the admin panel."}
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
          <div className="space-y-3">
            {providers.map((p) => {
              const authUrl = returnTo
                ? `${p.authUrl}?returnTo=${encodeURIComponent(returnTo)}`
                : p.authUrl;

              return (
                <a
                  key={p.provider}
                  href={authUrl}
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    providerStyles[p.provider] || "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  }`}
                >
                  <ProviderIcon provider={p.provider} />
                  Continue with {p.name}
                </a>
              );
            })}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Only authorized users can access the admin panel.
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
