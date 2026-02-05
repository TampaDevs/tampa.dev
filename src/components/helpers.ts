/**
 * Template helper functions for JSX components
 */
import { photoUrl, toLocalDate, markdownToHtml, trunc } from '../../lib/utils.js';
import type { Event } from '../../models/index.js';

/**
 * Get photo URL from event or group photo
 */
export function getPhotoUrl(event: Event): string | null {
  const photo = event.photo || event.group.photo;
  if (!photo) return null;
  return photoUrl(photo);
}

/**
 * Format date to local string
 */
export function formatDate(date: Date, timeZone?: string): string {
  return toLocalDate(date.toISOString(), timeZone);
}

/**
 * Add UTM parameters to URL
 */
export function addUtm(url: string): string {
  return `${url}?utm_source=td_events_api_widget&utm_medium=organic&utm_campaign=td_events_api_widget_embed`;
}

/**
 * Render short description (truncated markdown)
 */
export function renderShortDescription(description: string | undefined): string {
  return markdownToHtml(trunc(description || '', 100));
}

/**
 * Render full description as HTML
 */
export function renderLongDescription(description: string | undefined): string {
  return markdownToHtml(description || '');
}
