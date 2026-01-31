/**
 * Admin Entitlements Management Page
 *
 * View, assign, and remove user entitlements from the admin panel.
 */

import { useLoaderData, useFetcher } from "react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Route } from "./+types/admin.entitlements";

interface Entitlement {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  entitlement: string;
  source: string;
  grantedAt: string;
  expiresAt: string | null;
}

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const response = await fetch(`${API_HOST}/admin/entitlements`, {
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`);
  }

  const data = (await response.json()) as { entitlements: Entitlement[] };
  return { entitlements: data.entitlements };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "assign") {
    const userId = formData.get("userId") as string;
    const entitlement = formData.get("entitlement") as string;
    const source = formData.get("source") as string;
    const expiresAt = formData.get("expiresAt") as string;

    try {
      const body: Record<string, unknown> = { userId, entitlement };
      if (source) body.source = source;
      if (expiresAt) body.expiresAt = expiresAt;

      const response = await fetch(`${API_HOST}/admin/entitlements/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to assign entitlement: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to assign entitlement" };
    }
  }

  if (intent === "delete") {
    const entitlementId = formData.get("entitlementId") as string;

    try {
      const response = await fetch(
        `${API_HOST}/admin/entitlements/${encodeURIComponent(entitlementId)}`,
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
        throw new Error(errorData.error || `Failed to remove entitlement: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to remove entitlement" };
    }
  }

  return { success: false };
}

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
}

function UserSearchPicker({
  selectedUser,
  onSelect,
  onClear,
}: {
  selectedUser: UserSearchResult | null;
  onSelect: (user: UserSearchResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_HOST}/admin/users?search=${encodeURIComponent(searchQuery)}&limit=5`,
        {
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = (await response.json()) as { users: UserSearchResult[] };
        setResults(data.users || []);
        setShowDropdown(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedUser) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {selectedUser.name || selectedUser.username || "Unnamed User"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {selectedUser.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Clear selection"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        placeholder="Search by name or email..."
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                onSelect(user);
                setQuery("");
                setResults([]);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name || user.username || "Unnamed User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </button>
          ))}
        </div>
      )}
      {showDropdown && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No users found</p>
        </div>
      )}
    </div>
  );
}

function AssignEntitlementForm({ onCancel }: { onCancel: () => void }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Assign Entitlement
      </h3>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="assign" />
        {selectedUser && <input type="hidden" name="userId" value={selectedUser.id} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User
            </label>
            <UserSearchPicker
              selectedUser={selectedUser}
              onSelect={setSelectedUser}
              onClear={() => setSelectedUser(null)}
            />
          </div>

          <div>
            <label htmlFor="entitlement-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entitlement Key
            </label>
            <input
              id="entitlement-key"
              name="entitlement"
              type="text"
              required
              placeholder="e.g. premium_access"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="entitlement-source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source
            </label>
            <select
              id="entitlement-source"
              name="source"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            >
              <option value="admin">Admin</option>
              <option value="system">System</option>
              <option value="achievement">Achievement</option>
            </select>
          </div>

          <div>
            <label htmlFor="entitlement-expires" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expires At (optional)
            </label>
            <input
              id="entitlement-expires"
              name="expiresAt"
              type="datetime-local"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Assigning..." : "Assign Entitlement"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

function EntitlementRow({ entitlement }: { entitlement: Entitlement }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  const sourceColors: Record<string, string> = {
    admin: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
    system: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    achievement: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  };

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {entitlement.userName || "Unknown User"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {entitlement.userEmail || entitlement.userId}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
          {entitlement.entitlement}
        </code>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${sourceColors[entitlement.source] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
          {entitlement.source}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {new Date(entitlement.grantedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {entitlement.expiresAt
          ? new Date(entitlement.expiresAt).toLocaleDateString()
          : "Never"}
      </td>
      <td className="px-4 py-3">
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(`Remove entitlement "${entitlement.entitlement}" from ${entitlement.userName || "this user"}?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="entitlementId" value={entitlement.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? "..." : "Remove"}
          </button>
        </fetcher.Form>
      </td>
    </tr>
  );
}

export default function AdminEntitlementsPage() {
  const { entitlements } = useLoaderData<typeof loader>();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Entitlements
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {entitlements.length} entitlement{entitlements.length !== 1 ? "s" : ""} assigned
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign Entitlement
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AssignEntitlementForm onCancel={() => setShowForm(false)} />
        </div>
      )}

      {entitlements.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Entitlement Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Granted At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Expires At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((entitlement) => (
                  <EntitlementRow key={entitlement.id} entitlement={entitlement} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            No entitlements yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assign entitlements to users to grant them special permissions or access.
          </p>
        </div>
      )}
    </div>
  );
}
