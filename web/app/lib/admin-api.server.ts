/**
 * Server-side Admin API client for managing groups and sync operations
 *
 * For local development, set EVENTS_API_URL=http://localhost:8787
 */

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
const ADMIN_API_BASE = `${API_HOST}/admin`;

// ============== Types ==============

export interface AdminGroup {
  id: string;
  urlname: string;
  name: string;
  description: string | null;
  link: string;
  website: string | null;
  platform: "meetup" | "eventbrite" | "luma" | "tampa.dev";
  platformId: string;
  memberCount: number | null;
  photoUrl: string | null;
  isActive: boolean;
  displayOnSite: boolean;
  isFeatured: boolean | null;
  maxBadges: number;
  maxBadgePoints: number;
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
  data: AdminGroup[];
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
  groupName: string | null;
  groupUrlname: string | null;
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
  platform?: "meetup" | "eventbrite" | "luma" | "tampa.dev";
  active?: boolean;
  displayOnSite?: boolean;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAdminGroups(
  options: FetchGroupsOptions = {},
  cookieHeader?: string
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
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as GroupsListResponse;
}

export async function fetchAdminGroup(id: string, cookieHeader?: string): Promise<AdminGroup | null> {
  const url = `${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`;

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

  const json = (await response.json()) as { data: AdminGroup };
  return json.data;
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

export async function createGroup(data: CreateGroupData, cookieHeader?: string): Promise<AdminGroup> {
  const response = await fetch(`${ADMIN_API_BASE}/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to create group: ${response.status}`);
  }

  const json = (await response.json()) as { data: AdminGroup };
  return json.data;
}

export interface UpdateGroupData {
  urlname?: string;
  name?: string;
  platformId?: string;
  description?: string;
  link?: string;
  website?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  displayOnSite?: boolean;
  isFeatured?: boolean;
  maxBadges?: number;
  maxBadgePoints?: number;
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
  data: UpdateGroupData,
  cookieHeader?: string
): Promise<AdminGroup> {
  const response = await fetch(`${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to update group: ${response.status}`);
  }

  const json = (await response.json()) as { data: AdminGroup };
  return json.data;
}

export async function deleteGroup(id: string, cookieHeader?: string): Promise<void> {
  const response = await fetch(`${ADMIN_API_BASE}/groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(errorData.error || `Failed to delete group: ${response.status}`);
  }
}

// ============== Sync API ==============

export async function fetchSyncStatus(cookieHeader?: string): Promise<SyncStatusResponse> {
  const response = await fetch(`${ADMIN_API_BASE}/sync/status`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: SyncStatusResponse };
  return json.data;
}

export async function triggerSyncAll(cookieHeader?: string): Promise<SyncResult> {
  const response = await fetch(`${ADMIN_API_BASE}/sync/all`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: SyncResult };
  return json.data;
}

export async function triggerGroupSync(groupId: string, cookieHeader?: string): Promise<SyncResult> {
  const response = await fetch(
    `${ADMIN_API_BASE}/sync/group/${encodeURIComponent(groupId)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: SyncResult };
  return json.data;
}

export interface FetchSyncLogsOptions {
  groupId?: string;
  limit?: number;
}

export async function fetchSyncLogs(
  options: FetchSyncLogsOptions = {},
  cookieHeader?: string
): Promise<SyncLog[]> {
  const params = new URLSearchParams();

  if (options.groupId) params.set("groupId", options.groupId);
  if (options.limit) params.set("limit", String(options.limit));

  const url = `${ADMIN_API_BASE}/sync/logs${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: SyncLog[] };
  return json.data;
}

// ============== Auth API ==============

const AUTH_API_BASE = `${API_HOST}/auth`;

export interface AuthIdentity {
  provider: string;
  username: string | null;
  email?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  showAchievements?: boolean;
  githubUsername?: string;
  identities?: AuthIdentity[];
}

export interface AuthProvider {
  name: string;
  provider: string;
  authUrl: string;
}

/**
 * Fetch available auth providers from the API
 */
export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/providers`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { providers: AuthProvider[] };
    return data.providers || [];
  } catch {
    return [];
  }
}

