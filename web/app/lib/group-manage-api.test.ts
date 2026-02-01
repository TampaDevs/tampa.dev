import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveGroupIdFromSlug,
  fetchManagedGroups,
  fetchManagedGroup,
  fetchMyRole,
  updateGroupSettings,
  fetchMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  leaveGroup,
  fetchManagedEvents,
  fetchManagedEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  fetchBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  generateBadgeClaimLink,
  fetchBadgeClaimLinks,
  fetchCheckinCodes,
  generateCheckinCode,
  deleteCheckinCode,
  fetchAttendees,
} from "~/lib/group-manage-api.server";

// The module reads API_HOST at import time from import.meta.env.
// vitest.config uses happy-dom, so import.meta.env.EVENTS_API_URL is undefined
// and the code falls back to "https://api.tampa.dev".
const API_HOST = "https://api.tampa.dev";
const MANAGE_BASE = "https://api.tampa.dev/groups/manage";

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

// ============== Helpers ==============

describe("resolveGroupIdFromSlug", () => {
  it("calls the correct URL with the slug", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: "g-1" }));

    const result = await resolveGroupIdFromSlug("tampadevs");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_HOST}/groups/tampadevs`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result).toEqual({ id: "g-1" });
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    const result = await resolveGroupIdFromSlug("nonexistent");

    expect(result).toBeNull();
  });

  it("returns null when response has no id field", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ name: "No ID" }));

    const result = await resolveGroupIdFromSlug("noid");

    expect(result).toBeNull();
  });
});

// ============== Group Management ==============

describe("fetchManagedGroups", () => {
  const mockGroups = {
    groups: [
      { id: "g-1", name: "Tampa Devs", urlname: "tampadevs" },
      { id: "g-2", name: "React Tampa", urlname: "react-tampa" },
    ],
  };

  it("calls the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockGroups));

    const result = await fetchManagedGroups();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(MANAGE_BASE);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("g-1");
  });

  it("forwards the cookie header", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockGroups));

    await fetchManagedGroups("session=abc123");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=abc123");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(401));

    await expect(fetchManagedGroups()).rejects.toThrow();
  });
});

describe("fetchManagedGroup", () => {
  const mockGroup = { id: "g-1", name: "Tampa Devs", urlname: "tampadevs" };

  it("calls the correct URL with groupId", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockGroup));

    const result = await fetchManagedGroup("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1`);
    expect(result.id).toBe("g-1");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockGroup));

    await fetchManagedGroup("g-1", "session=xyz");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=xyz");
  });

  it("throws on non-ok response with error message", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Group not found" })
    );

    await expect(fetchManagedGroup("g-bad")).rejects.toThrow("Group not found");
  });
});

describe("fetchMyRole", () => {
  const mockRole = {
    role: "manager",
    permissions: {
      canEditSettings: true,
      canManageMembers: true,
      canManageEvents: true,
      canCheckIn: true,
      canViewDashboard: true,
    },
  };

  it("calls the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockRole));

    const result = await fetchMyRole("g-1", "session=abc");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/my-role`);
    expect(result.role).toBe("manager");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchMyRole("g-1")).rejects.toThrow();
  });
});

describe("updateGroupSettings", () => {
  const updateData = { name: "Tampa Devs Updated", description: "New desc" };
  const mockUpdated = { id: "g-1", name: "Tampa Devs Updated" };

  it("sends PUT with JSON body to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockUpdated));

    const result = await updateGroupSettings("g-1", updateData, "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1`);
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Cookie).toBe("session=abc");
    expect(JSON.parse(init.body)).toEqual(updateData);
    expect(result.name).toBe("Tampa Devs Updated");
  });

  it("throws with error body on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Invalid urlname" })
    );

    await expect(
      updateGroupSettings("g-1", { urlname: "bad!" })
    ).rejects.toThrow("Invalid urlname");
  });
});

// ============== Members ==============

