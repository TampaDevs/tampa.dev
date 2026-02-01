/**
 * Utility functions
 */

// Pin timezone to Eastern Time (Tampa Bay) so server (UTC) and client
// produce identical output, avoiding React hydration mismatches.
const TZ = "America/New_York";

/**
 * Format a date for display
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
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
    timeZone: TZ,
  });
}

/**
 * Format just the day of month (timezone-aware)
 */
export function formatEventDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: TZ,
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
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Strip Markdown syntax from text, leaving plain text
 */
export function stripMarkdown(md: string): string {
  return md
    // images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // links [text](url)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // bold/italic ***text***, **text**, *text*, ___text___, __text__, _text_
    .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, "$2")
    // strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, "$1")
    // inline code `text`
    .replace(/`([^`]+)`/g, "$1")
    // headings # text
    .replace(/^#{1,6}\s+/gm, "")
    // blockquotes > text
    .replace(/^>\s+/gm, "")
    // unordered list markers - item, * item, + item
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // ordered list markers 1. item
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // horizontal rules ---, ***, ___
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // reference links [text]: url
    .replace(/^\[([^\]]+)\]:\s*.*$/gm, "")
    // collapse multiple whitespace
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
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
 * Check if an event is happening today (in Eastern Time)
 */
export function isToday(dateString: string): boolean {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: TZ });
  return fmt(new Date(dateString)) === fmt(new Date());
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
 * Group events by date (in Eastern Time)
 */
export function groupEventsByDate<T extends { dateTime: string }>(
  events: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const event of events) {
    const dateKey = new Date(event.dateTime).toLocaleDateString("en-US", {
      timeZone: TZ,
    });
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
