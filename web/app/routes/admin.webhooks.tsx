/**
 * Admin Webhooks Management Page
 *
 * View, toggle, and delete webhooks across all users from the admin panel.
 */

import { useLoaderData, useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.webhooks";

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

const ADMIN_RESTRICTED_EVENTS = [
  "dev.tampa.user.registered",
  "dev.tampa.user.deleted",
  "dev.tampa.user.identity_linked",
];

interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerName: string;
  ownerEmail: string;
  ownerUsername: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const response = await fetch(`${API_HOST}/api/admin/webhooks`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const data = (await response.json()) as { webhooks: Webhook[] };
  return { webhooks: data.webhooks };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const webhookId = formData.get("webhookId") as string;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "toggleActive") {
    const isActive = formData.get("isActive") === "true";
    try {
      const response = await fetch(
        `${API_HOST}/api/admin/webhooks/${encodeURIComponent(webhookId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(
          errorData.error || `Failed to toggle webhook: ${response.status}`
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to toggle webhook",
      };
    }
  }

  if (intent === "delete") {
    try {
      const response = await fetch(
        `${API_HOST}/api/admin/webhooks/${encodeURIComponent(webhookId)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(
          errorData.error || `Failed to delete webhook: ${response.status}`
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete webhook",
      };
    }
  }

  return { success: false, error: "Unknown action" };
}

function EventTypePill({ eventType }: { eventType: string }) {
  const isAdminRestricted = ADMIN_RESTRICTED_EVENTS.includes(eventType);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isAdminRestricted
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
      }`}
      title={isAdminRestricted ? "Admin-restricted event type" : undefined}
    >
      {isAdminRestricted && (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      )}
      {eventType}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          isActive ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function WebhookRow({ webhook }: { webhook: Webhook }) {
  const fetcher = useFetcher();
  const isUpdating = fetcher.state !== "idle";
  const [expanded, setExpanded] = useState(false);

  const optimisticActive =
    fetcher.formData?.get("intent") === "toggleActive"
      ? fetcher.formData.get("isActive") !== "true"
      : webhook.isActive;

  return (
    <>
      <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
        {/* Owner */}
        <td className="px-4 py-3">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {webhook.ownerName || "No name"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {webhook.ownerEmail}
            </div>
            {webhook.ownerUsername && (
              <div className="text-xs text-coral">
                @{webhook.ownerUsername}
              </div>
            )}
          </div>
        </td>

        {/* URL */}
        <td className="px-4 py-3">
          <div className="max-w-xs truncate text-sm text-gray-900 dark:text-white font-mono" title={webhook.url}>
            {webhook.url}
          </div>
        </td>

        {/* Event Types */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1 max-w-xs">
            {webhook.eventTypes.slice(0, 2).map((et) => (
              <EventTypePill key={et} eventType={et} />
            ))}
            {webhook.eventTypes.length > 2 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                +{webhook.eventTypes.length - 2} more
              </button>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <ActiveBadge isActive={optimisticActive} />
        </td>

        {/* Created */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(webhook.createdAt).toLocaleDateString()}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <fetcher.Form method="post" className="inline">
              <input type="hidden" name="intent" value="toggleActive" />
              <input type="hidden" name="webhookId" value={webhook.id} />
              <input
                type="hidden"
                name="isActive"
                value={String(webhook.isActive)}
              />
              <button
                type="submit"
                disabled={isUpdating}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  webhook.isActive
                    ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
                title={webhook.isActive ? "Deactivate webhook" : "Activate webhook"}
              >
                {isUpdating
                  ? "..."
                  : webhook.isActive
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </fetcher.Form>
            <fetcher.Form
              method="post"
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Are you sure you want to delete this webhook?\n\nURL: ${webhook.url}\nOwner: ${webhook.ownerName || webhook.ownerEmail}`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="webhookId" value={webhook.id} />
              <button
                type="submit"
                disabled={isUpdating}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                title="Delete webhook"
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
        </td>
      </tr>

      {/* Expanded event types row */}
      {expanded && webhook.eventTypes.length > 2 && (
        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap gap-1">
              {webhook.eventTypes.map((et) => (
                <EventTypePill key={et} eventType={et} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminWebhooksPage() {
  const { webhooks } = useLoaderData<typeof loader>();

  const activeCount = webhooks.filter((w) => w.isActive).length;
  const inactiveCount = webhooks.length - activeCount;
  const adminEventCount = webhooks.filter((w) =>
    w.eventTypes.some((et) => ADMIN_RESTRICTED_EVENTS.includes(et))
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Webhooks
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage webhook subscriptions across all users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {webhooks.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Webhooks
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {activeCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Active
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-500 dark:text-red-400">
            {inactiveCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Inactive
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
            {adminEventCount}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            With Admin Events
          </div>
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Event Types
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <WebhookRow key={webhook.id} webhook={webhook} />
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
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
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        No webhooks yet
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No users have registered any webhook subscriptions.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            <p className="font-medium">About webhook event types:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-navy/70 dark:text-white/60">
              <li>
                Event types marked with a{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  lock icon
                </span>{" "}
                are admin-restricted and only available to admin users
              </li>
              <li>
                <strong>Deactivating</strong> a webhook will stop delivery of
                events without deleting the configuration
              </li>
              <li>
                <strong>Deleting</strong> a webhook permanently removes it and
                cannot be undone
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