describe("fetchMembers", () => {
  const mockMembers = {
    members: [
      { id: "m-1", userId: "u-1", role: "owner" },
      { id: "m-2", userId: "u-2", role: "member" },
    ],
  };

  it("calls the correct URL and returns members array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockMembers));

    const result = await fetchMembers("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/members`);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("owner");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockMembers));

    await fetchMembers("g-1", "session=tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=tok");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchMembers("g-1")).rejects.toThrow();
  });
});

describe("inviteMember", () => {
  it("sends POST with userId in the body", async () => {
    const mockMember = { id: "m-3", userId: "u-3", role: "member" };
    mockFetch.mockResolvedValue(jsonResponse(mockMember));

    const result = await inviteMember("g-1", "u-3", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/members`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ userId: "u-3" });
    expect(result.id).toBe("m-3");
  });

  it("throws with error body on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(409, { error: "Already a member" })
    );

    await expect(inviteMember("g-1", "u-dup")).rejects.toThrow(
      "Already a member"
    );
  });
});

describe("updateMemberRole", () => {
  it("sends PATCH with role in the body", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await updateMemberRole("g-1", "m-2", "manager", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/members/m-2`);
    expect(init.method).toBe("PATCH");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ role: "manager" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Invalid role" })
    );

    await expect(
      updateMemberRole("g-1", "m-2", "invalid")
    ).rejects.toThrow("Invalid role");
  });
});

describe("removeMember", () => {
  it("sends DELETE to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await removeMember("g-1", "m-2", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/members/m-2`);
    expect(init.method).toBe("DELETE");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(403, { error: "Cannot remove owner" })
    );

    await expect(removeMember("g-1", "m-owner")).rejects.toThrow(
      "Cannot remove owner"
    );
  });
});

describe("leaveGroup", () => {
  it("sends POST to the leave endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await leaveGroup("g-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/leave`);
    expect(init.method).toBe("POST");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Owner cannot leave" })
    );

    await expect(leaveGroup("g-1")).rejects.toThrow("Owner cannot leave");
  });
});

// ============== Events ==============

describe("fetchManagedEvents", () => {
  const mockEvents = {
    events: [
      { id: "e-1", title: "Monthly Meetup", status: "active" },
      { id: "e-2", title: "Workshop", status: "draft" },
    ],
  };

  it("calls the correct URL and returns events array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockEvents));

    const result = await fetchManagedEvents("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events`);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Monthly Meetup");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockEvents));

    await fetchManagedEvents("g-1", "session=tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=tok");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    await expect(fetchManagedEvents("g-1")).rejects.toThrow();
  });
});

describe("fetchManagedEvent", () => {
  const mockEvent = { id: "e-1", title: "Monthly Meetup" };

  it("calls the correct URL with groupId and eventId", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockEvent));

    const result = await fetchManagedEvent("g-1", "e-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1`);
    expect(result.title).toBe("Monthly Meetup");
  });

  it("throws with error message from response body", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Event not found" })
    );

    await expect(fetchManagedEvent("g-1", "e-bad")).rejects.toThrow(
      "Event not found"
    );
  });
});

describe("createEvent", () => {
  const eventData = {
    title: "New Meetup",
    startTime: "2025-07-01T18:00:00Z",
    eventType: "physical" as const,
  };
  const mockCreated = { event: { id: "e-new", title: "New Meetup" } };

  it("sends POST with JSON body to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCreated));

    const result = await createEvent("g-1", eventData, "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Cookie).toBe("session=abc");
    expect(JSON.parse(init.body)).toEqual(eventData);
    expect(result.event.id).toBe("e-new");
  });

  it("throws with error body on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Title is required" })
    );

    await expect(
      createEvent("g-1", { title: "", startTime: "" })
    ).rejects.toThrow("Title is required");
  });
});

