/**
 * Group Badge Management Page
 *
 * Allows group owners and managers to create, edit, delete badges,
 * and generate claim links for their group.
 */

import { useState } from "react";
import { useFetcher, useOutletContext, data } from "react-router";
import type { Route } from "./+types/groups.$slug.manage.badges";
import {
  fetchManagedGroup,
  fetchBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  generateBadgeClaimLink,
} from "~/lib/group-manage-api.server";
import type {
  ManagedGroup,
  GroupBadge,
  GroupPermissions,
} from "~/lib/group-manage-api.server";
import { Emoji } from "~/components/Emoji";

// ---------- Color presets ----------

const COLOR_PRESETS = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#22C55E" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#A855F7" },
  { name: "Pink", value: "#EC4899" },
] as const;

// ---------- Loader ----------

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  // Resolve group ID from public slug endpoint
  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  const [group, badges] = await Promise.all([
    fetchManagedGroup(groupId, cookieHeader),
    fetchBadges(groupId, cookieHeader),
  ]);

  return { group, badges, groupId };
}

// ---------- Action ----------

export async function action({ params, request }: Route.ActionArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Resolve group ID
  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  if (intent === "createBadge") {
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    const icon = (formData.get("icon") as string) || undefined;
    const color = (formData.get("color") as string) || undefined;
    const points = Number(formData.get("points") || "0");

    try {
      await createBadge(groupId, { name, description, icon, color, points }, cookieHeader);
      return { success: true, intent: "createBadge" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create badge",
      };
    }
  }

  if (intent === "updateBadge") {
    const badgeId = formData.get("badgeId") as string;
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || undefined;
    const icon = (formData.get("icon") as string) || undefined;
    const color = (formData.get("color") as string) || undefined;
    const points = Number(formData.get("points") || "0");

    try {
      await updateBadge(groupId, badgeId, { name, description, icon, color, points }, cookieHeader);
      return { success: true, intent: "updateBadge" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update badge",
      };
    }
  }

  if (intent === "deleteBadge") {
    const badgeId = formData.get("badgeId") as string;
    try {
      await deleteBadge(groupId, badgeId, cookieHeader);
      return { success: true, intent: "deleteBadge" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete badge",
      };
    }
  }

  if (intent === "generateClaimLink") {
    const badgeId = formData.get("badgeId") as string;
    const maxUsesRaw = formData.get("maxUses") as string;
    const expiresAt = formData.get("expiresAt") as string;

    const options: { maxUses?: number; expiresAt?: string } = {};
    if (maxUsesRaw) options.maxUses = Number(maxUsesRaw);
    if (expiresAt) options.expiresAt = expiresAt;

    try {
      const claimLink = await generateBadgeClaimLink(groupId, badgeId, options, cookieHeader);
      return { success: true, intent: "generateClaimLink", claimLink };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate claim link",
      };
    }
  }

  return { success: false, error: "Unknown action" };
}

// ---------- Badge Create / Edit Form ----------

