/**
 * Server-side Admin API client for managing groups and sync operations
 *
 * For local development, set EVENTS_API_URL=http://localhost:8787
 */

const API_HOST = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";
const ADMIN_API_BASE = `${API_HOST}/api/admin`;

// ============== Types ==============

export interface AdminGroup {
  id: string;
  urlname: string;
  name: string;
  description: string | null;
  link: string;
  website: string | null;
  platform: "meetup" | "eventbrite" | "luma";
  platformId: string;
  memberCount: number | null;
  photoUrl: string | null;
  isActive: boolean;
  displayOnSite: boolean;
  isFeatured: boolean | null;
  tags: string[] | null;
  socialLinks: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  eventCount?: number;
}

export interface GroupsListResponse {
  groups: AdminGroup[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SyncLog {
  id: string;
  groupId: string | null;
  platform: string;
  status: "running" | "completed" | "failed";
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SyncStatusResponse {
  groups: {
    total: number;
    active: number;
    byPlatform: {
      meetup: number;
      eventbrite: number;
      luma: number;
    };
  };
  providers: {
    configured: string[];
    status: Record<string, { lastSync?: string; status?: string }>;
  };
  recentSyncs: SyncLog[];
}

export interface SyncResult {
  success: boolean;
  groupsProcessed?: number;
  eventsCreated?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
  errors?: string[];
}

// ============== Groups API ==============

export interface FetchGroupsOptions {
  platform?: "meetup" | "eventbrite" | "luma";
  active?: boolean;
  displayOnSite?: boolean;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAdminGroups(
  options: FetchGroupsOptions = {}
): Promise<GroupsListResponse> {
  const params = new URLSearchParams();

  if (options.platform) params.set("platform", options.platform);
  if (options.active !== undefined) params.set("active", String(options.active));
  if (options.displayOnSite !== undefined)
    params.set("displayOnSite", String(options.displayOnSite));
  if (options.featured !== undefined) params.set("featured", String(options.featured));
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const url = `${ADMIN_API_BASE}/groups${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as GroupsListResponse;
}

export async function fetchAdminGroup(id: string): Promise<AdminGroup | null> {
  const url = `${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as AdminGroup;
}

export interface CreateGroupData {
  urlname: string;
  name: string;
  platform: "meetup" | "eventbrite" | "luma";
  platformId: string;
  description?: string;
  link?: string;
  website?: string;
  isActive?: boolean;
  displayOnSite?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  socialLinks?: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  };
}

export async function createGroup(data: CreateGroupData): Promise<AdminGroup> {
  const response = await fetch(`${ADMIN_API_BASE}/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to create group: ${response.status}`);
  }

  return (await response.json()) as AdminGroup;
}

export interface UpdateGroupData {
  urlname?: string;
  name?: string;
  platformId?: string;
  description?: string;
  link?: string;
  website?: string | null;
  isActive?: boolean;
  displayOnSite?: boolean;
  isFeatured?: boolean;
  tags?: string[] | null;
  socialLinks?: {
    slack?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    meetup?: string;
  } | null;
}

export async function updateGroup(
  id: string,
  data: UpdateGroupData
): Promise<AdminGroup> {
  const response = await fetch(`${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to update group: ${response.status}`);
  }

  return (await response.json()) as AdminGroup;
}

export async function deleteGroup(id: string): Promise<void> {
  const response = await fetch(`${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to delete group: ${response.status}`);
  }
}

// ============== Sync API ==============

export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await fetch(`${ADMIN_API_BASE}/sync/status`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as SyncStatusResponse;
}

export async function triggerSyncAll(): Promise<SyncResult> {
  const response = await fetch(`${ADMIN_API_BASE}/sync/all`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  return (await response.json()) as SyncResult;
}

export async function triggerGroupSync(groupId: string): Promise<SyncResult> {
  const response = await fetch(
    `${ADMIN_API_BASE}/sync/group/${encodeURIComponent(groupId)}`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  return (await response.json()) as SyncResult;
}

export interface FetchSyncLogsOptions {
  groupId?: string;
  limit?: number;
}

export async function fetchSyncLogs(
  options: FetchSyncLogsOptions = {}
): Promise<SyncLog[]> {
  const params = new URLSearchParams();

  if (options.groupId) params.set("groupId", options.groupId);
  if (options.limit) params.set("limit", String(options.limit));

  const url = `${ADMIN_API_BASE}/sync/logs${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const data = (await response.json()) as { logs: SyncLog[] };
  return data.logs;
}

// ============== Auth API ==============

const AUTH_API_BASE = `${API_HOST}/auth`;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  githubUsername?: string;
}

/**
 * Fetch the current authenticated user
 * Note: This requires the cookie header to be forwarded
 */
export async function fetchCurrentUser(
  cookieHeader?: string
): Promise<AuthUser | null> {
  const response = await fetch(`${AUTH_API_BASE}/me`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user: AuthUser | null };
  return data.user;
}

/**
 * Log out the current user
 */
export async function logout(cookieHeader?: string): Promise<void> {
  await fetch(`${AUTH_API_BASE}/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
}

// ============== Users API ==============

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "user" | "admin" | "superadmin";
  createdAt: string;
  updatedAt: string;
  identities: Array<{
    provider: string;
    username: string | null;
  }>;
}

export interface UsersListResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface FetchUsersOptions {
  role?: "user" | "admin" | "superadmin";
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAdminUsers(
  options: FetchUsersOptions = {},
  cookieHeader?: string
): Promise<UsersListResponse> {
  const params = new URLSearchParams();

  if (options.role) params.set("role", options.role);
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const url = `${ADMIN_API_BASE}/users${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as UsersListResponse;
}

export async function fetchAdminUser(
  id: string,
  cookieHeader?: string
): Promise<AdminUser | null> {
  const url = `${ADMIN_API_BASE}/users/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as AdminUser;
}

export async function updateUserRole(
  id: string,
  role: "user" | "admin" | "superadmin",
  cookieHeader?: string
): Promise<AdminUser> {
  const response = await fetch(
    `${ADMIN_API_BASE}/users/${encodeURIComponent(id)}/role`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ role }),
    }
  );

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(
      errorData.error || `Failed to update user role: ${response.status}`
    );
  }

  return (await response.json()) as AdminUser;
}

