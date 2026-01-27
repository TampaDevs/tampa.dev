/**
 * Utility functions
 */
import sanitizeHtml from "sanitize-html";

/**
 * Format a date for display
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time for display
 */
export function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date and time together
 */
export function formatEventDateTime(dateString: string): string {
  return `${formatEventDate(dateString)} at ${formatEventTime(dateString)}`;
}

/**
 * Get relative time string (e.g., "in 2 days", "tomorrow")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "past";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 14) return "next week";
  return formatEventDate(dateString);
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  // Use a robust HTML sanitizer to remove all tags and script content.
  // `allowedTags: []` and `allowedAttributes: {}` ensure only plain text remains.
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
    .replace(/^-|-$/g, "");
}

/**
 * Add UTM parameters to a URL
 */
export function addUtmParams(
  url: string,
  source = "tampa_dev",
  medium = "web",
  campaign = "events"
): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set("utm_source", source);
  urlObj.searchParams.set("utm_medium", medium);
  urlObj.searchParams.set("utm_campaign", campaign);
  return urlObj.toString();
}

/**
 * Check if an event is happening today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if an event is happening this week
 */
export function isThisWeek(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return date >= now && date <= weekFromNow;
}

/**
 * Group events by date
 */
export function groupEventsByDate<T extends { dateTime: string }>(
  events: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const event of events) {
    const dateKey = new Date(event.dateTime).toDateString();
    const existing = grouped.get(dateKey) ?? [];
    existing.push(event);
    grouped.set(dateKey, existing);
  }

  return grouped;
}

/**
 * Get RSVP button label based on event source
 */
export function getRsvpLabel(source?: string): string {
  switch (source) {
    case "eventbrite":
      return "RSVP on Eventbrite";
    case "luma":
      return "RSVP on Luma";
    case "meetup":
    default:
      return "RSVP on Meetup";
  }
}

/**
 * Get source display name
 */
export function getSourceDisplayName(source?: string): string {
  switch (source) {
    case "eventbrite":
      return "Eventbrite";
    case "luma":
      return "Luma";
    case "meetup":
    default:
      return "Meetup";
  }
}
