/**
 * Profile Developer Tab
 *
 * API tokens management and links to developer portal/documentation.
 */

import { useFetcher, useOutletContext, Link } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/profile.developer";
import type { ApiTokenInfo, ProfileContext } from "~/lib/profile-types";
import { SCOPE_LABELS } from "~/lib/profile-types";
import { fetchCurrentUser } from "~/lib/admin-api.server";

const PAT_SCOPES = [
  { value: "read:user", label: "Read profile" },
  { value: "user", label: "Read/write profile" },
  { value: "user:email", label: "Read email" },
  { value: "read:events", label: "Read events" },
  { value: "read:groups", label: "Read groups" },
  { value: "read:favorites", label: "Read favorites" },
  { value: "write:favorites", label: "Write favorites" },
  { value: "read:portfolio", label: "Read portfolio" },
  { value: "write:portfolio", label: "Write portfolio" },
  { value: "manage:groups", label: "Manage groups" },
  { value: "manage:events", label: "Manage events" },
  { value: "manage:checkins", label: "Manage checkins" },
  { value: "manage:badges", label: "Manage badges" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) return { apiTokens: [] };

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  const response = await fetch(`${apiUrl}/profile/tokens`, { headers });
  let apiTokens: ApiTokenInfo[] = [];
  if (response.ok) {
    const json = await response.json() as { data: ApiTokenInfo[] };
    apiTokens = json.data || [];
  }

  return { apiTokens };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "createToken") {
    const name = formData.get("tokenName") as string;
    const scopesRaw = formData.get("tokenScopes") as string;
    const scopes = scopesRaw ? scopesRaw.split(",").filter(Boolean) : [];

    try {
      const response = await fetch(`${apiUrl}/profile/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ name, scopes }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to create token" };
      }

      const json = await response.json() as { data: { token: string; id: string } };
      return { success: true, tokenCreated: true, newToken: json.data.token };
    } catch (error) {
      console.error("Failed to create token:", error);
      return { success: false, error: "Failed to create token" };
    }
  }

  if (intent === "revokeToken") {
    const tokenId = formData.get("tokenId") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/tokens/${encodeURIComponent(tokenId)}`, {
        method: "DELETE",
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to revoke token" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to revoke token:", error);
      return { success: false, error: "Failed to revoke token" };
    }
  }

  return { success: false };
}

function ApiTokenCard({ token }: { token: ApiTokenInfo }) {
  const fetcher = useFetcher();
  const isRevoking = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {token.name}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 font-mono">
            {token.tokenPrefix}...
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {token.scopes.map((scope) => (
              <span
                key={scope}
                className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {SCOPE_LABELS[scope] || scope}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Created {new Date(token.createdAt).toLocaleDateString()}</span>
            {token.lastUsedAt && (
              <span>Last used {new Date(token.lastUsedAt).toLocaleDateString()}</span>
            )}
            {token.expiresAt && (
              <span>
                {new Date(token.expiresAt) < new Date()
                  ? "Expired"
                  : `Expires ${new Date(token.expiresAt).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(`Revoke token "${token.name}"? Any applications using this token will lose access.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="revokeToken" />
          <input type="hidden" name="tokenId" value={token.id} />
          <button
            type="submit"
            disabled={isRevoking}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isRevoking ? "Revoking..." : "Revoke"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

function ApiTokensSection({ tokens, userRole }: { tokens: ApiTokenInfo[]; userRole: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:user", "read:events", "read:groups"]);
  const fetcher = useFetcher();
  const isCreating = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; tokenCreated?: boolean; newToken?: string; error?: string } | undefined;

  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const availableScopes = isAdmin
    ? [...PAT_SCOPES, { value: "admin", label: "Admin access" }]
    : PAT_SCOPES;

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          API Tokens
        </h2>
        {!showForm && !actionData?.newToken && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Token
          </button>
        )}
      </div>

      {actionData?.newToken && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
            Token created. Copy it now - you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white break-all">
              {actionData.newToken}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(actionData.newToken!)}
              className="shrink-0 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="createToken" />
            <input type="hidden" name="tokenScopes" value={selectedScopes.join(",")} />
            <div>
              <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token Name
              </label>
              <input
                id="token-name"
                name="tokenName"
                type="text"
                required
                maxLength={100}
                placeholder="e.g. CI/CD Pipeline"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scopes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${selectedScopes.includes(scope.value)
                      ? "border-coral bg-coral/10 text-coral"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="sr-only"
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isCreating || selectedScopes.length === 0}
                className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Token"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}

      {tokens.length > 0 ? (
        <div className="space-y-3">
          {tokens.map((token) => (
            <ApiTokenCard key={token.id} token={token} />
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personal access tokens let you authenticate with the API. Create one to get started.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export default function DeveloperTab({ loaderData }: Route.ComponentProps) {
  const { user } = useOutletContext<ProfileContext>();

  return (
    <div className="mt-2">
      <ApiTokensSection tokens={loaderData.apiTokens} userRole={user.role} />
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          to="/developer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-coral hover:text-coral transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Developer Portal
        </Link>
        <Link
          to="/developer/docs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-coral hover:text-coral transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          API Documentation
        </Link>
      </div>
    </div>
  );
}
