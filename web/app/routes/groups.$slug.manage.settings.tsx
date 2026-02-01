/**
 * Group Settings Management
 *
 * Allows group owners and managers (with canEditSettings) to update
 * group name, description, slug, website, tags, social links, images,
 * and theme color. Read-only fallback for users without edit permissions.
 */

import { useFetcher, useOutletContext } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/groups.$slug.manage.settings";
import {
  fetchManagedGroup,
  updateGroupSettings,
  resolveGroupIdFromSlug,
  type ManagedGroup,
  type GroupPermissions,
  type UpdateGroupData,
} from "~/lib/group-manage-api.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const title = data?.group?.name
    ? `Settings - ${data.group.name} | Tampa.dev`
    : "Group Settings | Tampa.dev";
  return [{ title }];
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const slug = params.slug;

  // Resolve group ID from slug via the public groups endpoint
  const publicGroup = await resolveGroupIdFromSlug(slug);
  if (!publicGroup) {
    throw new Response("Group not found", { status: 404 });
  }

  const group = await fetchManagedGroup(publicGroup.id, cookieHeader);

  return { group };
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent !== "updateSettings") {
    return { success: false, error: "Unknown action" };
  }

  const slug = params.slug;

  // Resolve group ID from slug
  const publicGroup = await resolveGroupIdFromSlug(slug);
  if (!publicGroup) {
    return { success: false, error: "Group not found" };
  }

  try {
    const data: UpdateGroupData = {};

    const name = formData.get("name") as string;
    if (name) data.name = name;

    const description = formData.get("description") as string;
    if (typeof description === "string") data.description = description;

    const urlname = formData.get("urlname") as string;
    if (urlname) data.urlname = urlname;

    const website = formData.get("website") as string;
    if (typeof website === "string") data.website = website || undefined;

    const tagsRaw = formData.get("tags") as string;
    if (typeof tagsRaw === "string") {
      data.tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Social links - collect individual fields
    const socialLinks: Record<string, string> = {};
    for (const platform of ["slack", "discord", "linkedin", "twitter", "github", "meetup"]) {
      const value = formData.get(`socialLinks.${platform}`) as string;
      if (typeof value === "string" && value.trim()) {
        socialLinks[platform] = value.trim();
      }
    }
    data.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : undefined;

    const photoUrl = formData.get("photoUrl") as string;
    if (typeof photoUrl === "string") data.photoUrl = photoUrl || undefined;

    const heroImageUrl = formData.get("heroImageUrl") as string;
    if (typeof heroImageUrl === "string") data.heroImageUrl = heroImageUrl || undefined;

    const themeColor = formData.get("themeColor") as string;
    if (typeof themeColor === "string" && themeColor) data.themeColor = themeColor;

    await updateGroupSettings(publicGroup.id, data, cookieHeader);

    return { success: true };
  } catch (error) {
    console.error("Failed to update group settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

const SOCIAL_PLATFORMS = [
  { key: "slack", label: "Slack", placeholder: "https://your-workspace.slack.com" },
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/invite-code" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/handle" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/org" },
  { key: "meetup", label: "Meetup", placeholder: "https://meetup.com/group-name" },
] as const;

const PRESET_COLORS = [
  { value: "#FF6B4A", label: "Coral" },
  { value: "#1B2A4A", label: "Navy" },
  { value: "#6366F1", label: "Indigo" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#22C55E", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#3B82F6", label: "Blue" },
];

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </span>
      <p className="text-gray-900 dark:text-white text-sm">
        {value || <span className="text-gray-400 dark:text-gray-600 italic">Not set</span>}
      </p>
    </div>
  );
}

function ReadOnlyView({ group }: { group: ManagedGroup }) {
  return (
    <div className="space-y-6">
      {/* Notice banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              View-only access
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              You do not have permission to edit group settings. Contact a group owner to request
              access.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReadOnlyField label="Name" value={group.name} />
          <ReadOnlyField label="URL Name" value={group.urlname} />
          <div className="md:col-span-2">
            <ReadOnlyField label="Description" value={group.description} />
          </div>
          <ReadOnlyField label="Website" value={group.website} />
          <ReadOnlyField label="Tags" value={group.tags?.join(", ")} />
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SOCIAL_PLATFORMS.map((platform) => (
            <ReadOnlyField
              key={platform.key}
              label={platform.label}
              value={group.socialLinks?.[platform.key as keyof typeof group.socialLinks]}
            />
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Photo
            </span>
            {group.photoUrl ? (
              <img
                src={group.photoUrl}
                alt={group.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-400">
                  {group.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Theme Color
            </span>
            {group.themeColor ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: group.themeColor }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {group.themeColor}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-600 italic text-sm">Not set</span>
            )}
          </div>
          <ReadOnlyField label="Hero Image URL" value={group.heroImageUrl} />
        </div>
      </div>
    </div>
  );
}

export default function GroupManageSettings({ loaderData }: Route.ComponentProps) {
  const { group: loaderGroup } = loaderData;
  const { group: contextGroup, permissions } = useOutletContext<{
    group: ManagedGroup;
    userRole: string;
    permissions: GroupPermissions;
  }>();

  // Use the context group if available (more up-to-date), otherwise fall back to loader data
  const group = contextGroup || loaderGroup;

  const fetcher = useFetcher<{ success: boolean; error?: string }>();
  const isSubmitting = fetcher.state !== "idle";

  const [themeColor, setThemeColor] = useState(group.themeColor || "");
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success banner when action completes
  useEffect(() => {
    if (fetcher.data?.success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  // If the user cannot edit settings, show the read-only view
  if (!permissions?.canEditSettings) {
    return <ReadOnlyView group={group} />;
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {showSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Settings saved successfully.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {fetcher.data?.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {fetcher.data.error}
            </p>
          </div>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-6">
        <input type="hidden" name="intent" value="updateSettings" />

        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={group.name}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="Group name"
              />
            </div>

            <div>
              <label
                htmlFor="urlname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                URL Name / Slug
              </label>
              <input
                type="text"
                id="urlname"
                name="urlname"
                defaultValue={group.urlname}
                maxLength={100}
                pattern="[a-z0-9\-]+"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="my-group-slug"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lowercase letters, numbers, and hyphens only. Used in URLs.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={group.description || ""}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="Describe your group..."
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                defaultValue={group.website || ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="https://yourgroup.com"
              />
            </div>

            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                defaultValue={group.tags?.join(", ") || ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="web, ai, cloud"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Comma-separated list of tags
              </p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Social Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.key}>
                <label
                  htmlFor={`socialLinks.${platform.key}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {platform.label}
                </label>
                <input
                  type="url"
                  id={`socialLinks.${platform.key}`}
                  name={`socialLinks.${platform.key}`}
                  defaultValue={
                    group.socialLinks?.[platform.key as keyof typeof group.socialLinks] || ""
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder={platform.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="photoUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Photo URL
              </label>
              <div className="flex items-center gap-4">
                {group.photoUrl ? (
                  <img
                    src={group.photoUrl}
                    alt={group.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-gray-400">
                      {group.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <input
                  type="text"
                  id="photoUrl"
                  name="photoUrl"
                  defaultValue={group.photoUrl || ""}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder="https://cdn.example.com/photo.jpg"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Direct URL to the group photo. Upload support coming soon.
              </p>
            </div>

            <div>
              <label
                htmlFor="heroImageUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Hero Image URL
              </label>
              <input
                type="text"
                id="heroImageUrl"
                name="heroImageUrl"
                defaultValue={group.heroImageUrl || ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                placeholder="https://cdn.example.com/hero.jpg"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Wide banner image displayed on your group page.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Color
              </label>

              {/* Preset color swatches */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setThemeColor(color.value)}
                    title={color.label}
                    className={`w-9 h-9 rounded-lg border-2 transition-all ${
                      themeColor === color.value
                        ? "border-gray-900 dark:border-white scale-110 shadow-md"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>

              {/* Custom color input */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeColor || "#FF6B4A"}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  name="themeColor"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-coral focus:border-transparent"
                  placeholder="#FF6B4A"
                  maxLength={7}
                />
                {themeColor && (
                  <button
                    type="button"
                    onClick={() => setThemeColor("")}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose a preset or pick a custom hex color for your group branding.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}
