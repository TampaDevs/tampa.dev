/**
 * Group Checkin Code Management Page
 *
 * Allows group owners and managers to generate, view, and delete
 * checkin codes for their events, including QR codes for easy scanning.
 */

import { useState } from "react";
import { useFetcher, useOutletContext, data } from "react-router";
import type { Route } from "./+types/groups.$slug.manage.checkins";
import {
  fetchManagedGroup,
  fetchManagedEvents,
  fetchCheckinCodes,
  generateCheckinCode,
  deleteCheckinCode,
} from "~/lib/group-manage-api.server";
import type {
  ManagedGroup,
  ManagedEvent,
  CheckinCode,
  GroupPermissions,
} from "~/lib/group-manage-api.server";
import { QrCodeDisplay } from "~/components/QrCodeDisplay";

// ---------- Types ----------

interface EventWithCodes {
  event: ManagedEvent;
  codes: CheckinCode[];
}

// ---------- Loader ----------

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  // Resolve group ID from public slug endpoint
  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  const [group, events] = await Promise.all([
    fetchManagedGroup(groupId, cookieHeader),
    fetchManagedEvents(groupId, cookieHeader),
  ]);

  // Filter to upcoming/active events (events that haven't ended yet or are active)
  const now = new Date();
  const relevantEvents = events.filter((event) => {
    if (event.status === "cancelled") return false;
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const startTime = new Date(event.startTime);
    // Include events that end in the future, or if no end time, started within the last 24 hours
    if (endTime) return endTime >= now;
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return startTime >= twentyFourHoursAgo;
  });

  // Fetch checkin codes for each relevant event
  const eventsWithCodes: EventWithCodes[] = await Promise.all(
    relevantEvents.map(async (event) => {
      try {
        const codes = await fetchCheckinCodes(groupId, event.id, cookieHeader);
        return { event, codes };
      } catch {
        return { event, codes: [] };
      }
    })
  );

  return { group, eventsWithCodes, groupId };
}

// ---------- Action ----------

export async function action({ params, request }: Route.ActionArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Resolve group ID
  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  if (intent === "generateCode") {
    const eventId = formData.get("eventId") as string;
    const maxUsesRaw = formData.get("maxUses") as string;
    const expiresAt = formData.get("expiresAt") as string;

    const options: { maxUses?: number; expiresAt?: string } = {};
    if (maxUsesRaw) options.maxUses = Number(maxUsesRaw);
    if (expiresAt) options.expiresAt = expiresAt;

    try {
      await generateCheckinCode(groupId, eventId, options, cookieHeader);
      return { success: true, intent: "generateCode" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate checkin code",
      };
    }
  }

  if (intent === "deleteCode") {
    const codeId = formData.get("codeId") as string;
    try {
      await deleteCheckinCode(groupId, codeId, cookieHeader);
      return { success: true, intent: "deleteCode" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete checkin code",
      };
    }
  }

  return { success: false, error: "Unknown action" };
}

// ---------- Generate Code Form ----------

function GenerateCodeForm({ eventId }: { eventId: string }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Generate New Code
      </button>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      {actionData?.error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-3">
        <input type="hidden" name="intent" value="generateCode" />
        <input type="hidden" name="eventId" value={eventId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`code-max-${eventId}`}
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Max Uses (optional)
            </label>
            <input
              id={`code-max-${eventId}`}
              name="maxUses"
              type="number"
              min="1"
              placeholder="Unlimited"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
          <div>
            <label
              htmlFor={`code-expires-${eventId}`}
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Expires At (optional)
            </label>
            <input
              id={`code-expires-${eventId}`}
              name="expiresAt"
              type="datetime-local"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3 py-1.5 text-sm bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Generating..." : "Generate Code"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

// ---------- Checkin Code Card ----------

function CheckinCodeCard({ code }: { code: CheckinCode }) {
  const deleteFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== "idle";
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const checkinUrl = `https://events.tampa.dev/checkin/${code.code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback silently
    }
  };

  const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
  const isMaxedOut = code.maxUses !== null && code.currentUses >= code.maxUses;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${
        isExpired || isMaxedOut
          ? "border-gray-300 dark:border-gray-600 opacity-60"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Code display */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <code className="text-2xl font-mono font-bold tracking-wider text-gray-900 dark:text-white">
            {code.code}
          </code>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {code.currentUses} / {code.maxUses !== null ? code.maxUses : "\u221E"} uses
            </span>
            {code.expiresAt && (
              <span className={isExpired ? "text-red-500 dark:text-red-400" : ""}>
                {isExpired ? "Expired" : "Expires"}{" "}
                {new Date(code.expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {isMaxedOut && (
              <span className="text-amber-500 dark:text-amber-400 font-medium">
                Max uses reached
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(isExpired || isMaxedOut) && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          {copiedCode ? (
            <>
              <svg
                className="w-4 h-4 text-green-500"
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
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy Link
            </>
          )}
        </button>

        <button
          onClick={() => setShowQr(!showQr)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          {showQr ? "Hide QR" : "Show QR"}
        </button>

        <deleteFetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm("Delete this checkin code? Users will no longer be able to use it.")) {
              e.preventDefault();
            }
          }}
          className="ml-auto"
        >
          <input type="hidden" name="intent" value="deleteCode" />
          <input type="hidden" name="codeId" value={code.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </deleteFetcher.Form>
      </div>

      {/* QR code display */}
      {showQr && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
          <QrCodeDisplay value={checkinUrl} size={200} />
        </div>
      )}
    </div>
  );
}

// ---------- Event Section ----------

function EventSection({ eventWithCodes }: { eventWithCodes: EventWithCodes }) {
  const { event, codes } = eventWithCodes;

  const eventDate = new Date(event.startTime).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isUpcoming = new Date(event.startTime) > new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Event header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {eventDate}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1.5">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.venue.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isUpcoming
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                  : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              }`}
            >
              {isUpcoming ? "Upcoming" : "Active"}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {event.checkinCount} checkin{event.checkinCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Codes list */}
      <div className="p-4 space-y-4">
        {codes.length > 0 ? (
          <div className="space-y-3">
            {codes.map((code) => (
              <CheckinCodeCard key={code.id} code={code} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No checkin codes generated for this event yet.
          </p>
        )}

        {/* Generate new code button */}
        <div className="pt-2">
          <GenerateCodeForm eventId={event.id} />
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function GroupManageCheckinsPage({ loaderData }: Route.ComponentProps) {
  const { group, eventsWithCodes } = loaderData;
  const context = useOutletContext<{ group: ManagedGroup; permissions: GroupPermissions }>();

  const totalCodes = eventsWithCodes.reduce((sum, ec) => sum + ec.codes.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Checkin Codes</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalCodes} active code{totalCodes !== 1 ? "s" : ""} across{" "}
            {eventsWithCodes.length} event{eventsWithCodes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-navy/5 dark:bg-navy/20 rounded-xl border border-navy/10 dark:border-navy/30">
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
            <p>
              Generate checkin codes for your events. Share the code or QR code with attendees
              so they can check in. Each code can optionally have a usage limit and expiration.
            </p>
          </div>
        </div>
      </div>

      {/* Events with codes */}
      {eventsWithCodes.length > 0 ? (
        <div className="space-y-6">
          {eventsWithCodes.map((ec) => (
            <EventSection key={ec.event.id} eventWithCodes={ec} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">No upcoming events</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Checkin codes are available for upcoming and active events. Create an event first, then
            come back to generate checkin codes.
          </p>
        </div>
      )}
    </div>
  );
}
