/**
 * EventForm — reusable event creation/editing form component.
 *
 * Uses the useFetcher pattern so it can be embedded in any route
 * without requiring a dedicated <Form> action on the page itself.
 */

import { useFetcher } from "react-router";
import { useState, useEffect } from "react";

interface EventFormProps {
  defaultValues?: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    eventType?: "physical" | "online" | "hybrid";
    maxAttendees?: number | null;
    photoUrl?: string;
    status?: "active" | "draft";
    venue?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      lat?: number;
      lon?: number;
    };
  };
  submitLabel?: string;
  intent?: string;
  isSubmitting?: boolean;
  error?: string | null;
}

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const inputClass =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent";

const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

/**
 * Converts an ISO datetime string to a value suitable for datetime-local inputs
 * (YYYY-MM-DDTHH:mm format, no timezone offset).
 */
function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function EventForm({
  defaultValues,
  submitLabel = "Create Event",
  intent = "createEvent",
  isSubmitting: externalSubmitting,
  error: externalError,
}: EventFormProps) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();

  const [eventType, setEventType] = useState<"physical" | "online" | "hybrid">(
    defaultValues?.eventType ?? "physical"
  );

  // Reset event type if defaultValues change (e.g. navigating between events)
  useEffect(() => {
    if (defaultValues?.eventType) {
      setEventType(defaultValues.eventType);
    }
  }, [defaultValues?.eventType]);

  const isBusy = externalSubmitting ?? fetcher.state !== "idle";
  const fetcherError =
    fetcher.data && !fetcher.data.success ? fetcher.data.error : null;
  const displayError = externalError ?? fetcherError;

  const showVenue = eventType === "physical" || eventType === "hybrid";

  return (
    <fetcher.Form method="post" className="space-y-8">
      <input type="hidden" name="intent" value={intent} />

      {/* ---- Error Banner ---- */}
      {displayError && (
        <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
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
            <p className="text-sm text-red-700 dark:text-red-300">{displayError}</p>
          </div>
        </div>
      )}

      {/* ---- Basic Info ---- */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h3>

        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={defaultValues?.title ?? ""}
            placeholder="e.g. Tampa.dev Monthly Meetup"
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={10000}
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Describe the event..."
            className={inputClass}
          />
        </div>

        {/* Photo URL */}
        <div>
          <label htmlFor="photoUrl" className={labelClass}>
            Photo URL
          </label>
          <input
            id="photoUrl"
            name="photoUrl"
            type="url"
            defaultValue={defaultValues?.photoUrl ?? ""}
            placeholder="https://example.com/photo.jpg"
            className={inputClass}
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "draft"}
            className={inputClass}
          >
            <option value="draft">Draft</option>
            <option value="active">Active (Published)</option>
          </select>
        </div>
      </section>

      {/* ---- Date & Time ---- */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Date &amp; Time
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Start Time */}
          <div>
            <label htmlFor="startTime" className={labelClass}>
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="startTime"
              name="startTime"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocal(defaultValues?.startTime)}
              className={inputClass}
            />
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className={labelClass}>
              End Time
            </label>
            <input
              id="endTime"
              name="endTime"
              type="datetime-local"
              defaultValue={toDatetimeLocal(defaultValues?.endTime)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className={labelClass}>
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={defaultValues?.timezone ?? "America/New_York"}
            className={inputClass}
          >
            {US_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ---- Event Type & Capacity ---- */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Event Type &amp; Capacity
        </h3>

        {/* Event Type */}
        <fieldset>
          <legend className={labelClass}>Event Type</legend>
          <div className="flex flex-wrap gap-4 mt-1">
            {(["physical", "online", "hybrid"] as const).map((type) => (
              <label
                key={type}
                className="inline-flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="eventType"
                  value={type}
                  checked={eventType === type}
                  onChange={() => setEventType(type)}
                  className="text-coral focus:ring-coral"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {type === "physical" ? "In-Person" : type === "online" ? "Online" : "Hybrid"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Max Attendees */}
        <div>
          <label htmlFor="maxAttendees" className={labelClass}>
            Max Attendees
          </label>
          <input
            id="maxAttendees"
            name="maxAttendees"
            type="number"
            min={1}
            defaultValue={defaultValues?.maxAttendees ?? ""}
            placeholder="Leave blank for unlimited"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave blank for unlimited capacity.
          </p>
        </div>
      </section>

      {/* ---- Venue (shown for physical/hybrid) ---- */}
      {showVenue && (
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Venue
          </h3>

          {/* Venue Name */}
          <div>
            <label htmlFor="venueName" className={labelClass}>
              Venue Name{" "}
              {eventType === "physical" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <input
              id="venueName"
              name="venueName"
              type="text"
              required={eventType === "physical"}
              defaultValue={defaultValues?.venue?.name ?? ""}
              placeholder="e.g. Tampa Convention Center"
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="venueAddress" className={labelClass}>
              Address
            </label>
            <input
              id="venueAddress"
              name="venueAddress"
              type="text"
              defaultValue={defaultValues?.venue?.address ?? ""}
              placeholder="123 Main St"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* City */}
            <div>
              <label htmlFor="venueCity" className={labelClass}>
                City
              </label>
              <input
                id="venueCity"
                name="venueCity"
                type="text"
                defaultValue={defaultValues?.venue?.city ?? ""}
                placeholder="Tampa"
                className={inputClass}
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="venueState" className={labelClass}>
                State
              </label>
              <input
                id="venueState"
                name="venueState"
                type="text"
                defaultValue={defaultValues?.venue?.state ?? ""}
                placeholder="FL"
                className={inputClass}
              />
            </div>
          </div>

          {/* Hidden lat/lon */}
          <input
            type="hidden"
            name="venueLat"
            defaultValue={defaultValues?.venue?.lat ?? ""}
          />
          <input
            type="hidden"
            name="venueLon"
            defaultValue={defaultValues?.venue?.lon ?? ""}
          />
        </section>
      )}

      {/* ---- Submit ---- */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center gap-2 bg-gradient-to-b from-coral to-coral-dark hover:from-coral-light hover:to-coral text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy && (
            <svg
              className="w-4 h-4 animate-spin"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isBusy ? "Saving..." : submitLabel}
        </button>
      </div>
    </fetcher.Form>
  );
}