function BadgeForm({
  badge,
  maxBadgePoints,
  onCancel,
}: {
  badge?: GroupBadge;
  maxBadgePoints: number;
  onCancel: () => void;
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;

  const [selectedColor, setSelectedColor] = useState(badge?.color || COLOR_PRESETS[4].value);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {badge ? "Edit Badge" : "Create Badge"}
      </h3>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value={badge ? "updateBadge" : "createBadge"} />
        {badge && <input type="hidden" name="badgeId" value={badge.id} />}

        {/* Name */}
        <div>
          <label
            htmlFor="badge-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="badge-name"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={badge?.name || ""}
            placeholder="e.g. Event Champion"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="badge-desc"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="badge-desc"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={badge?.description || ""}
            placeholder="A short description of what this badge represents"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Icon */}
          <div>
            <label
              htmlFor="badge-icon"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Icon (emoji)
            </label>
            <input
              id="badge-icon"
              name="icon"
              type="text"
              defaultValue={badge?.icon || ""}
              placeholder="e.g. ⭐"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <input type="hidden" name="color" value={selectedColor} />
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSelectedColor(preset.value)}
                  title={preset.name}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    selectedColor === preset.value
                      ? "border-gray-900 dark:border-white scale-110"
                      : "border-transparent hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <label
              htmlFor="badge-points"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Points
            </label>
            <input
              id="badge-points"
              name="points"
              type="number"
              min={1}
              max={maxBadgePoints}
              defaultValue={badge?.points ?? 10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              max {maxBadgePoints} per badge
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : badge ? "Update Badge" : "Create Badge"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

// ---------- Claim Link Generator ----------

function ClaimLinkGenerator({ badgeId }: { badgeId: string }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as {
    success?: boolean;
    intent?: string;
    error?: string;
    claimLink?: { code: string };
  } | undefined;

  const [showForm, setShowForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const generatedCode =
    actionData?.success && actionData.intent === "generateClaimLink"
      ? actionData.claimLink?.code
      : null;

  const claimUrl = generatedCode
    ? `https://events.tampa.dev/claim/${generatedCode}`
    : null;

  const handleCopy = async () => {
    if (!claimUrl) return;
    try {
      await navigator.clipboard.writeText(claimUrl);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback silently
    }
  };

  if (generatedCode && claimUrl) {
    return (
      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
          Claim link generated!
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded truncate">
            {claimUrl}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {copiedCode ? "Copied!" : "Copy"}
          </button>
        </div>
        <button
          onClick={() => setShowForm(false)}
          className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
        >
          Close
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-coral hover:text-coral-dark dark:text-coral-light dark:hover:text-coral transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        Generate Claim Code
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      {actionData?.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-3">
        <input type="hidden" name="intent" value="generateClaimLink" />
        <input type="hidden" name="badgeId" value={badgeId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`claim-max-${badgeId}`}
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Max Uses (optional)
            </label>
            <input
              id={`claim-max-${badgeId}`}
              name="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
          <div>
            <label
              htmlFor={`claim-expires-${badgeId}`}
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Expires At (optional)
            </label>
            <input
              id={`claim-expires-${badgeId}`}
              name="expiresAt"
              type="datetime-local"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1.5 text-sm bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Generating..." : "Generate Link"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

// ---------- Badge Card ----------

function BadgeCard({
  badge,
  isOwner,
  onEdit,
}: {
  badge: GroupBadge;
  isOwner: boolean;
  onEdit: () => void;
}) {
  const deleteFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: badge.color ? `${badge.color}20` : "#3B82F620" }}
          >
            <Emoji emoji={badge.icon || "\u{1F396}\u{FE0F}"} size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {badge.name}
              </h3>
              {badge.color && (
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/50"
                  style={{ backgroundColor: badge.color }}
                  title={badge.color}
                />
              )}
            </div>
            {badge.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                {badge.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {badge.points > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              {badge.points} XP
            </span>
          )}
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: badge.color ? `${badge.color}20` : "#3B82F620",
              color: badge.color || "#3B82F6",
            }}
          >
            {badge.userCount} user{badge.userCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Preview pill */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: badge.color || "#3B82F6" }}
        >
          <Emoji emoji={badge.icon || "\u{1F396}\u{FE0F}"} size={14} /> {badge.name}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          awarded to {badge.userCount} user{badge.userCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Edit
        </button>

        {isOwner && (
          <deleteFetcher.Form
            method="post"
            onSubmit={(e) => {
              if (
                !confirm(
                  `Delete badge "${badge.name}"? This will remove it from all users who have it.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="deleteBadge" />
            <input type="hidden" name="badgeId" value={badge.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </deleteFetcher.Form>
        )}
      </div>

      {/* Claim link generator */}
      <ClaimLinkGenerator badgeId={badge.id} />
    </div>
  );
}

// ---------- Main Component ----------

export default function GroupManageBadgesPage({ loaderData }: Route.ComponentProps) {
  const { group, badges } = loaderData;
  const context = useOutletContext<{ group: ManagedGroup; permissions: GroupPermissions }>();
  const permissions = context?.permissions ?? group.permissions;
  const isOwner = group.userRole === "owner";

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<GroupBadge | undefined>();

  const maxBadges = group.maxBadges;
  const maxBadgePoints = group.maxBadgePoints;
  const atLimit = badges.length >= maxBadges;

  const handleEdit = (badge: GroupBadge) => {
    setEditingBadge(badge);
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingBadge(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Badges</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {badges.length} / {maxBadges} badges
          </p>
        </div>

        {!showCreateForm && (
          <button
            onClick={() => {
              setEditingBadge(undefined);
              setShowCreateForm(true);
            }}
            disabled={atLimit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Badge
          </button>
        )}
      </div>

      {/* Limit warning */}
      {atLimit && !showCreateForm && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Badge limit reached
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                You have reached the maximum of {maxBadges} badges for your group. Delete an
                existing badge to create a new one.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {showCreateForm && (
        <div className="mb-6">
          <BadgeForm
            badge={editingBadge}
            maxBadgePoints={maxBadgePoints}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Badge list */}
      {badges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              isOwner={isOwner}
              onEdit={() => handleEdit(badge)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">No badges yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your first badge to recognize and reward group members.
          </p>
        </div>
      )}
    </div>
  );
}
