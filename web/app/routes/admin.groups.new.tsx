/**
 * Admin Create New Group
 *
 * Form for adding a new group to be tracked.
 */

import { Form, Link, redirect } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.groups.new";
import { createGroup, type CreateGroupData } from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = () => [
  { title: "Add Group | Tampa.dev Admin" },
];

export async function action({ request }: Route.ActionArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const formData = await request.formData();

  const urlname = formData.get("urlname");
  const name = formData.get("name");
  const platform = formData.get("platform");
  const platformId = formData.get("platformId");

  if (
    typeof urlname !== "string" ||
    typeof name !== "string" ||
    typeof platform !== "string" ||
    typeof platformId !== "string"
  ) {
    return { error: "Missing required fields" };
  }

  try {
    const data: CreateGroupData = {
      urlname,
      name,
      platform: platform as "meetup" | "eventbrite" | "luma",
      platformId,
    };

    const description = formData.get("description");
    if (typeof description === "string" && description) {
      data.description = description;
    }

    const website = formData.get("website");
    if (typeof website === "string" && website) {
      data.website = website;
    }

    const isActive = formData.get("isActive");
    data.isActive = isActive === "true";

    const displayOnSite = formData.get("displayOnSite");
    data.displayOnSite = displayOnSite === "true";

    const isFeatured = formData.get("isFeatured");
    data.isFeatured = isFeatured === "true";

    const tags = formData.get("tags");
    if (typeof tags === "string" && tags) {
      data.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    // Social links
    const socialLinks: Record<string, string> = {};
    for (const key of ["slack", "discord", "linkedin", "twitter", "github", "meetup"]) {
      const value = formData.get(`socialLinks.${key}`);
      if (typeof value === "string" && value) {
        socialLinks[key] = value;
      }
    }
    if (Object.keys(socialLinks).length > 0) {
      data.socialLinks = socialLinks;
    }

    const group = await createGroup(data, cookieHeader);
    return redirect(`/admin/groups/${group.id}`);
  } catch (error) {
    console.error("Failed to create group:", error);
    return { error: error instanceof Error ? error.message : "Failed to create group" };
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

export default function AdminGroupNew({ actionData }: Route.ComponentProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Group</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Add a new group to track events from
          </p>
        </div>
      </div>

      {/* Error */}
      {actionData?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* Form */}
      <Form method="post" className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Name"
              name="name"
              placeholder="Tampa Bay Tech Group"
              required
            />
            <FormField
              label="URL Slug"
              name="urlname"
              placeholder="tampa-bay-tech-group"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
            </div>
            <FormField
              label="Website"
              name="website"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="Tags"
              name="tags"
              help="Comma-separated list"
              placeholder="cloud, ai, web"
            />
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                name="platform"
                id="platform"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              >
                <option value="">Select a platform</option>
                <option value="meetup">Meetup</option>
                <option value="eventbrite">Eventbrite</option>
                <option value="luma">Luma</option>
              </select>
            </div>
            <FormField
              label="Platform ID"
              name="platformId"
              placeholder="e.g., tampadevs for Meetup"
              help="The group's identifier on the platform"
              required
            />
          </div>
        </div>

        {/* Status & Visibility */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status & Visibility
          </h2>
          <div className="space-y-4">
            <Toggle
              label="Active"
              name="isActive"
              defaultChecked={true}
              help="Active groups will be synced for events"
            />
            <Toggle
              label="Display on Site"
              name="displayOnSite"
              defaultChecked={false}
              help="Show this group on the public website"
            />
            <Toggle
              label="Featured"
              name="isFeatured"
              defaultChecked={false}
              help="Featured groups appear prominently on the homepage"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Social Links (Optional)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Slack"
              name="socialLinks.slack"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="Discord"
              name="socialLinks.discord"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="LinkedIn"
              name="socialLinks.linkedin"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="Twitter"
              name="socialLinks.twitter"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="GitHub"
              name="socialLinks.github"
              type="url"
              placeholder="https://..."
            />
            <FormField
              label="Meetup"
              name="socialLinks.meetup"
              type="url"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4">
          <Link
            to="/admin/groups"
            className="px-4 py-2 text-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Group
          </button>
        </div>
      </Form>
    </div>
  );
}
