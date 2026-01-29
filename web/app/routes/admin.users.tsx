/**
 * Admin Users Management Page
 *
 * View, manage roles, and delete users from the admin panel.
 */

import { useLoaderData, useFetcher, Link } from "react-router";
import { Table, Avatar, Button } from "@tampadevs/react";
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
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const data = await fetchAdminUsers(
    {
      role: role || undefined,
      search,
      limit: 100,
    },
    cookieHeader
  );

  return { users: data.users, pagination: data.pagination };
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

function UserRow({ user }: { user: AdminUser }) {
  const fetcher = useFetcher();
  const isUpdating = fetcher.state !== "idle";

  const githubIdentity = user.identities.find((i) => i.provider === "github");

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
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
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        {githubIdentity?.username ? (
          <a
            href={`https://github.com/${githubIdentity.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-coral hover:underline"
          >
            @{githubIdentity.username}
          </a>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
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
  const { users, pagination } = useLoaderData<typeof loader>();

  const roleStats = {
    total: pagination.total,
    superadmin: users.filter((u) => u.role === "superadmin").length,
    admin: users.filter((u) => u.role === "admin").length,
    user: users.filter((u) => u.role === "user").length,
  };

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
                  GitHub
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
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
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