describe("updateEvent", () => {
  const updateData = { title: "Updated Meetup" };
  const mockUpdated = { id: "e-1", title: "Updated Meetup" };

  it("sends PUT with JSON body to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockUpdated));

    const result = await updateEvent("g-1", "e-1", updateData, "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1`);
    expect(init.method).toBe("PUT");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(updateData);
    expect(result.title).toBe("Updated Meetup");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Event not found" })
    );

    await expect(
      updateEvent("g-1", "e-bad", { title: "x" })
    ).rejects.toThrow("Event not found");
  });
});

describe("cancelEvent", () => {
  it("sends POST to the cancel endpoint", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await cancelEvent("g-1", "e-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1/cancel`);
    expect(init.method).toBe("POST");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Already cancelled" })
    );

    await expect(cancelEvent("g-1", "e-1")).rejects.toThrow(
      "Already cancelled"
    );
  });
});

// ============== Badges ==============

describe("fetchBadges", () => {
  const mockBadges = {
    badges: [
      { id: "b-1", name: "Early Bird", points: 10 },
      { id: "b-2", name: "Contributor", points: 25 },
    ],
  };

  it("calls the correct URL and returns badges array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockBadges));

    const result = await fetchBadges("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges`);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Early Bird");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockBadges));

    await fetchBadges("g-1", "session=tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=tok");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchBadges("g-1")).rejects.toThrow();
  });
});

describe("createBadge", () => {
  const badgeData = { name: "Speaker", points: 50 };
  const mockCreated = { id: "b-new", name: "Speaker", points: 50 };

  it("sends POST with JSON body to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCreated));

    const result = await createBadge("g-1", badgeData, "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual(badgeData);
    expect(result.id).toBe("b-new");
  });

  it("throws with error body on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Badge limit reached" })
    );

    await expect(
      createBadge("g-1", { name: "x", points: 1 })
    ).rejects.toThrow("Badge limit reached");
  });
});

describe("updateBadge", () => {
  it("sends PATCH with JSON body to the correct URL", async () => {
    const mockUpdated = { id: "b-1", name: "Updated Badge", points: 20 };
    mockFetch.mockResolvedValue(jsonResponse(mockUpdated));

    const result = await updateBadge(
      "g-1",
      "b-1",
      { name: "Updated Badge", points: 20 },
      "session=abc"
    );

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges/b-1`);
    expect(init.method).toBe("PATCH");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ name: "Updated Badge", points: 20 });
    expect(result.name).toBe("Updated Badge");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Badge not found" })
    );

    await expect(
      updateBadge("g-1", "b-bad", { name: "x" })
    ).rejects.toThrow("Badge not found");
  });
});

describe("deleteBadge", () => {
  it("sends DELETE to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await deleteBadge("g-1", "b-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges/b-1`);
    expect(init.method).toBe("DELETE");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Badge not found" })
    );

    await expect(deleteBadge("g-1", "b-bad")).rejects.toThrow(
      "Badge not found"
    );
  });
});

// ============== Badge Claim Links ==============

describe("generateBadgeClaimLink", () => {
  const mockLink = {
    id: "cl-1",
    code: "ABC123",
    maxUses: 10,
    currentUses: 0,
    expiresAt: "2025-12-31T00:00:00Z",
    createdAt: "2025-06-01T00:00:00Z",
  };

  it("sends POST with options in the body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockLink));

    const result = await generateBadgeClaimLink(
      "g-1",
      "b-1",
      { maxUses: 10, expiresAt: "2025-12-31T00:00:00Z" },
      "session=abc"
    );

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges/b-1/claim-links`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      maxUses: 10,
      expiresAt: "2025-12-31T00:00:00Z",
    });
    expect(result.code).toBe("ABC123");
  });

  it("sends empty object when options are undefined", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockLink));

    await generateBadgeClaimLink("g-1", "b-1", undefined, "session=abc");

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Badge not found" })
    );

    await expect(
      generateBadgeClaimLink("g-1", "b-bad")
    ).rejects.toThrow("Badge not found");
  });
});

describe("fetchBadgeClaimLinks", () => {
  const mockLinks = {
    claimLinks: [
      { id: "cl-1", code: "ABC123", maxUses: 10, currentUses: 3 },
      { id: "cl-2", code: "DEF456", maxUses: null, currentUses: 0 },
    ],
  };

  it("calls the correct URL and returns claimLinks array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockLinks));

    const result = await fetchBadgeClaimLinks("g-1", "b-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/badges/b-1/claim-links`);
    expect(result).toHaveLength(2);
    expect(result[0].code).toBe("ABC123");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockLinks));

    await fetchBadgeClaimLinks("g-1", "b-1", "session=xyz");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=xyz");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    await expect(fetchBadgeClaimLinks("g-1", "b-1")).rejects.toThrow();
  });
});

