/**
 * Admin Badges Management Page
 *
 * Create, edit, and delete badges from the admin panel.
 * Manage claim links for each badge.
 */

import { useLoaderData, useFetcher } from "react-router";
import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/admin.badges";
import { Emoji } from "~/components/Emoji";
import { EmojiSelect } from "~/components/EmojiSelect";
import {
  fetchBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  type Badge,
} from "~/lib/admin-api.server";

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

interface ClaimLink {
  id: string;
  code: string;
  badgeId: string;
  achievementId: string | null;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  createdAt: string;
}

interface Achievement {
  id: string;
  key: string;
  name: string;
  icon: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const [badges, achievementsResponse] = await Promise.all([
    fetchBadges(cookieHeader),
    fetch(`${API_HOST}/admin/achievements`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }),
  ]);

  let achievements: Achievement[] = [];
  if (achievementsResponse.ok) {
    const json = (await achievementsResponse.json()) as { data: Achievement[] };
    achievements = json.data;
  }

  return { badges, achievements };
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
    const points = Number(formData.get("points") || "0");
    const sortOrder = Number(formData.get("sortOrder") || "0");
    const hideFromDirectory = formData.get("hideFromDirectory") === "on";

    try {
      await createBadge(
        { name, slug, description: description || undefined, icon, color, points, sortOrder, hideFromDirectory },
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
    const points = Number(formData.get("points") || "0");
    const sortOrder = Number(formData.get("sortOrder") || "0");
    const hideFromDirectory = formData.get("hideFromDirectory") === "on";

    try {
      await updateBadge(
        id,
        { name, slug, description: description || undefined, icon, color, points, sortOrder, hideFromDirectory },
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

  if (intent === "create-claim-link") {
    const badgeId = formData.get("badgeId") as string;
    const maxUses = formData.get("maxUses") as string;
    const expiresAt = formData.get("expiresAt") as string;
    const achievementId = formData.get("achievementId") as string;

    try {
      const body: Record<string, unknown> = {};
      if (maxUses) body.maxUses = Number(maxUses);
      if (expiresAt) body.expiresAt = expiresAt;
      if (achievementId) body.achievementId = achievementId;

      const emitEventType = formData.get("emitEventType") as string;
      const emitEventPayload = formData.get("emitEventPayload") as string;
      if (emitEventType) body.emitEventType = emitEventType;
      if (emitEventPayload) body.emitEventPayload = emitEventPayload;

      const response = await fetch(
        `${API_HOST}/admin/badges/${encodeURIComponent(badgeId)}/claim-links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to create claim link: ${response.status}`);
      }

      return { success: true, intent: "create-claim-link" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create claim link" };
    }
  }

  if (intent === "delete-claim-link") {
    const claimLinkId = formData.get("claimLinkId") as string;

    try {
      const response = await fetch(
        `${API_HOST}/admin/claim-links/${encodeURIComponent(claimLinkId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to delete claim link: ${response.status}`);
      }

      return { success: true, intent: "delete-claim-link" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete claim link" };
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
            <label htmlFor="badge-points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points (XP)
            </label>
            <input
              id="badge-points"
              name="points"
              type="number"
              min="0"
              defaultValue={badge?.points ?? 0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
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

        <div className="flex items-start gap-3">
          <div className="flex items-center h-5 mt-0.5">
            <input
              id="badge-hide-directory"
              name="hideFromDirectory"
              type="checkbox"
              defaultChecked={badge ? badge.hideFromDirectory === 1 : false}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-coral focus:ring-coral/50 bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label htmlFor="badge-hide-directory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Hide from Directory
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Badge won't appear in the public badges listing or community members filter
            </p>
          </div>
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

function ClaimLinksSection({ badge, achievements }: { badge: Badge; achievements: Achievement[] }) {
  const [claimLinks, setClaimLinks] = useState<ClaimLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const createFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  const fetchClaimLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_HOST}/admin/badges/${encodeURIComponent(badge.id)}/claim-links`,
        {
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch claim links: ${response.status}`);
      }
      const json = (await response.json()) as { data: ClaimLink[] };
      setClaimLinks(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch claim links");
    } finally {
      setLoading(false);
    }
  }, [badge.id]);

  useEffect(() => {
    fetchClaimLinks();
  }, [fetchClaimLinks]);

  // Refresh claim links when create/delete actions complete
  const createData = createFetcher.data as { success?: boolean; intent?: string; error?: string } | undefined;
  const deleteData = deleteFetcher.data as { success?: boolean; intent?: string; error?: string } | undefined;

  useEffect(() => {
    if (createData?.success && createData?.intent === "create-claim-link") {
      fetchClaimLinks();
      setShowCreateForm(false);
    }
  }, [createData, fetchClaimLinks]);

  useEffect(() => {
    if (deleteData?.success && deleteData?.intent === "delete-claim-link") {
      fetchClaimLinks();
    }
  }, [deleteData, fetchClaimLinks]);

  const handleCopy = async (code: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(`https://tampa.dev/claim/${code}`);
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback: silently fail
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Claim Links
        </h4>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs px-2 py-1 text-coral hover:bg-coral/10 rounded transition-colors font-medium"
          >
            + Create Link
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {createData?.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{createData.error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <createFetcher.Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="create-claim-link" />
            <input type="hidden" name="badgeId" value={badge.id} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor={`claim-max-${badge.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Max Uses (optional)
                </label>
                <input
                  id={`claim-max-${badge.id}`}
                  name="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
                />
              </div>

              <div>
                <label htmlFor={`claim-expires-${badge.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Expires At (optional)
                </label>
                <input
                  id={`claim-expires-${badge.id}`}
                  name="expiresAt"
                  type="datetime-local"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
                />
              </div>

              <div>
                <label htmlFor={`claim-achievement-${badge.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Achievement (optional)
                </label>
                <EmojiSelect
                  id={`claim-achievement-${badge.id}`}
                  name="achievementId"
                  placeholder="None (badge only)"
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
                  options={[
                    { value: "", label: "None (badge only)" },
                    ...achievements.map((a) => ({
                      value: a.id,
                      label: a.name,
                      emoji: a.icon,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`claim-event-type-${badge.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Custom Event Type (optional)
                </label>
                <input
                  id={`claim-event-type-${badge.id}`}
                  name="emitEventType"
                  type="text"
                  placeholder="dev.tampa.event.checkin"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral font-mono"
                />
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Emit a custom domain event when this link is claimed</p>
              </div>

              <div>
                <label htmlFor={`claim-event-payload-${badge.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Custom Event Payload (optional)
                </label>
                <textarea
                  id={`claim-event-payload-${badge.id}`}
                  name="emitEventPayload"
                  rows={2}
                  placeholder='{"groupSlug": "tampa-devs"}'
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral font-mono resize-none"
                />
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">JSON payload merged into the emitted event</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={createFetcher.state !== "idle"}
                className="px-3 py-1.5 text-sm bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
              >
                {createFetcher.state !== "idle" ? "Creating..." : "Create Claim Link"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </createFetcher.Form>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading claim links...</p>
      ) : claimLinks.length > 0 ? (
        <div className="space-y-2">
          {claimLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                    {link.code}
                  </code>
                  <button
                    onClick={() => handleCopy(link.code, link.id)}
                    className="shrink-0 p-1 text-gray-400 hover:text-coral transition-colors"
                    title="Copy claim URL"
                  >
                    {copiedId === link.id ? (
                      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Uses: {link.currentUses}/{link.maxUses ?? "Unlimited"}
                  </span>
                  {link.expiresAt && (
                    <span>
                      Expires: {new Date(link.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <deleteFetcher.Form
                method="post"
                onSubmit={(e) => {
                  if (!confirm("Delete this claim link?")) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="intent" value="delete-claim-link" />
                <input type="hidden" name="claimLinkId" value={link.id} />
                <button
                  type="submit"
                  disabled={deleteFetcher.state !== "idle"}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete claim link"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </deleteFetcher.Form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">No claim links yet.</p>
      )}
    </div>
  );
}

function BadgeCard({ badge, onEdit, achievements }: { badge: Badge; onEdit: () => void; achievements: Achievement[] }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";
  const [showClaimLinks, setShowClaimLinks] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${badge.color}20` }}
          >
            <Emoji emoji={badge.icon} size={24} />
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
          {badge.hideFromDirectory === 1 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              Hidden
            </span>
          )}
          {badge.points > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              {badge.points} XP
            </span>
          )}
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
          <Emoji emoji={badge.icon} size={14} /> {badge.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowClaimLinks(!showClaimLinks)}
            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {showClaimLinks ? "Hide Links" : "Claim Links"}
          </button>
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

      {showClaimLinks && <ClaimLinksSection badge={badge} achievements={achievements} />}
    </div>
  );
}

export default function AdminBadgesPage() {
  const { badges, achievements } = useLoaderData<typeof loader>();
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
              achievements={achievements}
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
