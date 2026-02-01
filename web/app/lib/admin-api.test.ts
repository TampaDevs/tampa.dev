import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchClaimRequests,
  approveClaimRequest,
  rejectClaimRequest,
  fetchClaimInvites,
  createClaimInvite,
  fetchGroupCreationRequests,
  approveGroupCreationRequest,
  rejectGroupCreationRequest,
  fetchGroupConnections,
  addGroupConnection,
  removeGroupConnection,
} from "~/lib/admin-api.server";

// The module reads API_HOST at import time from import.meta.env.
// vitest.config uses happy-dom, so import.meta.env.EVENTS_API_URL is undefined
// and the code falls back to "https://api.tampa.dev".
const ADMIN_BASE = "https://api.tampa.dev/admin";

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

// ============== Claim Requests ==============

describe("fetchClaimRequests", () => {
  const mockResponse = {
    data: [
      {
        id: "cr-1",
        groupId: "g-1",
        userId: "u-1",
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        notes: null,
        createdAt: "2025-06-01T00:00:00Z",
        userName: "Alice",
        userEmail: "alice@example.com",
        userUsername: "alice",
        groupName: "Tampa Devs",
        groupUrlname: "tampadevs",
        groupPlatform: "meetup",
      },
    ],
    pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
  };

  it("calls the correct URL with no options", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    const result = await fetchClaimRequests();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/claim-requests`);
    expect(init.headers.Accept).toBe("application/json");
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("cr-1");
  });

  it("appends query params for status, limit, and offset", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    await fetchClaimRequests({ status: "pending", limit: 10, offset: 5 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("status=pending");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
  });

  it("forwards the cookie header when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    await fetchClaimRequests({}, "session=abc123");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=abc123");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(403));

    await expect(fetchClaimRequests()).rejects.toThrow(
      "Admin API request failed: 403"
    );
  });
});

describe("approveClaimRequest", () => {
  it("sends POST to the approve endpoint", async () => {
    const body = { success: true, message: "Approved" };
    mockFetch.mockResolvedValue(jsonResponse(body));

    const result = await approveClaimRequest("cr-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/claim-requests/cr-1/approve`);
    expect(init.method).toBe("POST");
    expect(init.headers.Cookie).toBe("session=abc");
    expect(result.success).toBe(true);
  });

  it("throws with error message from response body", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Already approved" })
    );

    await expect(approveClaimRequest("cr-1")).rejects.toThrow(
      "Already approved"
    );
  });
});

describe("rejectClaimRequest", () => {
  it("sends POST with notes in the body", async () => {
    const body = { success: true, message: "Rejected" };
    mockFetch.mockResolvedValue(jsonResponse(body));

    const result = await rejectClaimRequest("cr-2", "Not eligible", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/claim-requests/cr-2/reject`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ notes: "Not eligible" });
    expect(result.success).toBe(true);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500, { error: "Server error" }));

    await expect(rejectClaimRequest("cr-2")).rejects.toThrow("Server error");
  });
});

// ============== Claim Invites ==============

describe("fetchClaimInvites", () => {
  const mockInvites = {
    invites: [
      {
        id: "inv-1",
        groupId: "g-1",
        token: "tok-abc",
        autoApprove: true,
        expiresAt: null,
        createdBy: "u-admin",
        usedBy: null,
        usedAt: null,
        createdAt: "2025-06-01T00:00:00Z",
      },
    ],
  };

  it("calls the correct URL with groupId", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockInvites));

    const result = await fetchClaimInvites("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/groups/g-1/claim-invites`);
    expect(result).toHaveLength(1);
    expect(result[0].token).toBe("tok-abc");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockInvites));

    await fetchClaimInvites("g-1", "session=xyz");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=xyz");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    await expect(fetchClaimInvites("g-1")).rejects.toThrow(
      "Admin API request failed: 500"
    );
  });
});

describe("createClaimInvite", () => {
  const mockInvite = {
    id: "inv-2",
    groupId: "g-1",
    token: "tok-def",
    autoApprove: false,
    expiresAt: "2025-12-31T00:00:00Z",
    createdBy: "u-admin",
    usedBy: null,
    usedAt: null,
    createdAt: "2025-06-01T00:00:00Z",
  };

  it("sends POST with options in the body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockInvite));

    const result = await createClaimInvite(
      "g-1",
      { autoApprove: true, expiresAt: "2025-12-31T00:00:00Z" },
      "session=abc"
    );

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/groups/g-1/claim-invites`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      autoApprove: true,
      expiresAt: "2025-12-31T00:00:00Z",
    });
    expect(result.id).toBe("inv-2");
  });

  it("throws with error body on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Group not found" })
    );

    await expect(createClaimInvite("g-bad")).rejects.toThrow("Group not found");
  });
});

// ============== Group Creation Requests ==============

describe("fetchGroupCreationRequests", () => {
  const mockResponse = {
    data: [
      {
        id: "gcr-1",
        userId: "u-1",
        groupName: "New Group",
        description: "A new community",
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        groupId: null,
        createdAt: "2025-06-01T00:00:00Z",
        userName: "Bob",
        userEmail: "bob@example.com",
        userUsername: "bob",
      },
    ],
    pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
  };

  it("calls the correct URL with no options", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    const result = await fetchGroupCreationRequests();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/group-creation-requests`);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].groupName).toBe("New Group");
  });

  it("appends status, limit, and offset query params", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    await fetchGroupCreationRequests({ status: "approved", limit: 5, offset: 10 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("status=approved");
    expect(url).toContain("limit=5");
    expect(url).toContain("offset=10");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockResponse));

    await fetchGroupCreationRequests({}, "session=tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=tok");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(401));

    await expect(fetchGroupCreationRequests()).rejects.toThrow(
      "Admin API request failed: 401"
    );
  });
});

