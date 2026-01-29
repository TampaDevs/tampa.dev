/**
 * Admin Sync Management
 *
 * View sync status, trigger syncs, and view sync logs.
 */

import { Form, useRevalidator } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/admin.sync";
import {
  fetchSyncStatus,
  fetchSyncLogs,
  triggerSyncAll,
  type SyncStatusResponse,
  type SyncLog,
} from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = () => [
  { title: "Sync Management | Tampa.dev Admin" },
];

export async function loader(): Promise<{
  status: SyncStatusResponse | null;
  logs: SyncLog[];
  error?: string;
}> {
  try {
    const [status, logs] = await Promise.all([
      fetchSyncStatus(),
      fetchSyncLogs({ limit: 50 }),
    ]);
    return { status, logs };
  } catch (error) {
    console.error("Failed to fetch sync data:", error);
    return { status: null, logs: [], error: "Failed to load sync data" };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "sync-all") {
      const result = await triggerSyncAll();
      return { success: true, result };
    }
    return { error: "Unknown action" };
  } catch (error) {
    console.error("Sync failed:", error);
    return { error: error instanceof Error ? error.message : "Sync failed" };
  }
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        classes[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {status === "running" && (
        <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
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
      )}
      {status}
    </span>
  );
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(startedAt: string, completedAt?: string | null): string {
  if (!completedAt) return "In progress...";

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMs = end - start;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
}

function ProviderCard({
  platform,
  info,
  isConfigured,
}: {
  platform: string;
  info?: { lastSync?: string; status?: string };
  isConfigured: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isConfigured
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-gray-100 dark:bg-gray-700"
            }`}
          >
            <span
              className={`text-sm font-bold uppercase ${
                isConfigured
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400"
              }`}
            >
              {platform.slice(0, 2)}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white capitalize">
              {platform}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConfigured ? "Configured" : "Not configured"}
            </p>
          </div>
        </div>
        <div className="text-right">
          {info?.status && <StatusBadge status={info.status} />}
          {info?.lastSync && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatDateTime(info.lastSync)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SyncLogRow({ log }: { log: SyncLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="capitalize font-medium text-gray-900 dark:text-white">
          {log.platform}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={log.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDateTime(log.startedAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDuration(log.startedAt, log.completedAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">
            +{log.eventsCreated}
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            ~{log.eventsUpdated}
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{log.eventsDeleted}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        {log.errorMessage && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            {expanded ? "Hide" : "Show"} error
          </button>
        )}
      </td>
    </tr>
  );
}

export default function AdminSync({ loaderData, actionData }: Route.ComponentProps) {
  const { status, logs, error } = loaderData;
  const revalidator = useRevalidator();
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-refresh when sync is running
  useEffect(() => {
    const hasRunningSync = logs.some((log) => log.status === "running");
    if (hasRunningSync || isSyncing) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [logs, isSyncing, revalidator]);

  // Track sync state
  useEffect(() => {
    if (actionData?.success) {
      setIsSyncing(false);
    }
  }, [actionData]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
        <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  const platforms = ["meetup", "eventbrite", "luma"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sync Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage event synchronization from external platforms
          </p>
        </div>
        <Form
          method="post"
          onSubmit={() => setIsSyncing(true)}
        >
          <input type="hidden" name="intent" value="sync-all" />
          <button
            type="submit"
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync All Groups
              </>
            )}
          </button>
        </Form>
      </div>

      {/* Action feedback */}
      {actionData?.success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-700 dark:text-green-400">
            Sync completed! Created: {actionData.result?.eventsCreated || 0}, Updated:{" "}
            {actionData.result?.eventsUpdated || 0}
          </p>
        </div>
      )}
      {actionData?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* Provider Status */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Provider Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <ProviderCard
              key={platform}
              platform={platform}
              info={status?.providers.status[platform]}
              isConfigured={status?.providers.configured.includes(platform) || false}
            />
          ))}
        </div>
      </div>

      {/* Group Stats */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Groups</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {status.groups.total}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Groups</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {status.groups.active}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Inactive Groups
            </p>
            <p className="text-2xl font-bold text-gray-400 mt-1">
              {status.groups.total - status.groups.active}
            </p>
          </div>
        </div>
      )}

      {/* Sync Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No sync logs yet. Run a sync to see results here.
                  </td>
                </tr>
              ) : (
                logs.map((log) => <SyncLogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="text-green-600 dark:text-green-400">+</span> Created
        </span>
        <span className="flex items-center gap-1">
          <span className="text-blue-600 dark:text-blue-400">~</span> Updated
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-600 dark:text-red-400">-</span> Deleted
        </span>
      </div>
    </div>
  );
}
