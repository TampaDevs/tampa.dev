/**
 * Admin User Detail Page
 *
 * Shows full user details with badge management, role management,
 * and feature flag overrides. Accessible by clicking a user row
 * in the admin users table.
 */

import { useLoaderData, useFetcher, Link, redirect } from "react-router";
import { Avatar } from "@tampadevs/react";
import type { Route } from "./+types/admin.users.$id";
import { Emoji } from "~/components/Emoji";
import { EmojiSelect } from "~/components/EmojiSelect";
import {
  fetchAdminUser,
  fetchBadges,
  fetchFlags,
  updateUserRole,
  deleteUser,
  awardBadge,
  revokeBadge,
  type AdminUser,
  type Badge,
  type FeatureFlag,
} from "~/lib/admin-api.server";
import { ProviderIcon } from "./login";

interface UserBadge extends Badge {
  awardedAt: string;
  userBadgeId: string;
}

interface FlagOverride {
  id: string;
  flagId: string;
  enabled: boolean;
  flagName: string;
  flagSlug: string;
}

interface UserDetail extends AdminUser {
  badges: UserBadge[];
  featureFlagOverrides: FlagOverride[];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const userId = params.id;

  const [user, allBadges, allFlags] = await Promise.all([
    fetchAdminUser(userId, cookieHeader),
    fetchBadges(cookieHeader),
    fetchFlags(cookieHeader),
  ]);

  if (!user) {
    throw redirect("/admin/users");
  }

  return {
    user: user as unknown as UserDetail,
    allBadges,
    allFlags,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const userId = params.id;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "updateRole") {
    const role = formData.get("role") as "user" | "admin" | "superadmin";
    await updateUserRole(userId, role, cookieHeader);
    return { success: true };
  }

  if (intent === "awardBadge") {
    const badgeId = formData.get("badgeId") as string;
    try {
      await awardBadge(userId, badgeId, cookieHeader);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to award badge" };
    }
  }

  if (intent === "revokeBadge") {
    const badgeId = formData.get("badgeId") as string;
    try {
      await revokeBadge(userId, badgeId, cookieHeader);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to revoke badge" };
    }
  }

  if (intent === "toggleFlag") {
    const flagId = formData.get("flagId") as string;
    const enabled = formData.get("enabled") === "true";
    const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

    try {
      const response = await fetch(
        `${apiUrl}/admin/flags/${encodeURIComponent(flagId)}/users/${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({ enabled }),
        }
      );
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        return { success: false, error: errorData.error || "Failed to toggle flag" };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to toggle flag" };
    }
  }

  if (intent === "removeFlag") {
    const flagId = formData.get("flagId") as string;
    const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

    try {
      await fetch(
        `${apiUrl}/admin/flags/${encodeURIComponent(flagId)}/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        }
      );
      return { success: true };
    } catch {
      return { success: false, error: "Failed to remove flag override" };
    }
  }

  if (intent === "delete") {
    await deleteUser(userId, cookieHeader);
    return redirect("/admin/users");
  }

  return { success: false };
}

const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  linkedin: "LinkedIn",
  slack: "Slack",
  meetup: "Meetup",
  eventbrite: "Eventbrite",
  apple: "Apple",
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    superadmin: "bg-coral/10 text-coral border-coral/20",
    admin: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    user: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[role] || colors.user}`}>
      {role}
    </span>
  );
}

export default function AdminUserDetailPage() {
  const { user, allBadges, allFlags } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;

  const awardedBadgeIds = new Set((user.badges || []).map((b) => b.id));
  const availableBadges = allBadges.filter((b) => !awardedBadgeIds.has(b.id));

  const overriddenFlagIds = new Set((user.featureFlagOverrides || []).map((f) => f.flagId));
  const availableFlags = allFlags.filter((f) => !overriddenFlagIds.has(f.id));

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/users"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Detail
        </h1>
      </div>

      {actionData?.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* User profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-6">
          <Avatar
            src={user.avatarUrl || undefined}
            name={user.name || user.email}
            size="lg"
            className="w-20 h-20"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name || "No name"}
              </h2>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
            {user.username && (
              <p className="text-sm text-coral mt-0.5">@{user.username}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Role management */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Change the user's access level</p>
            </div>
            <fetcher.Form method="post" className="inline">
              <input type="hidden" name="intent" value="updateRole" />
              <select
                name="role"
                defaultValue={user.role}
                onChange={(e) => e.target.form?.requestSubmit()}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </fetcher.Form>
          </div>
        </div>
      </div>

      {/* Connected providers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connected Accounts</h3>
        {user.identities.length > 0 ? (
          <div className="space-y-3">
            {user.identities.map((identity) => (
              <div key={identity.provider} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <ProviderIcon provider={identity.provider} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {PROVIDER_NAMES[identity.provider] || identity.provider}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {identity.username ? `@${identity.username}` : "Connected"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No connected accounts.</p>
        )}
      </div>

      {/* Badges */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Badges</h3>

        {/* Awarded badges */}
        {user.badges && user.badges.length > 0 ? (
          <div className="space-y-2 mb-4">
            {user.badges.map((badge) => (
              <div key={badge.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: badge.color }}
                  >
                    <Emoji emoji={badge.icon} size={18} />
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{badge.name}</p>
                    {badge.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(badge.awardedAt).toLocaleDateString()}
                  </span>
                  <fetcher.Form
                    method="post"
                    onSubmit={(e) => {
                      if (!confirm(`Revoke "${badge.name}" badge from this user?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="intent" value="revokeBadge" />
                    <input type="hidden" name="badgeId" value={badge.id} />
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Revoke
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No badges awarded.</p>
        )}

        {/* Award badge */}
        {availableBadges.length > 0 && (
          <fetcher.Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="awardBadge" />
            <EmojiSelect
              name="badgeId"
              defaultValue={availableBadges[0]?.id}
              placeholder="Select badge\u2026"
              className="flex-1 flex items-center gap-2 text-sm text-left border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              options={availableBadges.map((badge) => ({
                value: badge.id,
                label: badge.name,
                emoji: badge.icon,
              }))}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors"
            >
              Award
            </button>
          </fetcher.Form>
        )}
      </div>

      {/* Feature flag overrides */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feature Flag Overrides</h3>

        {user.featureFlagOverrides && user.featureFlagOverrides.length > 0 ? (
          <div className="space-y-2 mb-4">
            {user.featureFlagOverrides.map((override) => (
              <div key={override.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{override.flagName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{override.flagSlug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    override.enabled
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  }`}>
                    {override.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="toggleFlag" />
                    <input type="hidden" name="flagId" value={override.flagId} />
                    <input type="hidden" name="enabled" value={String(!override.enabled)} />
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      Toggle
                    </button>
                  </fetcher.Form>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="removeFlag" />
                    <input type="hidden" name="flagId" value={override.flagId} />
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Remove
                    </button>
                  </fetcher.Form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No feature flag overrides.</p>
        )}

        {/* Add flag override */}
        {availableFlags.length > 0 && (
          <fetcher.Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="toggleFlag" />
            <select
              name="flagId"
              className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {availableFlags.map((flag) => (
                <option key={flag.id} value={flag.id}>
                  {flag.name} ({flag.slug})
                </option>
              ))}
            </select>
            <select
              name="enabled"
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="true">Enable</option>
              <option value="false">Disable</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors"
            >
              Add Override
            </button>
          </fetcher.Form>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Delete User</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Permanently delete this user and all associated data.
            </p>
          </div>
          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (!confirm(`Are you sure you want to delete ${user.name || user.email}? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete User
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