/**
 * Fetch the current authenticated user
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
export async function logout(
  cookieHeader?: string
): Promise<void> {
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
  username: string | null;
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
  data: AdminUser[];
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

  const json = (await response.json()) as { data: AdminUser };
  return json.data;
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

  const json = (await response.json()) as { data: AdminUser };
  return json.data;
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

// ============== Badges API ==============

export interface Badge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  points: number;
  sortOrder: number;
  hideFromDirectory: number;
  createdAt: string;
  userCount?: number;
}

export interface BadgesListResponse {
  badges: Badge[];
}

export async function fetchBadges(
  cookieHeader?: string
): Promise<Badge[]> {
  const response = await fetch(`${ADMIN_API_BASE}/badges`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: Badge[] };
  return json.data;
}

export interface CreateBadgeData {
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color?: string;
  points?: number;
  sortOrder?: number;
  hideFromDirectory?: boolean;
}

export async function createBadge(
  data: CreateBadgeData,
  cookieHeader?: string
): Promise<Badge> {
  const response = await fetch(`${ADMIN_API_BASE}/badges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to create badge: ${response.status}`);
  }

  const json = (await response.json()) as { data: Badge };
  return json.data;
}

export async function updateBadge(
  id: string,
  data: Partial<CreateBadgeData>,
  cookieHeader?: string
): Promise<Badge> {
  const response = await fetch(
    `${ADMIN_API_BASE}/badges/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to update badge: ${response.status}`);
  }

  const json = (await response.json()) as { data: Badge };
  return json.data;
}

export async function deleteBadge(
  id: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/badges/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to delete badge: ${response.status}`);
  }
}

export async function awardBadge(
  userId: string,
  badgeId: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/users/${encodeURIComponent(userId)}/badges/${encodeURIComponent(badgeId)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to award badge: ${response.status}`);
  }
}

export async function revokeBadge(
  userId: string,
  badgeId: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/users/${encodeURIComponent(userId)}/badges/${encodeURIComponent(badgeId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to revoke badge: ${response.status}`);
  }
}

// ============== Group Members API ==============

export interface GroupMember {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export async function fetchGroupMembers(
  groupId: string,
  cookieHeader?: string
): Promise<GroupMember[]> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/members`,
    {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: GroupMember[] };
  return json.data;
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: string = "member",
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ userId, role }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to add member: ${response.status}`);
  }
}

export async function updateGroupMember(
  groupId: string,
  memberId: string,
  role: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ role }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to update member: ${response.status}`);
  }
}

export async function removeGroupMember(
  groupId: string,
  memberId: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to remove member: ${response.status}`);
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

  const json = (await response.json()) as { data: OAuthClient[] };
  return { clients: json.data, total: json.data.length };
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

  const json = (await response.json()) as { data: OAuthClient };
  return json.data;
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

  const json = (await response.json()) as { data: { success: boolean; message: string; deletedGrants: number; deletedTokens: number } };
  return { deletedGrants: json.data.deletedGrants, deletedTokens: json.data.deletedTokens };
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

  const json = (await response.json()) as { data: OAuthStats };
  return json.data;
}

// ============== Feature Flags API ==============

export interface FeatureFlag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  enabledByDefault: boolean;
  createdAt: string;
  userOverrideCount?: number;
  groupOverrideCount?: number;
}

export interface FeatureFlagDetail extends FeatureFlag {
  userOverrides: Array<{
    id: string;
    userId: string;
    flagId: string;
    enabled: boolean;
    userName: string;
    userEmail?: string;
  }>;
  groupOverrides: Array<{
    id: string;
    groupId: string;
    flagId: string;
    enabled: boolean;
    groupName: string;
    groupUrlname?: string;
  }>;
}

export async function fetchFlags(
  cookieHeader?: string
): Promise<FeatureFlag[]> {
  const response = await fetch(`${ADMIN_API_BASE}/flags`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: FeatureFlag[] };
  return json.data;
}

export async function fetchFlagDetail(
  id: string,
  cookieHeader?: string
): Promise<FeatureFlagDetail | null> {
  const response = await fetch(
    `${ADMIN_API_BASE}/flags/${encodeURIComponent(id)}`,
    {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: FeatureFlagDetail };
  return json.data;
}

export interface CreateFlagData {
  name: string;
  slug: string;
  description?: string;
  enabledByDefault?: boolean;
}

export async function createFlag(
  data: CreateFlagData,
  cookieHeader?: string
): Promise<FeatureFlag> {
  const response = await fetch(`${ADMIN_API_BASE}/flags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to create flag: ${response.status}`);
  }

  const json = (await response.json()) as { data: FeatureFlag };
  return json.data;
}

export async function updateFlag(
  id: string,
  data: Partial<CreateFlagData>,
  cookieHeader?: string
): Promise<FeatureFlag> {
  const response = await fetch(
    `${ADMIN_API_BASE}/flags/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to update flag: ${response.status}`);
  }

  const json = (await response.json()) as { data: FeatureFlag };
  return json.data;
}

export async function deleteFlag(
  id: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/flags/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to delete flag: ${response.status}`);
  }
}

// ============== Claim Requests API ==============

export interface ClaimRequest {
  id: string;
  groupId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  // Enriched fields
  userName: string;
  userEmail: string;
  userUsername: string | null;
  groupName: string;
  groupUrlname: string | null;
  groupPlatform: string | null;
}

export interface ClaimRequestsResponse {
  data: ClaimRequest[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchClaimRequests(
  options: { status?: "pending" | "approved" | "rejected"; limit?: number; offset?: number } = {},
  cookieHeader?: string
): Promise<ClaimRequestsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const url = `${ADMIN_API_BASE}/claim-requests${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as ClaimRequestsResponse;
}

export async function approveClaimRequest(
  id: string,
  cookieHeader?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${ADMIN_API_BASE}/claim-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to approve claim request: ${response.status}`);
  }

  const json = (await response.json()) as { data: { success: boolean; message: string } };
  return json.data;
}

export async function rejectClaimRequest(
  id: string,
  notes?: string,
  cookieHeader?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${ADMIN_API_BASE}/claim-requests/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ notes }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to reject claim request: ${response.status}`);
  }

  const json = (await response.json()) as { data: { success: boolean; message: string } };
  return json.data;
}

// ============== Claim Invites API ==============

export interface ClaimInvite {
  id: string;
  groupId: string;
  token: string;
  autoApprove: boolean;
  expiresAt: string | null;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export async function fetchClaimInvites(
  groupId: string,
  cookieHeader?: string
): Promise<ClaimInvite[]> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/claim-invites`,
    {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: ClaimInvite[] };
  return json.data;
}

export async function createClaimInvite(
  groupId: string,
  options: { autoApprove?: boolean; expiresAt?: string } = {},
  cookieHeader?: string
): Promise<ClaimInvite> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/claim-invites`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to create claim invite: ${response.status}`);
  }

  const json = (await response.json()) as { data: ClaimInvite };
  return json.data;
}

// ============== Group Creation Requests API ==============

export interface GroupCreationRequest {
  id: string;
  userId: string;
  groupName: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  groupId: string | null;
  createdAt: string;
  // Enriched fields
  userName: string;
  userEmail: string;
  userUsername: string | null;
}

export interface GroupCreationRequestsResponse {
  data: GroupCreationRequest[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function fetchGroupCreationRequests(
  options: { status?: "pending" | "approved" | "rejected"; limit?: number; offset?: number } = {},
  cookieHeader?: string
): Promise<GroupCreationRequestsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const url = `${ADMIN_API_BASE}/group-creation-requests${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  return (await response.json()) as GroupCreationRequestsResponse;
}

export async function approveGroupCreationRequest(
  id: string,
  cookieHeader?: string
): Promise<{ success: boolean; message: string; groupId?: string; urlname?: string }> {
  const response = await fetch(
    `${ADMIN_API_BASE}/group-creation-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to approve creation request: ${response.status}`);
  }

  const json = (await response.json()) as { data: { success: boolean; message: string; groupId?: string; urlname?: string } };
  return json.data;
}

export async function rejectGroupCreationRequest(
  id: string,
  notes?: string,
  cookieHeader?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${ADMIN_API_BASE}/group-creation-requests/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ notes }),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to reject creation request: ${response.status}`);
  }

  const json = (await response.json()) as { data: { success: boolean; message: string } };
  return json.data;
}

// ============== Platform Connections API ==============

export interface PlatformConnection {
  id: string;
  groupId: string;
  platform: string;
  platformId: string;
  platformUrlname: string | null;
  platformLink: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  createdAt: string;
}

export async function fetchGroupConnections(
  groupId: string,
  cookieHeader?: string
): Promise<PlatformConnection[]> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/connections`,
    {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const json = (await response.json()) as { data: PlatformConnection[] };
  return json.data;
}

export async function addGroupConnection(
  groupId: string,
  data: { platform: string; platformId: string; platformUrlname?: string; platformLink?: string; isActive?: boolean },
  cookieHeader?: string
): Promise<PlatformConnection> {
  const response = await fetch(
    `${ADMIN_API_BASE}/groups/${encodeURIComponent(groupId)}/connections`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to add connection: ${response.status}`);
  }

  const json = (await response.json()) as { data: PlatformConnection };
  return json.data;
}

export async function removeGroupConnection(
  connectionId: string,
  cookieHeader?: string
): Promise<void> {
  const response = await fetch(
    `${ADMIN_API_BASE}/connections/${encodeURIComponent(connectionId)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(errorData.error || `Failed to remove connection: ${response.status}`);
  }
}
