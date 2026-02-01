import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchEventRsvpSummary,
  fetchCheckinInfo,
  fetchGroupLeaderboard,
  fetchGroupClaimInfo,
  fetchCurrentUser,
  fetchUserGroupBadges,
  fetchMyCreationRequests,
} from "~/lib/api.server";

// The module reads API_HOST at import time from import.meta.env.
// vitest.config uses happy-dom, so import.meta.env.EVENTS_API_URL is undefined
// and the code falls back to "https://api.tampa.dev".
const API_HOST = "https://api.tampa.dev";

let mockFetch: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, body?: unknown) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============== RSVP Summary ==============

describe("fetchEventRsvpSummary", () => {
  const mockSummary = {
    confirmed: 25,
    waitlisted: 3,
    capacity: 50,
    userRsvpStatus: "confirmed",
  };

  it("calls the correct URL with the event ID", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: mockSummary }));

    const result = await fetchEventRsvpSummary("evt-123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/events/evt-123/rsvp-summary`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toEqual(mockSummary);
  });

  it("forwards the cookie header when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockSummary));

    await fetchEventRsvpSummary("evt-123", "session=abc123");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=abc123");
  });

  it("does not include Cookie header when cookieHeader is null", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockSummary));

    await fetchEventRsvpSummary("evt-123", null);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBeUndefined();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    const result = await fetchEventRsvpSummary("evt-123");

    expect(result).toBeNull();
  });
});

// ============== Checkin Info ==============

describe("fetchCheckinInfo", () => {
  const mockCheckin = {
    eventId: "evt-1",
    eventTitle: "Tampa Devs Meetup",
    eventStartTime: "2025-07-01T18:00:00Z",
    groupName: "Tampa Devs",
    groupSlug: "tampadevs",
  };

  it("calls the correct URL with the code", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: mockCheckin }));

    const result = await fetchCheckinInfo("abc-def-123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/checkin/abc-def-123`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toEqual(mockCheckin);
  });

  it("encodes special characters in the code", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCheckin));

    await fetchCheckinInfo("code/with spaces");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/checkin/code%2Fwith%20spaces`);
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await fetchCheckinInfo("bad-code");

    expect(result).toBeNull();
  });
});

// ============== Group Leaderboard ==============

describe("fetchGroupLeaderboard", () => {
  const mockLeaderboard = {
    entries: [
      {
        rank: 1,
        userId: "u-1",
        name: "Alice",
        username: "alice",
        avatarUrl: null,
        totalXp: 500,
        badgeCount: 10,
      },
      {
        rank: 2,
        userId: "u-2",
        name: "Bob",
        username: "bob",
        avatarUrl: null,
        totalXp: 300,
        badgeCount: 5,
      },
    ],
  };

  it("calls the correct URL with slug and default limit", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: mockLeaderboard }));

    const result = await fetchGroupLeaderboard("tampadevs");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/groups/tampadevs/leaderboard?limit=50`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
  });

  it("uses the provided limit", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: mockLeaderboard }));

    await fetchGroupLeaderboard("tampadevs", 10);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/groups/tampadevs/leaderboard?limit=10`);
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    const result = await fetchGroupLeaderboard("tampadevs");

    expect(result).toEqual([]);
  });
});

// ============== Group Claim Info ==============

describe("fetchGroupClaimInfo", () => {
  const mockClaimInfo = {
    groupId: "g-1",
    groupName: "Tampa Devs",
    groupDescription: "A developer community",
    groupPhotoUrl: "https://example.com/photo.jpg",
    autoApprove: true,
  };

  it("calls the correct URL with the token", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockClaimInfo));

    const result = await fetchGroupClaimInfo("tok-abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/groups/claim/tok-abc123`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toEqual(mockClaimInfo);
  });

  it("encodes special characters in the token", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockClaimInfo));

    await fetchGroupClaimInfo("tok/special+chars");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("tok%2Fspecial%2Bchars");
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await fetchGroupClaimInfo("bad-token");

    expect(result).toBeNull();
  });
});

// ============== Current User ==============

describe("fetchCurrentUser", () => {
  const mockUser = {
    id: "u-1",
    name: "Alice",
    username: "alice",
    avatarUrl: "https://example.com/avatar.jpg",
    email: "alice@example.com",
    role: "user",
  };

  it("calls /me with the cookie header and returns user", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockUser));

    const result = await fetchCurrentUser("session=abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/me`);
    expect(init.headers.Accept).toBe("application/json");
    expect(init.headers.Cookie).toBe("session=abc123");
    expect(result).toEqual(mockUser);
  });

  it("returns null when cookieHeader is not provided", async () => {
    const result = await fetchCurrentUser();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null when cookieHeader is null", async () => {
    const result = await fetchCurrentUser(null);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(401));

    const result = await fetchCurrentUser("session=expired");

    expect(result).toBeNull();
  });
});

// ============== User Group Badges ==============

describe("fetchUserGroupBadges", () => {
  const mockBadges = {
    groups: [
      {
        groupId: "g-1",
        groupName: "Tampa Devs",
        groupSlug: "tampadevs",
        groupPhotoUrl: null,
        totalXp: 250,
        badges: [
          {
            id: "b-1",
            name: "First Check-in",
            description: "Attended your first event",
            xp: 50,
            groupSlug: "tampadevs",
            groupPhotoUrl: null,
          },
        ],
      },
    ],
  };

  it("calls the correct URL with the username", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockBadges));

    const result = await fetchUserGroupBadges("alice");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/users/alice/group-badges`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe("Tampa Devs");
  });

  it("encodes special characters in the username", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockBadges));

    await fetchUserGroupBadges("user/name");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/users/user%2Fname/group-badges`);
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await fetchUserGroupBadges("unknown-user");

    expect(result).toEqual([]);
  });
});

// ============== My Creation Requests ==============

describe("fetchMyCreationRequests", () => {
  const mockRequests = {
    requests: [
      {
        id: "gcr-1",
        groupName: "New Community",
        status: "pending",
        createdAt: "2025-06-01T00:00:00Z",
      },
    ],
  };

  it("calls the correct URL with cookie header and returns requests", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockRequests));

    const result = await fetchMyCreationRequests("session=abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/groups/my-creation-requests`);
    expect(init.headers.Accept).toBe("application/json");
    expect(init.headers.Cookie).toBe("session=abc123");
    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe("New Community");
  });

  it("returns empty array when cookieHeader is not provided", async () => {
    const result = await fetchMyCreationRequests();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns empty array when cookieHeader is null", async () => {
    const result = await fetchMyCreationRequests(null);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(401));

    const result = await fetchMyCreationRequests("session=expired");

    expect(result).toEqual([]);
  });
});
