/**
 * Profile Accounts Tab
 *
 * Connected accounts (identity providers) and authorized OAuth apps.
 */

import { useFetcher, useOutletContext } from "react-router";
import type { Route } from "./+types/profile.accounts";
import type { OAuthGrant, ProfileContext } from "~/lib/profile-types";
import { SCOPE_LABELS } from "~/lib/profile-types";
import { fetchCurrentUser, fetchAuthProviders, type AuthIdentity, type AuthProvider } from "~/lib/admin-api.server";
import { ProviderIcon } from "./login";

const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  linkedin: "LinkedIn",
  slack: "Slack",
  meetup: "Meetup",
  eventbrite: "Eventbrite",
  apple: "Apple",
};

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);
  if (!user) return { grants: [], identities: [], availableProviders: [] };

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  const results = await Promise.allSettled([
    fetch(`${apiUrl}/oauth/internal/grants/${user.id}`, { headers }),
    fetchAuthProviders(),
  ]);

  let grants: OAuthGrant[] = [];
  if (results[0].status === "fulfilled" && results[0].value.ok) {
    const data = await results[0].value.json() as { grants: OAuthGrant[] };
    grants = data.grants || [];
  }

  const providers: AuthProvider[] = results[1].status === "fulfilled" ? results[1].value : [];
  const identities: AuthIdentity[] = user.identities || [];

  return { grants, identities, availableProviders: providers };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "revoke") {
    const userId = formData.get("userId") as string;
    const grantId = formData.get("grantId") as string;

    try {
      const response = await fetch(`${apiUrl}/oauth/internal/grants/${userId}/${grantId}`, {
        method: "DELETE",
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      });

      if (!response.ok) throw new Error("Failed to revoke grant");
      return { success: true };
    } catch (error) {
      console.error("Failed to revoke grant:", error);
      return { success: false, error: "Failed to revoke access" };
    }
  }

  if (intent === "setPrimaryEmail") {
    const provider = formData.get("provider") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/primary-email`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to update email" };
      }

      return { success: true, emailUpdated: true };
    } catch (error) {
      console.error("Failed to set primary email:", error);
      return { success: false, error: "Failed to update email" };
    }
  }

  if (intent === "unlinkIdentity") {
    const provider = formData.get("provider") as string;

    try {
      const response = await fetch(`${apiUrl}/auth/identities/${encodeURIComponent(provider)}`, {
        method: "DELETE",
        headers: { ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to unlink account" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to unlink identity:", error);
      return { success: false, error: "Failed to unlink account" };
    }
  }

  return { success: false };
}

function GrantCard({ grant, userId }: { grant: OAuthGrant; userId: string }) {
  const fetcher = useFetcher();
  const isRevoking = fetcher.state !== "idle";

  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        {grant.logoUri ? (
          <img
            src={grant.logoUri}
            alt={grant.clientName}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {grant.clientName}
            </h3>
            {grant.clientUri && (
              <a
                href={grant.clientUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-coral hover:underline"
              >
                {new URL(grant.clientUri).hostname}
              </a>
            )}
          </div>

          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (!confirm(`Revoke access for ${grant.clientName}? This app will no longer be able to access your Tampa.dev account.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="revoke" />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="grantId" value={grant.grantId} />
            <button
              type="submit"
              disabled={isRevoking}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </button>
          </fetcher.Form>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {grant.scopes.map((scope) => (
            <span
              key={scope}
              className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
            >
              {SCOPE_LABELS[scope] || scope}
            </span>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Authorized {new Date(grant.grantedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function ConnectedAccounts({
  identities,
  availableProviders,
  userId,
  currentEmail,
}: {
  identities: AuthIdentity[];
  availableProviders: AuthProvider[];
  userId: string;
  currentEmail: string;
}) {
  const fetcher = useFetcher();
  const emailFetcher = useFetcher();
  const isUnlinking = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;
  const emailActionData = emailFetcher.data as { success?: boolean; error?: string; emailUpdated?: boolean } | undefined;

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const unlinkableProviders = availableProviders.filter(
    (p) => !linkedProviders.has(p.provider)
  );

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Connected Accounts
      </h2>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Linked identities */}
        {identities.map((identity) => (
          <div
            key={identity.provider}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <ProviderIcon provider={identity.provider} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {PROVIDER_NAMES[identity.provider] || identity.provider}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {identity.username
                      ? `@${identity.username}`
                      : identity.email || "Connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Connected
                </span>
                {identities.length > 1 && (
                  <fetcher.Form
                    method="post"
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Unlink your ${PROVIDER_NAMES[identity.provider] || identity.provider} account?`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="intent" value="unlinkIdentity" />
                    <input type="hidden" name="provider" value={identity.provider} />
                    <button
                      type="submit"
                      disabled={isUnlinking}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Unlink
                    </button>
                  </fetcher.Form>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Primary email selector */}
        {(() => {
          const emailIdentities = identities.filter((i) => i.email);
          if (emailIdentities.length <= 1) return null;
          return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Email
              </p>
              {emailActionData?.emailUpdated && (
                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-400">Primary email updated.</p>
                </div>
              )}
              {emailActionData?.error && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-400">{emailActionData.error}</p>
                </div>
              )}
              <div className="space-y-1">
                {emailIdentities.map((identity) => {
                  const isCurrent = identity.email === currentEmail;
                  return (
                    <div key={identity.provider} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {identity.email}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                          ({PROVIDER_NAMES[identity.provider] || identity.provider})
                        </span>
                      </span>
                      {isCurrent ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Primary</span>
                      ) : (
                        <emailFetcher.Form method="post">
                          <input type="hidden" name="intent" value="setPrimaryEmail" />
                          <input type="hidden" name="provider" value={identity.provider} />
                          <button
                            type="submit"
                            className="text-xs text-coral hover:underline"
                          >
                            Set as primary
                          </button>
                        </emailFetcher.Form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Link new accounts */}
        {unlinkableProviders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Link Another Account
            </p>
            <div className="flex flex-wrap gap-2">
              {unlinkableProviders.map((provider) => (
                <a
                  key={provider.provider}
                  href={provider.authUrl}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <ProviderIcon provider={provider.provider} />
                  {PROVIDER_NAMES[provider.provider] || provider.provider}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AccountsTab({ loaderData }: Route.ComponentProps) {
  const { user } = useOutletContext<ProfileContext>();
  const { grants, identities, availableProviders } = loaderData;

  return (
    <>
      <ConnectedAccounts
        identities={identities}
        availableProviders={availableProviders}
        userId={user.id}
        currentEmail={user.email}
      />

      {/* Authorized Apps */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Authorized Apps
        </h2>

        {grants.length > 0 ? (
          <div className="space-y-3">
            {grants.map((grant) => (
              <GrantCard key={grant.grantId} grant={grant} userId={user.id} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              No authorized apps
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              When you authorize third-party apps to access your Tampa.dev account, they&apos;ll appear here.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
