"use client";

import { useState, useEffect } from "react";
import { AddToCalendarButton } from "add-to-calendar-button-react";
import type { Event } from "~/lib/types";

interface AddToCalendarProps {
  /** For individual events */
  event?: Event;
  /** For group-specific calendar subscription */
  groupUrlname?: string;
  /** Human-readable group name for calendar display */
  groupName?: string;
  /** Custom button label */
  label?: string;
  /** Display style */
  variant?: "default" | "minimal";
  /** Button size - small for inline, large for CTAs */
  size?: "small" | "large";
  /** API base URL (passed from server) */
  apiBase?: string;
}

/**
 * Add to Calendar component
 * - No props: Full Tampa Bay tech events calendar subscription
 * - event: Add individual event to calendar
 * - groupUrlname: Subscribe to a specific group's calendar
 */
export function AddToCalendar({
  event,
  groupUrlname,
  groupName,
  label,
  variant = "default",
  size = "large",
  apiBase = "https://api.tampa.dev/2026-01-25",
}: AddToCalendarProps) {
  // Only render after hydration - the web component mutates its own DOM
  // attributes on init, which always causes a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Individual event
  if (event) {
    const startDate = new Date(event.dateTime);
    const endDate = event.endTime ? new Date(event.endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

    return (
      <AddToCalendarButton
        name={event.title}
        description={event.description || ""}
        startDate={formatDate(startDate)}
        startTime={formatTime(startDate)}
        endDate={formatDate(endDate)}
        endTime={formatTime(endDate)}
        timeZone="America/New_York"
        location={
          event.isOnline
            ? event.eventUrl
            : event.venues?.[0]?.name || event.eventUrl
        }
        options={["Apple", "Google", "iCal", "Microsoft365", "Outlook.com"]}
        label={label || "Add to Calendar"}
        buttonStyle={variant === "minimal" ? "text" : "default"}
        lightMode="bodyScheme"
        styleLight="--btn-background: #E85A4F; --btn-text: #fff; --btn-background-hover: #F07167; --btn-border: none; --btn-shadow: none; --list-background: #fff; --list-text: #1C2438; --font: inherit;"
        styleDark="--btn-background: #E85A4F; --btn-text: #fff; --btn-background-hover: #F07167; --btn-border: none; --btn-shadow: none; --list-background: #1C2438; --list-text: #fff; --font: inherit;"
        hideIconButton={variant === "minimal"}
        size={size === "small" ? "6" : "6"}
      />
    );
  }

  // Calendar subscription (full or group-specific)
  const icsUrl = groupUrlname
    ? `${apiBase}/ics?groups=${groupUrlname}`
    : `${apiBase}/ics`;

  const calendarName = groupUrlname
    ? `${groupName || groupUrlname} Events`
    : "Tampa.dev Community Calendar";

  const calendarDescription = groupUrlname
    ? `Upcoming events from ${groupName || groupUrlname} in Tampa Bay`
    : "All tech meetups, developer events, and community gatherings in the Tampa Bay area - curated by Tampa.dev";

  return (
    <AddToCalendarButton
      name={calendarName}
      description={calendarDescription}
      startDate="today"
      options={["Apple", "Google", "iCal", "Microsoft365", "Outlook.com"]}
      subscribe
      icsFile={icsUrl}
      label={label || "Subscribe to Calendar"}
      buttonStyle={variant === "minimal" ? "text" : "default"}
      lightMode="bodyScheme"
      styleLight="--btn-background: #E85A4F; --btn-text: #fff; --btn-background-hover: #F07167; --btn-border: none; --btn-shadow: none; --list-background: #fff; --list-text: #1C2438; --font: inherit;"
      styleDark="--btn-background: #E85A4F; --btn-text: #fff; --btn-background-hover: #F07167; --btn-border: none; --btn-shadow: none; --list-background: #1C2438; --list-text: #fff; --font: inherit;"
      hideIconButton={variant === "minimal"}
      size={size === "small" ? "4" : "8"}
    />
  );
}
