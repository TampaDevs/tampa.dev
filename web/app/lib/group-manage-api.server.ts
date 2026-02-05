/**
 * Server-side API client for group management endpoints (/groups/manage/*)
 *
 * Used by the group management dashboard (groups.$slug.manage.* routes).
 * Forwards Cookie header for session-based auth.
 */

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
const MANAGE_API_BASE = `${API_HOST}/groups/manage`;

// ============== Types ==============

export interface ManagedGroup {
  id: string;
  urlname: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  heroImageUrl: string | null;
  themeColor: string | null;
  website: string | null;
  tags: string[] | null;
  socialLinks: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  } | null;
  memberCount: number | null;
  maxBadges: number;
  maxBadgePoints: number;
  platform: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRole: "owner" | "manager" | "volunteer" | "member";
  permissions: GroupPermissions;
}

export interface GroupPermissions {
  canEditSettings: boolean;
  canManageMembers: boolean;
  canManageEvents: boolean;
  canCheckIn: boolean;
  canViewDashboard: boolean;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: "owner" | "manager" | "volunteer" | "member";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    email: string;
  } | null;
}

export interface ManagedEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  timezone: string;
  eventType: "physical" | "online" | "hybrid";
  status: "active" | "draft" | "cancelled";
  platform: "meetup" | "eventbrite" | "luma" | "tampa.dev";
  maxAttendees: number | null;
  photoUrl: string | null;
  duration: string | null;
  venue: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    lat: number | null;
    lon: number | null;
  } | null;
  rsvpSummary: {
    confirmed: number;
    waitlisted: number;
    cancelled: number;
  };
  checkinCount: number;
  createdAt: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  timezone?: string;
  eventType?: "physical" | "online" | "hybrid";
  maxAttendees?: number;
  photoUrl?: string;
  status?: "active" | "draft";
  venue?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  };
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  urlname?: string;
  website?: string;
  tags?: string[];
  socialLinks?: Record<string, string>;
  photoUrl?: string;
  heroImageUrl?: string;
  themeColor?: string;
}

export interface GroupBadge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  points: number;
  groupId: string;
  userCount: number;
  createdAt: string;
}

export interface CreateBadgeData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  points: number;
}

export interface BadgeClaimLink {
  id: string;
  code: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CheckinCode {
  id: string;
  code: string;
  eventId: string;
  eventTitle?: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface Attendee {
  rsvpId: string;
  userId: string;
  rsvpStatus: "confirmed" | "waitlisted" | "cancelled";
  checkedIn: boolean;
  checkedInAt: string | null;
  checkinMethod: string | null;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface UserRole {
  role: "owner" | "manager" | "volunteer" | "member" | "none";
  permissions: GroupPermissions;
}

// ============== Helpers ==============

/** Resolve a group slug to its ID via the public groups endpoint */
export async function resolveGroupIdFromSlug(
  slug: string
): Promise<{ id: string } | null> {
  const response = await fetch(`${API_HOST}/groups/${slug}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

function headers(cookieHeader?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (cookieHeader) h.Cookie = cookieHeader;
  return h;
}

function jsonHeaders(cookieHeader?: string | null): Record<string, string> {
  return { ...headers(cookieHeader), "Content-Type": "application/json" };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      (errorData as { error?: string }).error || `Request failed: ${response.status}`
    );
  }
  const json = (await response.json()) as { data: T };
  return json.data;
}

// ============== Group Management ==============

/** List groups the current user can manage */
export async function fetchManagedGroups(
  cookieHeader?: string | null
): Promise<ManagedGroup[]> {
  const response = await fetch(MANAGE_API_BASE, {
    headers: headers(cookieHeader),
  });
  return handleResponse<ManagedGroup[]>(response);
}

/** Get details for a managed group */
export async function fetchManagedGroup(
  groupId: string,
  cookieHeader?: string | null
): Promise<ManagedGroup> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<ManagedGroup>(response);
}

/** Get user's role and permissions in a group */
export async function fetchMyRole(
  groupId: string,
  cookieHeader?: string | null
): Promise<UserRole> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/my-role`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<UserRole>(response);
}

/** Update group settings */
export async function updateGroupSettings(
  groupId: string,
  data: UpdateGroupData,
  cookieHeader?: string | null
): Promise<ManagedGroup> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}`, {
    method: "PUT",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(data),
  });
  return handleResponse<ManagedGroup>(response);
}

// ============== Members ==============

/** List group members */
export async function fetchMembers(
  groupId: string,
  cookieHeader?: string | null
): Promise<GroupMember[]> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/members`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<GroupMember[]>(response);
}

/** Invite a member to the group */
export async function inviteMember(
  groupId: string,
  userId: string,
  cookieHeader?: string | null
): Promise<GroupMember> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/members`, {
    method: "POST",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify({ userId }),
  });
  return handleResponse<GroupMember>(response);
}

/** Update a member's role */
export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/members/${memberId}`, {
    method: "PATCH",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify({ role }),
  });
  await handleResponse<unknown>(response);
}

