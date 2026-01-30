/**
 * Admin Badges Management Page
 *
 * Create, edit, and delete badges from the admin panel.
 */

import { useLoaderData, useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.badges";
import {
  fetchBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  type Badge,
} from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const badges = await fetchBadges(cookieHeader);
  return { badges };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "create") {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;
    const sortOrder = Number(formData.get("sortOrder") || "0");

    try {
      await createBadge(
        { name, slug, description: description || undefined, icon, color, sortOrder },
        cookieHeader
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create badge" };
    }
  }

  if (intent === "update") {
    const id = formData.get("badgeId") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;
    const sortOrder = Number(formData.get("sortOrder") || "0");

    try {
      await updateBadge(
        id,
        { name, slug, description: description || undefined, icon, color, sortOrder },
        cookieHeader
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update badge" };
    }
  }

  if (intent === "delete") {
    const id = formData.get("badgeId") as string;
    try {
      await deleteBadge(id, cookieHeader);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete badge" };
    }
  }

  return { success: false };
}

function BadgeForm({
  badge,
  onCancel,
}: {
  badge?: Badge;
  onCancel: () => void;
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;

  const [slug, setSlug] = useState(badge?.slug || "");
  const [color, setColor] = useState(badge?.color || "#E5574F");

  const handleNameChange = (name: string) => {
    if (!badge) {
      // Auto-generate slug from name for new badges
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

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
        <input type="hidden" name="intent" value={badge ? "update" : "create"} />
        {badge && <input type="hidden" name="badgeId" value={badge.id} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="badge-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              id="badge-name"
              name="name"
              type="text"
              required
              defaultValue={badge?.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="badge-slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug
            </label>
            <input
              id="badge-slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="badge-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon (emoji)
            </label>
            <input
              id="badge-icon"
              name="icon"
              type="text"
              required
              defaultValue={badge?.icon || ""}
              placeholder="e.g. ⭐"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="badge-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                id="badge-color"
                name="color"
                type="text"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
          </div>

          <div>
            <label htmlFor="badge-sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort Order
            </label>
            <input
              id="badge-sort"
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={badge?.sortOrder ?? 0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
        </div>

        <div>
          <label htmlFor="badge-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="badge-desc"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={badge?.description || ""}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral resize-none"
          />
        </div>

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

function BadgeCard({ badge, onEdit }: { badge: Badge; onEdit: () => void }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${badge.color}20` }}
          >
            {badge.icon}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {badge.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {badge.slug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
          >
            {badge.userCount ?? 0} users
          </span>
        </div>
      </div>

      {badge.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {badge.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {/* Preview */}
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: badge.color }}
        >
          {badge.icon} {badge.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Edit
          </button>
          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (!confirm(`Delete badge "${badge.name}"? This will remove it from all users.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="badgeId" value={badge.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}

export default function AdminBadgesPage() {
  const { badges } = useLoaderData<typeof loader>();
  const [showForm, setShowForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | undefined>();

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBadge(undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Badges
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {badges.length} badge{badges.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingBadge(undefined); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Badge
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <BadgeForm badge={editingBadge} onCancel={handleCancel} />
        </div>
      )}

      {badges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onEdit={() => handleEdit(badge)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            No badges yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your first badge to recognize community members.
          </p>
        </div>
      )}
    </div>
  );
}
