/**
 * Admin Group Detail/Edit
 *
 * View and edit a single group's details.
 */

import { Form, Link, useNavigate, redirect, data } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.groups.$id";
import {
  fetchAdminGroup,
  updateGroup,
  deleteGroup,
  triggerGroupSync,
  type AdminGroup,
  type UpdateGroupData,
} from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const loaderData = data as { group?: AdminGroup | null } | undefined;
  return [
    { title: loaderData?.group ? `${loaderData.group.name} | Tampa.dev Admin` : "Group Not Found" },
  ];
};

export async function loader({
  params,
}: Route.LoaderArgs): Promise<{ group: AdminGroup | null; error?: string }> {
  try {
    const group = await fetchAdminGroup(params.id);
    if (!group) {
      throw data({ error: "Group not found" }, { status: 404 });
    }
    return { group };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to fetch group:", error);
    return { group: null, error: "Failed to load group" };
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "delete") {
      await deleteGroup(params.id);
      return redirect("/admin/groups");
    }

    if (intent === "sync") {
      const result = await triggerGroupSync(params.id);
      return { success: true, syncResult: result };
    }

    // Update group
    const updateData: UpdateGroupData = {};

    const name = formData.get("name");
    if (typeof name === "string" && name) updateData.name = name;

    const urlname = formData.get("urlname");
    if (typeof urlname === "string" && urlname) updateData.urlname = urlname;

    const description = formData.get("description");
    if (typeof description === "string") updateData.description = description || undefined;

    const website = formData.get("website");
    if (typeof website === "string") updateData.website = website || null;

    const isActive = formData.get("isActive");
    updateData.isActive = isActive === "true";

    const displayOnSite = formData.get("displayOnSite");
    updateData.displayOnSite = displayOnSite === "true";

    const isFeatured = formData.get("isFeatured");
    updateData.isFeatured = isFeatured === "true";

    const tags = formData.get("tags");
    if (typeof tags === "string") {
      updateData.tags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    }

    // Social links
    const socialLinks: Record<string, string> = {};
    for (const key of ["slack", "discord", "linkedin", "twitter", "github", "meetup"]) {
      const value = formData.get(`socialLinks.${key}`);
      if (typeof value === "string" && value) {
        socialLinks[key] = value;
      }
    }
    updateData.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : null;

    await updateGroup(params.id, updateData);
    return { success: true };
  } catch (error) {
    console.error("Action failed:", error);
    return { error: error instanceof Error ? error.message : "Action failed" };
  }
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  help,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
      />
      {help && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{help}</p>}
    </div>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  help,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  help?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked || false);

  return (
    <div className="flex items-start gap-3">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 ${
          checked ? "bg-coral" : "bg-gray-200 dark:bg-gray-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {help && <p className="text-sm text-gray-500 dark:text-gray-400">{help}</p>}
      </div>
    </div>
  );
}

export default function AdminGroupDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { group, error } = loaderData;
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (error || !group) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
        <p className="text-red-600 dark:text-red-300 mt-1">{error || "Group not found"}</p>
        <Link
          to="/admin/groups"
          className="inline-block mt-4 text-coral hover:text-coral-dark font-medium"
        >
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/groups"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            {group.photoUrl ? (
              <img
                src={group.photoUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 font-bold">
                  {group.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{group.urlname}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Form method="post">
            <input type="hidden" name="intent" value="sync" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Now
            </button>
          </Form>
          <a
            href={group.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View on {group.platform}
          </a>
        </div>
      </div>

      {/* Action feedback */}
      {actionData?.success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-700 dark:text-green-400">
            {actionData.syncResult ? "Sync completed successfully!" : "Group updated successfully!"}
          </p>
        </div>
      )}
      {actionData?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* Edit Form */}
      <Form method="post" className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Name"
              name="name"
              defaultValue={group.name}
              required
            />
            <FormField
              label="URL Slug"
              name="urlname"
              defaultValue={group.urlname}
              help="Lowercase letters, numbers, and hyphens only"
              required
            />
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                defaultValue={group.description || ""}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
            </div>
            <FormField
              label="Website"
              name="website"
              type="url"
              defaultValue={group.website || ""}
              placeholder="https://..."
            />
            <FormField
              label="Tags"
              name="tags"
              defaultValue={group.tags?.join(", ") || ""}
              help="Comma-separated list"
              placeholder="cloud, ai, web"
            />
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform
              </label>
              <p className="mt-1 text-gray-900 dark:text-white capitalize">{group.platform}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform ID
              </label>
              <p className="mt-1 text-gray-900 dark:text-white font-mono text-sm">{group.platformId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Member Count
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {group.memberCount?.toLocaleString() || "Unknown"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Events
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {group.eventCount ?? "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Status & Visibility */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status & Visibility
          </h2>
          <div className="space-y-4">
            <Toggle
              label="Active"
              name="isActive"
              defaultChecked={group.isActive}
              help="Inactive groups won't be synced"
            />
            <Toggle
              label="Display on Site"
              name="displayOnSite"
              defaultChecked={group.displayOnSite}
              help="Show this group on the public website"
            />
            <Toggle
              label="Featured"
              name="isFeatured"
              defaultChecked={group.isFeatured || false}
              help="Featured groups appear prominently on the homepage"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Social Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Slack"
              name="socialLinks.slack"
              type="url"
              defaultValue={group.socialLinks?.slack || ""}
              placeholder="https://..."
            />
            <FormField
              label="Discord"
              name="socialLinks.discord"
              type="url"
              defaultValue={group.socialLinks?.discord || ""}
              placeholder="https://..."
            />
            <FormField
              label="LinkedIn"
              name="socialLinks.linkedin"
              type="url"
              defaultValue={group.socialLinks?.linkedin || ""}
              placeholder="https://..."
            />
            <FormField
              label="Twitter"
              name="socialLinks.twitter"
              type="url"
              defaultValue={group.socialLinks?.twitter || ""}
              placeholder="https://..."
            />
            <FormField
              label="GitHub"
              name="socialLinks.github"
              type="url"
              defaultValue={group.socialLinks?.github || ""}
              placeholder="https://..."
            />
            <FormField
              label="Meetup"
              name="socialLinks.meetup"
              type="url"
              defaultValue={group.socialLinks?.meetup || ""}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Deactivate Group
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Save Changes
          </button>
        </div>
      </Form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Deactivate Group?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              This will mark the group as inactive. It won't be synced anymore, but the data will be preserved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Deactivate
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