/** Remove a member from the group */
export async function removeMember(
  groupId: string,
  memberId: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/members/${memberId}`, {
    method: "DELETE",
    headers: headers(cookieHeader),
  });
  await handleResponse<unknown>(response);
}

/** Leave the group */
export async function leaveGroup(
  groupId: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/leave`, {
    method: "POST",
    headers: headers(cookieHeader),
  });
  await handleResponse<unknown>(response);
}

// ============== Events ==============

/** List events for a managed group */
export async function fetchManagedEvents(
  groupId: string,
  cookieHeader?: string | null
): Promise<ManagedEvent[]> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/events`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<ManagedEvent[]>(response);
}

/** Get event details for a managed group */
export async function fetchManagedEvent(
  groupId: string,
  eventId: string,
  cookieHeader?: string | null
): Promise<ManagedEvent> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/events/${eventId}`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<ManagedEvent>(response);
}

/** Create a new event */
export async function createEvent(
  groupId: string,
  data: CreateEventData,
  cookieHeader?: string | null
): Promise<{ event: ManagedEvent; checkinCode?: string }> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/events`, {
    method: "POST",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(data),
  });
  return handleResponse<{ event: ManagedEvent; checkinCode?: string }>(response);
}

/** Update an event */
export async function updateEvent(
  groupId: string,
  eventId: string,
  data: UpdateEventData,
  cookieHeader?: string | null
): Promise<ManagedEvent> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/events/${eventId}`, {
    method: "PUT",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(data),
  });
  return handleResponse<ManagedEvent>(response);
}

/** Cancel an event */
export async function cancelEvent(
  groupId: string,
  eventId: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/events/${eventId}/cancel`, {
    method: "POST",
    headers: headers(cookieHeader),
  });
  await handleResponse<unknown>(response);
}

// ============== Badges ==============

/** List group badges */
export async function fetchBadges(
  groupId: string,
  cookieHeader?: string | null
): Promise<GroupBadge[]> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<GroupBadge[]>(response);
}

/** Create a group badge */
export async function createBadge(
  groupId: string,
  data: CreateBadgeData,
  cookieHeader?: string | null
): Promise<GroupBadge> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges`, {
    method: "POST",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(data),
  });
  return handleResponse<GroupBadge>(response);
}

/** Update a group badge */
export async function updateBadge(
  groupId: string,
  badgeId: string,
  data: Partial<CreateBadgeData>,
  cookieHeader?: string | null
): Promise<GroupBadge> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges/${badgeId}`, {
    method: "PATCH",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(data),
  });
  return handleResponse<GroupBadge>(response);
}

/** Delete a group badge */
export async function deleteBadge(
  groupId: string,
  badgeId: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges/${badgeId}`, {
    method: "DELETE",
    headers: headers(cookieHeader),
  });
  await handleResponse<unknown>(response);
}

/** Generate a claim link for a badge */
export async function generateBadgeClaimLink(
  groupId: string,
  badgeId: string,
  options?: { maxUses?: number; expiresAt?: string },
  cookieHeader?: string | null
): Promise<BadgeClaimLink> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges/${badgeId}/claim-links`, {
    method: "POST",
    headers: jsonHeaders(cookieHeader),
    body: JSON.stringify(options || {}),
  });
  return handleResponse<BadgeClaimLink>(response);
}

/** List claim links for a badge */
export async function fetchBadgeClaimLinks(
  groupId: string,
  badgeId: string,
  cookieHeader?: string | null
): Promise<BadgeClaimLink[]> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/badges/${badgeId}/claim-links`, {
    headers: headers(cookieHeader),
  });
  return handleResponse<BadgeClaimLink[]>(response);
}

// ============== Checkin Codes ==============

/** List checkin codes for an event */
export async function fetchCheckinCodes(
  groupId: string,
  eventId: string,
  cookieHeader?: string | null
): Promise<CheckinCode[]> {
  const response = await fetch(
    `${MANAGE_API_BASE}/${groupId}/events/${eventId}/checkin-codes`,
    { headers: headers(cookieHeader) }
  );
  return handleResponse<CheckinCode[]>(response);
}

/** Generate a new checkin code */
export async function generateCheckinCode(
  groupId: string,
  eventId: string,
  options?: { maxUses?: number; expiresAt?: string },
  cookieHeader?: string | null
): Promise<CheckinCode> {
  const response = await fetch(
    `${MANAGE_API_BASE}/${groupId}/events/${eventId}/checkin-codes`,
    {
      method: "POST",
      headers: jsonHeaders(cookieHeader),
      body: JSON.stringify(options || {}),
    }
  );
  return handleResponse<CheckinCode>(response);
}

/** Delete a checkin code */
export async function deleteCheckinCode(
  groupId: string,
  codeId: string,
  cookieHeader?: string | null
): Promise<void> {
  const response = await fetch(`${MANAGE_API_BASE}/${groupId}/checkin-codes/${codeId}`, {
    method: "DELETE",
    headers: headers(cookieHeader),
  });
  await handleResponse<unknown>(response);
}

/** List attendees for an event */
export async function fetchAttendees(
  groupId: string,
  eventId: string,
  cookieHeader?: string | null
): Promise<Attendee[]> {
  const response = await fetch(
    `${MANAGE_API_BASE}/${groupId}/events/${eventId}/attendees`,
    { headers: headers(cookieHeader) }
  );
  return handleResponse<Attendee[]>(response);
}
