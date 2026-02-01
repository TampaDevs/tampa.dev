/**
 * Admin Users Management Page
 *
 * View, search, manage roles, and delete users from the admin panel.
 */

import { useLoaderData, useFetcher, Link, Form, useSearchParams } from "react-router";
import { Avatar, Button } from "@tampadevs/react";
import type { Route } from "./+types/admin.users";
import {
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  type AdminUser,
} from "~/lib/admin-api.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role") as
    | "user"
    | "admin"
    | "superadmin"
    | null;
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const data = await fetchAdminUsers(
    {
      role: role || undefined,
      search,
      limit,
      offset,
    },
    cookieHeader
  );

  return { users: data.data, pagination: data.pagination, currentPage: page };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const userId = formData.get("userId") as string;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "updateRole") {
    const role = formData.get("role") as "user" | "admin" | "superadmin";
    await updateUserRole(userId, role, cookieHeader);
    return { success: true };
  }

  if (intent === "delete") {
    await deleteUser(userId, cookieHeader);
    return { success: true };
  }

  return { success: false, error: "Unknown action" };
}

function RoleBadge({ role }: { role: string }) {
  const colors = {
    superadmin: "bg-coral/10 text-coral border-coral/20",
    admin: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    user: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        colors[role as keyof typeof colors] || colors.user
      }`}
    >
      {role}
    </span>
  );
}

const providerIcons: Record<string, { label: string; color: string }> = {
  github: { label: "GH", color: "bg-gray-900 dark:bg-white dark:text-gray-900 text-white" },
  google: { label: "G", color: "bg-blue-500 text-white" },
  discord: { label: "DC", color: "bg-indigo-500 text-white" },
};

function ProviderBadge({ provider }: { provider: string }) {
  const info = providerIcons[provider] || { label: provider.slice(0, 2).toUpperCase(), color: "bg-gray-500 text-white" };
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${info.color}`}
      title={provider}
    >
      {info.label}
    </span>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const fetcher = useFetcher();
  const isUpdating = fetcher.state !== "idle";

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
          <Avatar
            src={user.avatarUrl || undefined}
            name={user.name || user.email}
            size="sm"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {user.name || "No name"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        {user.username ? (
          <Link
            to={`/p/${user.username}`}
            className="text-sm text-coral hover:underline"
          >
            @{user.username}
          </Link>
        ) : (
          <span className="text-sm text-gray-400">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          {user.identities.length > 0 ? (
            user.identities.map((identity) => (
              <ProviderBadge key={identity.provider} provider={identity.provider} />
            ))
          ) : (
            <span className="text-sm text-gray-400">&mdash;</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <fetcher.Form method="post" className="inline">
            <input type="hidden" name="intent" value="updateRole" />
            <input type="hidden" name="userId" value={user.id} />
            <select
              name="role"
              defaultValue={user.role}
              onChange={(e) => {
                e.target.form?.requestSubmit();
              }}
              disabled={isUpdating}
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </fetcher.Form>
          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (
                !confirm(
                  `Are you sure you want to delete ${user.name || user.email}?`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              disabled={isUpdating}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
              title="Delete user"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </fetcher.Form>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const { users, pagination, currentPage } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  const currentRole = searchParams.get("role") || "";

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const roleStats = {
    total: pagination.total,
    superadmin: users.filter((u) => u.role === "superadmin").length,
    admin: users.filter((u) => u.role === "admin").length,
    user: users.filter((u) => u.role === "user").length,
  };

  function buildPageUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `?${params}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Users
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage user access and permissions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roleStats.total}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Users
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-coral">{roleStats.superadmin}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Super Admins
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-amber-500">
            {roleStats.admin}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Admins</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">
            {roleStats.user}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Regular Users
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <Form method="get" className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="Search by name, email, or username..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
          <select
            name="role"
            defaultValue={currentRole}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
          <Button type="submit" size="sm">
            Search
          </Button>
          {(currentSearch || currentRole) && (
            <Link
              to="/admin/users"
              className="inline-flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </Link>
          )}
        </Form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Providers
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    {currentSearch
                      ? `No users found matching "${currentSearch}"`
                      : "No users found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {pagination.offset + 1}&ndash;{Math.min(pagination.offset + users.length, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  to={buildPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Previous
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Link
                    key={page}
                    to={buildPageUrl(page)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      page === currentPage
                        ? "bg-coral text-white font-medium"
                        : "border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
              {currentPage < totalPages && (
                <Link
                  to={buildPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-navy/5 dark:bg-navy/20 rounded-xl p-4 border border-navy/10 dark:border-navy/30">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-navy dark:text-white/70 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-navy dark:text-white/70">
            <p className="font-medium">About user roles:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-navy/70 dark:text-white/60">
              <li>
                <strong>User</strong> - Can view the site but has no admin access
              </li>
              <li>
                <strong>Admin</strong> - Can access the admin panel and manage
                groups/events
              </li>
              <li>
                <strong>Super Admin</strong> - Full access including user
                management
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
