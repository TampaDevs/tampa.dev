/**
 * Admin Groups List
 *
 * Displays all groups with filtering, search, and management actions.
 */

import { Link, useSearchParams, useRevalidator } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.groups._index";
import {
  fetchAdminGroups,
  type AdminGroup,
  type GroupsListResponse,
} from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = () => [
  { title: "Manage Groups | Tampa.dev Admin" },
];

export async function loader({
  request,
}: Route.LoaderArgs): Promise<GroupsListResponse & { error?: string }> {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") as
    | "meetup"
    | "eventbrite"
    | "luma"
    | null;
  const active = url.searchParams.get("active");
  const displayOnSite = url.searchParams.get("displayOnSite");
  const search = url.searchParams.get("search") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const result = await fetchAdminGroups({
      platform: platform || undefined,
      active: active ? active === "true" : undefined,
      displayOnSite: displayOnSite ? displayOnSite === "true" : undefined,
      search,
      limit,
      offset,
    });
    return result;
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return {
      groups: [],
      pagination: { total: 0, limit, offset, hasMore: false },
      error: "Failed to load groups",
    };
  }
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    meetup: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    eventbrite: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    luma: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        colors[platform] || "bg-gray-100 text-gray-700"
      }`}
    >
      {platform}
    </span>
  );
}

function StatusIndicator({ active, displayOnSite }: { active: boolean; displayOnSite: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {active ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs">Active</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs">Inactive</span>
        </span>
      )}
      {displayOnSite && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs">Visible</span>
        </span>
      )}
    </div>
  );
}

function GroupRow({ group }: { group: AdminGroup }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {group.photoUrl ? (
            <img
              src={group.photoUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-xs font-bold">
                {group.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <Link
              to={`/admin/groups/${group.id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-coral"
            >
              {group.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">{group.urlname}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <PlatformBadge platform={group.platform} />
      </td>
      <td className="px-6 py-4">
        <StatusIndicator active={group.isActive} displayOnSite={group.displayOnSite} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {group.memberCount?.toLocaleString() || "-"}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/groups/${group.id}`}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </Link>
          <a
            href={group.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="View on platform"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </td>
    </tr>
  );
}

export default function AdminGroupsList({ loaderData }: Route.ComponentProps) {
  const { groups, pagination, error } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput) {
      newParams.set("search", searchInput);
    } else {
      newParams.delete("search");
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete("page");
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
        <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} groups total
          </p>
        </div>
        <Link
          to="/admin/groups/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Group
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search groups..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
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
            </div>
          </form>

          {/* Platform Filter */}
          <select
            value={searchParams.get("platform") || ""}
            onChange={(e) => handleFilterChange("platform", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">All Platforms</option>
            <option value="meetup">Meetup</option>
            <option value="eventbrite">Eventbrite</option>
            <option value="luma">Luma</option>
          </select>

          {/* Active Filter */}
          <select
            value={searchParams.get("active") || ""}
            onChange={(e) => handleFilterChange("active", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* Display on Site Filter */}
          <select
            value={searchParams.get("displayOnSite") || ""}
            onChange={(e) => handleFilterChange("displayOnSite", e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">All Visibility</option>
            <option value="true">Visible on Site</option>
            <option value="false">Hidden</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No groups found
                  </td>
                </tr>
              ) : (
                groups.map((group) => <GroupRow key={group.id} group={group} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {pagination.offset + 1} to{" "}
              {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasMore}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
