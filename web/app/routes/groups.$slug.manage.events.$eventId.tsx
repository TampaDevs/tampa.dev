/**
 * Group Management — Event Detail/Edit
 *
 * Tabbed view: Details (edit form), Attendees, and Checkin Codes.
 * Supports multiple action intents for update, cancel, and checkin code management.
 */

import type { Route } from "./+types/groups.$slug.manage.events.$eventId";
import { Link, redirect, useOutletContext, useSearchParams, useFetcher, data } from "react-router";
import { useState } from "react";
import {
  fetchManagedEvent,
  fetchAttendees,
  fetchCheckinCodes,
  updateEvent,
  cancelEvent,
  generateCheckinCode,
  deleteCheckinCode,
} from "~/lib/group-manage-api.server";
import type {
  ManagedGroup,
  ManagedEvent,
  Attendee,
  CheckinCode,
  UpdateEventData,
} from "~/lib/group-manage-api.server";
import { EventForm } from "~/components/EventForm";
import { AttendeeList } from "~/components/AttendeeList";

type TabKey = "details" | "attendees" | "checkin-codes";

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  const [event, attendees, checkinCodes] = await Promise.all([
    fetchManagedEvent(groupId, params.eventId!, cookieHeader),
    fetchAttendees(groupId, params.eventId!, cookieHeader),
    fetchCheckinCodes(groupId, params.eventId!, cookieHeader),
  ]);

  return { event, attendees, checkinCodes };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function action({ params, request }: Route.ActionArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;
  const eventId = params.eventId!;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // --- Update Event ---
  if (intent === "updateEvent") {
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string) || undefined;
    const startTime = formData.get("startTime") as string;
    const endTime = (formData.get("endTime") as string) || undefined;
    const timezone = (formData.get("timezone") as string) || "America/New_York";
    const eventType = (formData.get("eventType") as "physical" | "online" | "hybrid") || "physical";
    const maxAttendeesRaw = formData.get("maxAttendees") as string;
    const maxAttendees = maxAttendeesRaw ? parseInt(maxAttendeesRaw, 10) : undefined;
    const photoUrl = (formData.get("photoUrl") as string) || undefined;
    const status = (formData.get("status") as "active" | "draft") || "draft";

    const venueName = formData.get("venueName") as string;
    let venue: UpdateEventData["venue"] = undefined;
    if ((eventType === "physical" || eventType === "hybrid") && venueName) {
      const venueLat = formData.get("venueLat") as string;
      const venueLon = formData.get("venueLon") as string;
      venue = {
        name: venueName,
        address: (formData.get("venueAddress") as string) || undefined,
        city: (formData.get("venueCity") as string) || undefined,
        state: (formData.get("venueState") as string) || undefined,
        lat: venueLat ? parseFloat(venueLat) : undefined,
        lon: venueLon ? parseFloat(venueLon) : undefined,
      };
    }

    const startIso = startTime ? new Date(startTime).toISOString() : "";
    const endIso = endTime ? new Date(endTime).toISOString() : undefined;

    const eventData: UpdateEventData = {
      title,
      description,
      startTime: startIso,
      endTime: endIso,
      timezone,
      eventType,
      maxAttendees,
      photoUrl,
      status,
      venue,
    };

    try {
      await updateEvent(groupId, eventId, eventData, cookieHeader);
      return data({ success: true, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update event";
      return data({ success: false, error: message }, { status: 400 });
    }
  }

  // --- Cancel Event ---
  if (intent === "cancelEvent") {
    try {
      await cancelEvent(groupId, eventId, cookieHeader);
      return redirect(`/groups/${params.slug}/manage/events`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel event";
      return data({ success: false, error: message }, { status: 400 });
    }
  }

  // --- Generate Checkin Code ---
  if (intent === "generateCheckinCode") {
    const maxUsesRaw = formData.get("maxUses") as string;
    const expiresAt = (formData.get("expiresAt") as string) || undefined;
    const options: { maxUses?: number; expiresAt?: string } = {};
    if (maxUsesRaw) options.maxUses = parseInt(maxUsesRaw, 10);
    if (expiresAt) options.expiresAt = new Date(expiresAt).toISOString();

    try {
      await generateCheckinCode(groupId, eventId, options, cookieHeader);
      return data({ success: true, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate code";
      return data({ success: false, error: message }, { status: 400 });
    }
  }

  // --- Delete Checkin Code ---
  if (intent === "deleteCheckinCode") {
    const codeId = formData.get("codeId") as string;
    try {
      await deleteCheckinCode(groupId, codeId, cookieHeader);
      return data({ success: true, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete code";
      return data({ success: false, error: message }, { status: 400 });
    }
  }

  return data({ success: false, error: "Unknown action" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TAB_ITEMS: { key: TabKey; label: string; icon: string }[] = [
  {
    key: "details",
    label: "Details",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    key: "attendees",
    label: "Attendees",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    key: "checkin-codes",
    label: "Checkin Codes",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

export default function EventDetailPage({ loaderData }: Route.ComponentProps) {
  const { event, attendees, checkinCodes } = loaderData;
  const group = useOutletContext<ManagedGroup>();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "details";

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cancelFetcher = useFetcher();
  const isCancelling = cancelFetcher.state !== "idle";

  function handleTabChange(tab: TabKey) {
    if (tab === "details") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/groups/${group.urlname}/manage/events`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {event.title}
        </h2>
        {event.status !== "cancelled" && (
          <div className="flex items-center gap-2">
            {/* Cancel button */}
            {event.status === "active" && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Event
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-5">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 dark:text-red-300">
                Cancel this event?
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                This will cancel &ldquo;{event.title}&rdquo; and notify all attendees. This
                action cannot be undone.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <cancelFetcher.Form method="post">
                  <input type="hidden" name="intent" value="cancelEvent" />
                  <button
                    type="submit"
                    disabled={isCancelling}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isCancelling ? "Cancelling..." : "Yes, Cancel Event"}
                  </button>
                </cancelFetcher.Form>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Keep Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-coral text-coral"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
              {tab.key === "attendees" && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  ({attendees.length})
                </span>
              )}
              {tab.key === "checkin-codes" && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  ({checkinCodes.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <DetailsTab event={event} />
      )}

      {activeTab === "attendees" && (
        <AttendeesTab attendees={attendees} />
      )}

      {activeTab === "checkin-codes" && (
        <CheckinCodesTab checkinCodes={checkinCodes} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details Tab
// ---------------------------------------------------------------------------

function DetailsTab({ event }: { event: ManagedEvent }) {
  return (
    <EventForm
      defaultValues={{
        title: event.title,
        description: event.description ?? undefined,
        startTime: event.startTime,
        endTime: event.endTime ?? undefined,
        timezone: event.timezone,
        eventType: event.eventType,
        maxAttendees: event.maxAttendees,
        photoUrl: event.photoUrl ?? undefined,
        status: event.status === "cancelled" ? "active" : event.status,
        venue: event.venue
          ? {
              name: event.venue.name,
              address: event.venue.address ?? undefined,
              city: event.venue.city ?? undefined,
              state: event.venue.state ?? undefined,
              lat: event.venue.lat ?? undefined,
              lon: event.venue.lon ?? undefined,
            }
          : undefined,
      }}
      submitLabel="Update Event"
      intent="updateEvent"
    />
  );
}

// ---------------------------------------------------------------------------
// Attendees Tab
// ---------------------------------------------------------------------------

function AttendeesTab({ attendees }: { attendees: Attendee[] }) {
  return <AttendeeList attendees={attendees} />;
}

// ---------------------------------------------------------------------------
// Checkin Codes Tab
// ---------------------------------------------------------------------------

function CheckinCodesTab({ checkinCodes }: { checkinCodes: CheckinCode[] }) {
  const generateFetcher = useFetcher();
  const isGenerating = generateFetcher.state !== "idle";

  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function handleCopyLink(code: string) {
    const url = `https://events.tampa.dev/checkin/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  function formatExpiry(iso: string | null): string {
    if (!iso) return "No expiry";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generate checkin codes that attendees can use to check in via link, QR code, or NFC.
        </p>
        <button
          type="button"
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white rounded-lg transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Code
        </button>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Generate Checkin Code
          </h4>
          <generateFetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="generateCheckinCode" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="maxUses"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Max Uses
                </label>
                <input
                  id="maxUses"
                  name="maxUses"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank for unlimited uses.
                </p>
              </div>

              <div>
                <label
                  htmlFor="expiresAt"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Expires At
                </label>
                <input
                  id="expiresAt"
                  name="expiresAt"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank for no expiry.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate Code"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </generateFetcher.Form>
        </div>
      )}

      {/* Codes List */}
      {checkinCodes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No checkin codes yet.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Generate a code to let attendees check in.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkinCodes.map((code) => (
            <CheckinCodeCard
              key={code.id}
              code={code}
              copiedCode={copiedCode}
              onCopyLink={handleCopyLink}
              formatExpiry={formatExpiry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checkin Code Card
// ---------------------------------------------------------------------------

function CheckinCodeCard({
  code,
  copiedCode,
  onCopyLink,
  formatExpiry,
}: {
  code: CheckinCode;
  copiedCode: string | null;
  onCopyLink: (code: string) => void;
  formatExpiry: (iso: string | null) => string;
}) {
  const deleteFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== "idle";
  const isCopied = copiedCode === code.code;

  const checkinUrl = `https://events.tampa.dev/checkin/${code.code}`;
  const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
  const isMaxedOut = code.maxUses !== null && code.currentUses >= code.maxUses;
  const isUsable = !isExpired && !isMaxedOut;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border p-4 ${
        isUsable
          ? "border-gray-200 dark:border-gray-800"
          : "border-gray-200 dark:border-gray-800 opacity-60"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Code info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-900 dark:text-white">
              {code.code}
            </code>
            {isExpired && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                Expired
              </span>
            )}
            {isMaxedOut && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                Max Uses Reached
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Uses: {code.currentUses}
              {code.maxUses !== null && ` / ${code.maxUses}`}
            </span>
            <span>Expires: {formatExpiry(code.expiresAt)}</span>
            <span>
              Created:{" "}
              {new Date(code.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "America/New_York",
              })}
            </span>
          </div>

          <div className="mt-2">
            <input
              type="text"
              readOnly
              value={checkinUrl}
              className="w-full text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400 font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy Link */}
          <button
            type="button"
            onClick={() => onCopyLink(code.code)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              isCopied
                ? "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {isCopied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </>
            )}
          </button>

          {/* Delete */}
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="deleteCheckinCode" />
            <input type="hidden" name="codeId" value={code.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete code"
            >
              {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </deleteFetcher.Form>
        </div>
      </div>
    </div>
  );
}
