/**
 * Group Creation Request Page
 *
 * Authenticated users can submit a request to create a new group.
 * Shows pending request status if one already exists.
 */

import type { Route } from "./+types/groups.create";
import { Link, redirect, useLoaderData } from "react-router";
import { useState } from "react";
import { generateMetaTags } from "~/lib/seo";
import {
  fetchCurrentUser,
  fetchMyCreationRequests,
  API_HOST,
} from "~/lib/api.server";

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Create a Group",
    description:
      "Request to create a new tech community group on Tampa.dev.",
    url: "/groups/create",
  });
};

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    return redirect("/login?returnTo=/groups/create");
  }

  const existingRequests = await fetchMyCreationRequests(cookieHeader);

  return {
    user,
    existingRequests,
    apiUrl: API_HOST,
  };
}

export default function GroupCreatePage() {
  const { user, existingRequests, apiUrl } = useLoaderData<typeof loader>();

  const pendingRequest = existingRequests.find((r) => r.status === "pending");

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/groups/request-creation`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          groupName: groupName.trim(),
          description: description.trim(),
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          (data as { error?: string })?.error ||
            `Request failed (${response.status})`
        );
      }

      setSuccess(true);
      setGroupName("");
      setDescription("");
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                to="/groups"
                className="text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
              >
                Groups
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 dark:text-white font-medium">
              Create
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Create a Group
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            Submit a request to create a new community group on Tampa.dev
          </p>
        </div>

        {/* Pending request status card */}
        {pendingRequest && !success && (
          <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  Your group request is pending review
                </h2>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-medium">{pendingRequest.groupName}</span>
                  {" "}was submitted on{" "}
                  {new Date(pendingRequest.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  We'll review your request and get back to you soon. You can
                  submit another request below if you'd like to create a
                  different group.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-8 rounded-xl border border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/20 p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Your request has been submitted!
                </h2>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  We'll review your group creation request and get back to you
                  soon. You can check the status of your requests on this page.
                </p>
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Browse existing groups
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Request form */}
        {!success && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}

              {/* Group name */}
              <div>
                <label
                  htmlFor="groupName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g. Tampa Bay React Developers"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-coral focus:ring-2 focus:ring-coral/20 focus:outline-none transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {groupName.length}/200 characters
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={2000}
                  rows={4}
                  placeholder="Describe your group, what topics you'll cover, and who should join..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-coral focus:ring-2 focus:ring-coral/20 focus:outline-none transition-colors resize-y"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {description.length}/2000 characters
                </p>
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Reason{" "}
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Why do you want to create this group? Any existing community you're bringing over?"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-coral focus:ring-2 focus:ring-coral/20 focus:outline-none transition-colors resize-y"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !groupName.trim() || !description.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
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
                      Submitting...
                    </>
                  ) : (
                    "Request Group Creation"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Previous requests */}
        {existingRequests.length > 0 && !success && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Previous Requests
            </h2>
            <div className="space-y-3">
              {existingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {req.groupName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted{" "}
                      {new Date(req.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === "pending"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                        : req.status === "approved"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