export async function deleteUser(
  id: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/users/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(
      errorData.error || `Failed to delete user: ${response.status}`
    );
  }
}

// ============== OAuth API ==============

export interface OAuthClient {
  clientId: string;
  clientName: string;
  clientUri?: string;
  logoUri?: string;
  redirectUris: string[];
  registrationDate?: string;
  policyUri?: string;
  tosUri?: string;
  scope?: string;
  grantCount?: number;
}

export interface OAuthClientsListResponse {
  clients: OAuthClient[];
  total: number;
}

export interface OAuthStats {
  clients: number;
  grants: number;
  activeTokens: number;
  pendingCodes: number;
}

export async function fetchOAuthClients(
  cookieHeader?: string
): Promise<OAuthClientsListResponse> {
  const response = await fetch(`${ADMIN_API_BASE}/oauth/clients`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as OAuthClientsListResponse;
}

export async function fetchOAuthClient(
  clientId: string,
  cookieHeader?: string
): Promise<OAuthClient | null> {
  const url = `${ADMIN_API_BASE}/oauth/clients/${encodeURIComponent(clientId)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as OAuthClient;
}

export async function deleteOAuthClient(
  clientId: string,
  cookieHeader?: string
): Promise<{ deletedGrants: number; deletedTokens: number }> {
  const response = await fetch(
    `${ADMIN_API_BASE}/oauth/clients/${encodeURIComponent(clientId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(
      errorData.error || `Failed to delete OAuth client: ${response.status}`
    );
  }

  return (await response.json()) as { deletedGrants: number; deletedTokens: number };
}

export async function fetchOAuthStats(
  cookieHeader?: string
): Promise<OAuthStats> {
  const response = await fetch(`${ADMIN_API_BASE}/oauth/stats`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as OAuthStats;
}
