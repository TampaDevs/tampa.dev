/**
 * Admin Feature Flags Management Page
 *
 * Create, edit, and manage feature flags with user/group overrides.
 */

import { useLoaderData, useFetcher, Form } from "react-router";
import { Button } from "@tampadevs/react";
import { useState } from "react";
import type { Route } from "./+types/admin.flags";
import {
  fetchFlags,
  createFlag,
  updateFlag,
  deleteFlag,
  type FeatureFlag,
} from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const flags = await fetchFlags(cookieHeader);
  return { flags };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "create") {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = (formData.get("description") as string) || undefined;
    const enabledByDefault = formData.get("enabledByDefault") === "true";

    await createFlag({ name, slug, description, enabledByDefault }, cookieHeader);
    return { success: true };
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = (formData.get("description") as string) || undefined;
    const enabledByDefault = formData.get("enabledByDefault") === "true";

    await updateFlag(id, { name, slug, description, enabledByDefault }, cookieHeader);
    return { success: true };
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await deleteFlag(id, cookieHeader);
    return { success: true };
  }

  return { success: false };
}

function FlagForm({
  flag,
  onCancel,
}: {
  flag?: FeatureFlag;
  onCancel?: () => void;
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  const [name, setName] = useState(flag?.name || "");
  const [slug, setSlug] = useState(flag?.slug || "");
  const [description, setDescription] = useState(flag?.description || "");
  const [enabledByDefault, setEnabledByDefault] = useState(
    flag?.enabledByDefault ?? false
  );
  const [autoSlug, setAutoSlug] = useState(!flag);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      );
    }
  }

  return (
    <fetcher.Form method="post" className="space-y-4">
      <input type="hidden" name="intent" value={flag ? "update" : "create"} />
      {flag && <input type="hidden" name="id" value={flag.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            placeholder="e.g. Beta Dashboard"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug
          </label>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoSlug(false);
            }}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
            placeholder="e.g. beta-dashboard"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none"
          placeholder="What does this flag control?"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="hidden"
          name="enabledByDefault"
          value={enabledByDefault ? "true" : "false"}
        />
        <button
          type="button"
          role="switch"
          aria-checked={enabledByDefault}
          onClick={() => setEnabledByDefault(!enabledByDefault)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabledByDefault ? "bg-coral" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabledByDefault ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Enabled by default
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : flag ? "Update Flag" : "Create Flag"}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
    </fetcher.Form>
  );
}

function FlagCard({
  flag,
}: {
  flag: FeatureFlag;
}) {
  const fetcher = useFetcher();
  const [isEditing, setIsEditing] = useState(false);
  const isDeleting = fetcher.state !== "idle";

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <FlagForm flag={flag} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {flag.name}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                flag.enabledByDefault
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {flag.enabledByDefault ? "ON" : "OFF"} by default
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-2">
            {flag.slug}
          </div>
          {flag.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {flag.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {flag.userOverrideCount || 0} user{" "}
              {flag.userOverrideCount === 1 ? "override" : "overrides"}
            </span>
            <span>
              {flag.groupOverrideCount || 0} group{" "}
              {flag.groupOverrideCount === 1 ? "override" : "overrides"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-coral transition-colors"
            title="Edit flag"
          >
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (
                !confirm(
                  `Delete flag "${flag.name}"? This will remove all user and group overrides.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={flag.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
              title="Delete flag"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}

export default function AdminFlagsPage() {
  const { flags } = useLoaderData<typeof loader>();
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Feature Flags
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage feature flags and per-user/group overrides
          </p>
        </div>
        {!showCreateForm && (
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            + New Flag
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-coral/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Feature Flag
          </h2>
          <FlagForm onCancel={() => setShowCreateForm(false)} />
        </div>
      )}

      {/* Flags list */}
      {flags.length > 0 ? (
        <div className="space-y-4">
          {flags.map((flag) => (
            <FlagCard key={flag.id} flag={flag} />
          ))}
        </div>
      ) : (
        !showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No feature flags yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create your first feature flag to start controlling feature rollouts.
            </p>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              + Create Flag
            </Button>
          </div>
        )
      )}

      {/* Info notice */}
      <div className="bg-navy/5 dark:bg-navy/20 rounded-xl p-4 border border-navy/10 dark:border-navy/30">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-navy dark:text-white/70 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-navy dark:text-white/70">
            <p className="font-medium">About feature flags:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-navy/70 dark:text-white/60">
              <li>
                <strong>Enabled by default</strong> - Flag is on for all
                users/groups unless overridden
              </li>
              <li>
                <strong>User overrides</strong> - Enable or disable a flag for
                specific users
              </li>
              <li>
                <strong>Group overrides</strong> - Enable or disable a flag for
                specific groups
              </li>
              <li>
                Use the flag slug in your code to check if a feature is enabled
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
