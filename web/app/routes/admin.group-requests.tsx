/**
 * Admin Group Creation Requests
 *
 * Review and approve/reject group creation requests.
 * Approving creates the group and sets the requester as owner.
 */

import { Form, Link, useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.group-requests";
import {
  fetchGroupCreationRequests,
  approveGroupCreationRequest,
  rejectGroupCreationRequest,
  type GroupCreationRequest,
} from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = () => [
  { title: "Group Creation Requests | Tampa.dev Admin" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "pending" | "approved" | "rejected" | null;

  try {
    const data = await fetchGroupCreationRequests(
      { status: status || undefined },
      cookieHeader
    );
    return { requests: data.data, pagination: data.pagination, status, error: null };
  } catch (error) {
    console.error("Failed to fetch creation requests:", error);
    return { requests: [], pagination: null, status, error: "Failed to load creation requests" };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id") as string;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  try {
    if (intent === "approve") {
      const result = await approveGroupCreationRequest(id, cookieHeader);
      return { success: true, message: "Group created successfully", groupId: result.groupId };
    }
    if (intent === "reject") {
      const notes = formData.get("notes") as string | null;
      await rejectGroupCreationRequest(id, notes || undefined, cookieHeader);
      return { success: true, message: "Creation request rejected" };
    }
    return { error: "Unknown action" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Action failed" };
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function CreationRequestRow({ request: req }: { request: GroupCreationRequest }) {
  const fetcher = useFetcher();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const isPending = req.status === "pending";
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {req.groupName}
            </h3>
            <StatusBadge status={req.status} />
          </div>

          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <span className="font-medium">Requested by:</span>{" "}
              {req.userName}
              {req.userUsername && (
                <span className="text-gray-400"> (@{req.userUsername})</span>
              )}
              {req.userEmail && (
                <span className="text-gray-400"> &mdash; {req.userEmail}</span>
              )}
            </p>
            {req.description && (
              <p>
                <span className="font-medium">Description:</span> {req.description}
              </p>
            )}
            {req.groupId && (
              <p>
                <span className="font-medium">Created group:</span>{" "}
                <Link
                  to={`/admin/groups/${req.groupId}`}
                  className="text-coral hover:text-coral-dark"
                >
                  View group
                </Link>
              </p>
            )}
            <p className="text-xs text-gray-400">
              Submitted {new Date(req.createdAt).toLocaleString()}
              {req.reviewedAt && (
                <span> &mdash; Reviewed {new Date(req.reviewedAt).toLocaleString()}</span>
              )}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="approve" />
              <input type="hidden" name="id" value={req.id} />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Approve"}
              </button>
            </fetcher.Form>
            <button
              type="button"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {showRejectForm && (
        <fetcher.Form method="post" className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <input type="hidden" name="intent" value="reject" />
          <input type="hidden" name="id" value={req.id} />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rejection reason (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            placeholder="Reason for rejection..."
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              Confirm Reject
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </fetcher.Form>
      )}
    </div>
  );
}

export default function AdminGroupRequests({ loaderData, actionData }: Route.ComponentProps) {
  const { requests, status, error } = loaderData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Group Creation Requests
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review requests from users who want to create new groups
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Form method="get" className="flex items-center gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s === "all" ? "" : s}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                (s === "all" && !status) || s === status
                  ? "bg-coral text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </Form>
      </div>

      {/* Feedback */}
      {actionData?.success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-700 dark:text-green-400">
            {actionData.message}
            {actionData.groupId && (
              <>
                {" "}&mdash;{" "}
                <Link to={`/admin/groups/${actionData.groupId}`} className="underline">
                  View group
                </Link>
              </>
            )}
          </p>
        </div>
      )}
      {(actionData?.error || error) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">{actionData?.error || error}</p>
        </div>
      )}

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No creation requests
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {status ? `No ${status} creation requests found.` : "No group creation requests have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <CreationRequestRow key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}
