/**
 * API Response Envelope Regression Tests
 *
 * These tests ensure frontend API helpers and loader parsing logic
 * correctly handle the backend's standard response envelopes:
 *
 *   ok(c, data)     → { data: { ...fields } }
 *   list(c, items)  → { data: [...items], pagination: { total, limit, offset, hasMore } }
 *   success(c)      → { data: { success: true } }
 *   /auth/me        → { user: { ...fields } | null }  (non-standard, legacy)
 *
 * IMPORTANT: The mock responses in these tests MUST match the actual
 * backend response format. If a test mocks the wrong shape, it defeats
 * the purpose of envelope testing. When adding new tests, verify the
 * mock against the backend endpoint's actual return value.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchCurrentUser,
  fetchEventRsvpSummary,
  fetchCheckinInfo,
  fetchGroupLeaderboard,
  fetchGroupClaimInfo,
  fetchUserGroupBadges,
  fetchMyCreationRequests,
} from "~/lib/api.server";

const API_HOST = "https://api.tampa.dev";

let mockFetch: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
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

// ============================================================
// fetchCurrentUser: /auth/me → { user: { ... } | null }
//
// The /auth/me endpoint returns { user: {...} } NOT { data: {...} }.
// This is intentional — it's a legacy endpoint that predates the
// standard envelope convention.
// ============================================================
describe("fetchCurrentUser — envelope regression", () => {
  it("correctly unwraps { user: {...} } envelope from /auth/me", async () => {
    // This is the ACTUAL response format from GET /auth/me
    mockFetch.mockResolvedValue(
      jsonResponse({
        user: {
          id: "u-1",
          email: "alice@example.com",
          name: "Alice",
          username: "alice",
          avatarUrl: "https://example.com/avatar.jpg",
          role: "user",
          showAchievements: true,
          githubUsername: "alice-gh",
          identities: [{ provider: "github", username: "alice-gh", email: "alice@gh.com" }],
        },
      })
    );

    const result = await fetchCurrentUser("session=abc123");

    // Should extract the user object, not return the wrapper
    expect(result).not.toBeNull();
    expect(result!.username).toBe("alice");
    expect(result!.id).toBe("u-1");
    // Should NOT have a 'user' property (that would mean double-nesting)
    expect(result).not.toHaveProperty("user");
  });

  it("returns null when backend returns { user: null }", async () => {
    // This is what /auth/me returns for unauthenticated requests
    mockFetch.mockResolvedValue(jsonResponse({ user: null }));

    const result = await fetchCurrentUser("session=expired");

    expect(result).toBeNull();
  });

  it("fetches from /auth/me, not /me", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ user: null }));

    await fetchCurrentUser("session=test");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/auth/me`);
    // Regression: previously fetched from /me which doesn't exist
    expect(url).not.toBe(`${API_HOST}/me`);
  });
});

// ============================================================
// fetchEventRsvpSummary: uses ok() → { data: { confirmed, ... } }
// ============================================================
describe("fetchEventRsvpSummary — envelope regression", () => {
  it("correctly unwraps { data: {...} } envelope", async () => {
    // Actual backend response from ok(c, summary)
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: {
          confirmed: 25,
          waitlisted: 3,
          capacity: 50,
          userRsvpStatus: "confirmed",
        },
      })
    );

    const result = await fetchEventRsvpSummary("evt-123");

    expect(result).not.toBeNull();
    expect(result!.confirmed).toBe(25);
    // Should NOT have a 'data' property (would indicate missing unwrap)
    expect(result).not.toHaveProperty("data");
  });

  it("rejects response without data wrapper", async () => {
    // If someone accidentally returns the raw object without ok() wrapper,
    // the function would return undefined properties
    mockFetch.mockResolvedValue(
      jsonResponse({
        confirmed: 25,
        waitlisted: 3,
      })
    );

    const result = await fetchEventRsvpSummary("evt-123");

    // Result would be undefined because json.data is undefined
    // This documents the expected behavior — unwrap is required
    expect(result).toBeUndefined();
  });
});

// ============================================================
// fetchCheckinInfo: uses ok() → { data: { eventId, ... } }
// ============================================================
describe("fetchCheckinInfo — envelope regression", () => {
  it("correctly unwraps { data: {...} } envelope", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: {
          eventId: "evt-1",
          eventTitle: "Meetup",
          eventStartTime: "2025-07-01T18:00:00Z",
          groupName: "Tampa Devs",
          groupSlug: "tampadevs",
        },
      })
    );

    const result = await fetchCheckinInfo("abc-code");

    expect(result).not.toBeNull();
    expect(result!.eventTitle).toBe("Meetup");
    expect(result).not.toHaveProperty("data");
  });
});

// ============================================================
// fetchGroupLeaderboard: uses ok() → { data: { entries: [...] } }
// ============================================================
describe("fetchGroupLeaderboard — envelope regression", () => {
  it("correctly unwraps { data: { entries: [...] } } and returns entries", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: {
          entries: [
            { rank: 1, userId: "u-1", name: "Alice", username: "alice", avatarUrl: null, totalXp: 500, badgeCount: 10 },
            { rank: 2, userId: "u-2", name: "Bob", username: "bob", avatarUrl: null, totalXp: 300, badgeCount: 5 },
          ],
        },
      })
    );

    const result = await fetchGroupLeaderboard("tampadevs");

    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].username).toBe("alice");
  });
});

// ============================================================
// fetchGroupClaimInfo: legacy endpoint, returns raw object (no data wrapper)
// ============================================================
describe("fetchGroupClaimInfo — envelope regression", () => {
  it("handles raw response (no data wrapper) from legacy endpoint", async () => {
    // This endpoint returns raw c.json({ ... }) without ok() wrapper
    mockFetch.mockResolvedValue(
      jsonResponse({
        groupId: "g-1",
        groupName: "Tampa Devs",
        groupDescription: "A developer community",
        groupPhotoUrl: "https://example.com/photo.jpg",
        autoApprove: true,
      })
    );

    const result = await fetchGroupClaimInfo("tok-abc123");

    expect(result).not.toBeNull();
    expect(result!.groupName).toBe("Tampa Devs");
  });
});

// ============================================================
// fetchUserGroupBadges: legacy endpoint, returns { groups: [...] }
// ============================================================
describe("fetchUserGroupBadges — envelope regression", () => {
  it("handles { groups: [...] } response (no data wrapper)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        groups: [
          {
            groupId: "g-1",
            groupName: "Tampa Devs",
            groupSlug: "tampadevs",
            groupPhotoUrl: null,
            totalXp: 250,
            badges: [],
          },
        ],
      })
    );

    const result = await fetchUserGroupBadges("alice");

    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe("Tampa Devs");
  });
});

// ============================================================
// fetchMyCreationRequests: legacy endpoint, returns { requests: [...] }
// ============================================================
describe("fetchMyCreationRequests — envelope regression", () => {
  it("handles { requests: [...] } response (no data wrapper)", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        requests: [
          { id: "gcr-1", groupName: "New Community", status: "pending", createdAt: "2025-06-01T00:00:00Z" },
        ],
      })
    );

    const result = await fetchMyCreationRequests("session=abc123");

    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe("New Community");
  });
});