describe("approveGroupCreationRequest", () => {
  it("sends POST and returns result with groupId", async () => {
    const body = {
      success: true,
      message: "Group created",
      groupId: "g-new",
      urlname: "new-group",
    };
    mockFetch.mockResolvedValue(jsonResponse(body));

    const result = await approveGroupCreationRequest("gcr-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      `${ADMIN_BASE}/group-creation-requests/gcr-1/approve`
    );
    expect(init.method).toBe("POST");
    expect(result.groupId).toBe("g-new");
    expect(result.urlname).toBe("new-group");
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(409, { error: "Already processed" })
    );

    await expect(approveGroupCreationRequest("gcr-1")).rejects.toThrow(
      "Already processed"
    );
  });
});

describe("rejectGroupCreationRequest", () => {
  it("sends POST with notes", async () => {
    const body = { success: true, message: "Rejected" };
    mockFetch.mockResolvedValue(jsonResponse(body));

    await rejectGroupCreationRequest("gcr-2", "Does not meet criteria", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      `${ADMIN_BASE}/group-creation-requests/gcr-2/reject`
    );
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ notes: "Does not meet criteria" });
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Request not found" })
    );

    await expect(rejectGroupCreationRequest("gcr-bad")).rejects.toThrow(
      "Request not found"
    );
  });
});

// ============== Platform Connections ==============

describe("fetchGroupConnections", () => {
  const mockConnections = {
    connections: [
      {
        id: "conn-1",
        groupId: "g-1",
        platform: "meetup",
        platformId: "12345",
        platformUrlname: "tampadevs",
        platformLink: "https://meetup.com/tampadevs",
        isActive: true,
        lastSyncAt: "2025-06-01T00:00:00Z",
        syncError: null,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ],
  };

  it("calls the correct URL with groupId", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockConnections));

    const result = await fetchGroupConnections("g-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/groups/g-1/connections`);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("meetup");
  });

  it("encodes special characters in groupId", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ connections: [] }));

    await fetchGroupConnections("g/special id");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("g%2Fspecial%20id");
  });

  it("forwards cookies", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockConnections));

    await fetchGroupConnections("g-1", "session=abc");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    await expect(fetchGroupConnections("g-1")).rejects.toThrow(
      "Admin API request failed: 500"
    );
  });
});

describe("addGroupConnection", () => {
  const connectionData = {
    platform: "eventbrite",
    platformId: "67890",
    platformUrlname: "tampa-events",
    platformLink: "https://eventbrite.com/o/tampa-events",
    isActive: true,
  };

  const mockConnection = {
    id: "conn-2",
    groupId: "g-1",
    ...connectionData,
    lastSyncAt: null,
    syncError: null,
    createdAt: "2025-06-01T00:00:00Z",
  };

  it("sends POST with connection data in the body", async () => {
    mockFetch.mockResolvedValue(jsonResponse(mockConnection));

    const result = await addGroupConnection("g-1", connectionData, "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/groups/g-1/connections`);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Cookie).toBe("session=abc");
    expect(JSON.parse(init.body)).toEqual(connectionData);
    expect(result.id).toBe("conn-2");
  });

  it("throws with error message from response", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: "Duplicate connection" })
    );

    await expect(
      addGroupConnection("g-1", { platform: "meetup", platformId: "dup" })
    ).rejects.toThrow("Duplicate connection");
  });
});

describe("removeGroupConnection", () => {
  it("sends DELETE to the connections endpoint", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

    await removeGroupConnection("conn-1", "session=abc");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${ADMIN_BASE}/connections/conn-1`);
    expect(init.method).toBe("DELETE");
    expect(init.headers.Cookie).toBe("session=abc");
  });

  it("throws with error message on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(404, { error: "Connection not found" })
    );

    await expect(removeGroupConnection("conn-bad")).rejects.toThrow(
      "Connection not found"
    );
  });

  it("throws fallback message when error body is unparseable", async () => {
    mockFetch.mockResolvedValue(
      new Response("not json", { status: 500 })
    );

    // The catch fallback produces { error: "Unknown error" }
    await expect(removeGroupConnection("conn-bad")).rejects.toThrow(
      "Unknown error"
    );
  });
});