// ============== Checkin Codes ==============

describe("fetchCheckinCodes", () => {
  const mockCodes = {
    codes: [
      { id: "cc-1", code: "CHECK1", eventId: "e-1", maxUses: 100 },
    ],
  };

  it("calls the correct URL and returns codes array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCodes));

    const result = await fetchCheckinCodes("g-1", "e-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1/checkin-codes`);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("CHECK1");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCodes));

    await fetchCheckinCodes("g-1", "e-1", "session=tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=tok");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchCheckinCodes("g-1", "e-1")).rejects.toThrow();
  });
});

describe("generateCheckinCode", () => {
  const mockCode = {
    id: "cc-new",
    code: "NEWCODE",
    eventId: "e-1",
    maxUses: 50,
    currentUses: 0,
    expiresAt: null,
    createdAt: "2025-06-01T00:00:00Z",
  };

  it("sends POST with options in the body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCode));

    const result = await generateCheckinCode(
      "g-1",
      "e-1",
      { maxUses: 50 },
      "session=abc"
    );

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1/checkin-codes`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ maxUses: 50 });
    expect(result.code).toBe("NEWCODE");
  });

  it("sends empty object when options are undefined", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockCode));

    await generateCheckinCode("g-1", "e-1", undefined, "session=abc");

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Event not found" })
    );

    await expect(
      generateCheckinCode("g-1", "e-bad")
    ).rejects.toThrow("Event not found");
  });
});

describe("deleteCheckinCode", () => {
  it("sends DELETE to the correct URL", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }));

    await deleteCheckinCode("g-1", "cc-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/checkin-codes/cc-1`);
    expect(init.method).toBe("DELETE");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Code not found" })
    );

    await expect(deleteCheckinCode("g-1", "cc-bad")).rejects.toThrow(
      "Code not found"
    );
  });

  it("throws fallback message when error body is unparseable", async () => {
    mockFetch.mockResolvedValue(
      new Response("not json", { status: 500 })
    );

    await expect(deleteCheckinCode("g-1", "cc-bad")).rejects.toThrow(
      "Unknown error"
    );
  });
});

// ============== Attendees ==============

describe("fetchAttendees", () => {
  const mockAttendees = {
    attendees: [
      {
        rsvpId: "r-1",
        userId: "u-1",
        rsvpStatus: "confirmed",
        checkedIn: true,
        checkedInAt: "2025-06-01T18:30:00Z",
        checkinMethod: "code",
        user: { id: "u-1", name: "Alice", username: "alice", avatarUrl: null },
      },
      {
        rsvpId: "r-2",
        userId: "u-2",
        rsvpStatus: "waitlisted",
        checkedIn: false,
        checkedInAt: null,
        checkinMethod: null,
        user: { id: "u-2", name: "Bob", username: "bob", avatarUrl: null },
      },
    ],
  };

  it("calls the correct URL and returns attendees array", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockAttendees));

    const result = await fetchAttendees("g-1", "e-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${MANAGE_BASE}/g-1/events/e-1/attendees`);
    expect(result).toHaveLength(2);
    expect(result[0].rsvpStatus).toBe("confirmed");
    expect(result[0].checkedIn).toBe(true);
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockAttendees));

    await fetchAttendees("g-1", "e-1", "session=xyz");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=xyz");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchAttendees("g-1", "e-1")).rejects.toThrow();
  });
});
