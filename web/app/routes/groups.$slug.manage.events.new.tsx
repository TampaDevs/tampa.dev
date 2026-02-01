/**
 * Group Management — Create Event
 *
 * Renders the EventForm for creating a new event in the managed group.
 */

import type { Route } from "./+types/groups.$slug.manage.events.new";
import { Link, redirect, useOutletContext, data } from "react-router";
import { createEvent } from "~/lib/group-manage-api.server";
import type { ManagedGroup, CreateEventData } from "~/lib/group-manage-api.server";
import { EventForm } from "~/components/EventForm";

export async function action({ params, request }: Route.ActionArgs) {
  const apiHost = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || undefined;

  // Resolve group ID from slug
  const groupRes = await fetch(`${apiHost}/groups/${params.slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!groupRes.ok) throw data(null, { status: 404 });
  const groupData = (await groupRes.json()) as { id: string };
  const groupId = groupData.id;

  const formData = await request.formData();

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

  // Build venue object for physical/hybrid events
  const venueName = formData.get("venueName") as string;
  let venue: CreateEventData["venue"] = undefined;
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

  // Convert datetime-local to ISO string
  const startIso = startTime ? new Date(startTime).toISOString() : "";
  const endIso = endTime ? new Date(endTime).toISOString() : undefined;

  const eventData: CreateEventData = {
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
    await createEvent(groupId, eventData, cookieHeader);
    return redirect(`/groups/${params.slug}/manage/events`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create event";
    return data({ success: false, error: message }, { status: 400 });
  }
}

export default function CreateEventPage() {
  const group = useOutletContext<ManagedGroup>();

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

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Create Event
      </h2>

      <EventForm
        submitLabel="Create Event"
        intent="createEvent"
      />
    </div>
  );
}
