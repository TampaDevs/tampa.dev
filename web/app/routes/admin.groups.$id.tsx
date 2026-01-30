/**
 * Admin Group Detail/Edit
 *
 * View and edit a single group's details.
 */

import { Form, Link, useNavigate, redirect, data } from "react-router";
import { useState, useRef } from "react";
import type { Route } from "./+types/admin.groups.$id";
import {
  fetchAdminGroup,
  updateGroup,
  deleteGroup,
  triggerGroupSync,
  fetchGroupMembers,
  addGroupMember,
  updateGroupMember,
  removeGroupMember,
  type AdminGroup,
  type UpdateGroupData,
  type GroupMember,
} from "~/lib/admin-api.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const loaderData = data as { group?: AdminGroup | null } | undefined;
  return [
    { title: loaderData?.group ? `${loaderData.group.name} | Tampa.dev Admin` : "Group Not Found" },
  ];
};

export async function loader({
  params,
  request,
}: Route.LoaderArgs): Promise<{ group: AdminGroup | null; members: GroupMember[]; error?: string }> {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  try {
    const [group, members] = await Promise.all([
      fetchAdminGroup(params.id),
      fetchGroupMembers(params.id, cookieHeader).catch(() => [] as GroupMember[]),
    ]);
    if (!group) {
      throw data({ error: "Group not found" }, { status: 404 });
    }
    return { group, members };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to fetch group:", error);
    return { group: null, members: [], error: "Failed to load group" };
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  try {
    if (intent === "delete") {
      await deleteGroup(params.id);
      return redirect("/admin/groups");
    }

    if (intent === "sync") {
      const result = await triggerGroupSync(params.id);
      return { success: true, syncResult: result };
    }

    if (intent === "updatePhoto") {
      const photoUrl = formData.get("photoUrl") as string;
      await updateGroup(params.id, { photoUrl } as UpdateGroupData);
      return { success: true };
    }

    if (intent === "addMember") {
      const userId = formData.get("userId") as string;
      const role = formData.get("role") as string || "member";
      await addGroupMember(params.id, userId, role, cookieHeader);
      return { success: true, memberAction: "added" };
    }

    if (intent === "updateMemberRole") {
      const memberId = formData.get("memberId") as string;
      const role = formData.get("role") as string;
      await updateGroupMember(params.id, memberId, role, cookieHeader);
      return { success: true, memberAction: "updated" };
    }

    if (intent === "removeMember") {
      const memberId = formData.get("memberId") as string;
      await removeGroupMember(params.id, memberId, cookieHeader);
      return { success: true, memberAction: "removed" };
    }

    // Update group
    const updateData: UpdateGroupData = {};

    const name = formData.get("name");
    if (typeof name === "string" && name) updateData.name = name;

    const urlname = formData.get("urlname");
    if (typeof urlname === "string" && urlname) updateData.urlname = urlname;

    const description = formData.get("description");
    if (typeof description === "string") updateData.description = description || undefined;

    const website = formData.get("website");
    if (typeof website === "string") updateData.website = website || null;

    const isActive = formData.get("isActive");
    updateData.isActive = isActive === "true";

    const displayOnSite = formData.get("displayOnSite");
    updateData.displayOnSite = displayOnSite === "true";

    const isFeatured = formData.get("isFeatured");
    updateData.isFeatured = isFeatured === "true";

    const tags = formData.get("tags");
    if (typeof tags === "string") {
      updateData.tags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    }

    // Social links
    const socialLinks: Record<string, string> = {};
    for (const key of ["slack", "discord", "linkedin", "twitter", "github", "meetup"]) {
      const value = formData.get(`socialLinks.${key}`);
      if (typeof value === "string" && value) {
        socialLinks[key] = value;
      }
    }
    updateData.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : null;

    await updateGroup(params.id, updateData);
    return { success: true };
  } catch (error) {
    console.error("Action failed:", error);
    return { error: error instanceof Error ? error.message : "Action failed" };
  }
}

function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  help,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
      />
      {help && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{help}</p>}
    </div>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  help,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  help?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked || false);

  return (
    <div className="flex items-start gap-3">
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 ${
          checked ? "bg-coral" : "bg-gray-200 dark:bg-gray-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {help && <p className="text-sm text-gray-500 dark:text-gray-400">{help}</p>}
      </div>
    </div>
  );
}

function GroupImageUpload({
  groupId,
  currentPhotoUrl,
  groupName,
}: {
  groupId: string;
  currentPhotoUrl: string | null;
  groupName: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, GIF, or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Request presigned URL
      const requestResponse = await fetch("/api/uploads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "group",
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!requestResponse.ok) {
        const data = await requestResponse.json() as { error?: string };
        throw new Error(data.error || "Failed to request upload");
      }

      const { uploadUrl, finalUrl, contentType } = await requestResponse.json() as {
        uploadUrl: string;
        finalUrl: string;
        contentType: string;
      };

      // Upload to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      // Update group photo via form submission
      const formData = new FormData();
      formData.set("intent", "updatePhoto");
      formData.set("photoUrl", finalUrl);
      await fetch(window.location.href, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      // Reload to show updated photo
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Group Image
      </h2>
      <div className="flex items-center gap-6">
        <div className="relative group">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={groupName}
              className="w-24 h-24 rounded-xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-400">
                {groupName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          >
            {isUploading ? (
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hover over the image and click to upload a custom photo.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            JPEG, PNG, GIF, or WebP. Max 2MB.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupMembersSection({
  groupId,
  members,
}: {
  groupId: string;
  members: GroupMember[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; email: string; username: string | null; avatarUrl: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=5`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { users: Array<{ id: string; name: string | null; email: string; username: string | null; avatarUrl: string | null }> };
        // Filter out users already in members list
        const existingUserIds = new Set(members.map((m) => m.user?.id).filter(Boolean));
        setSearchResults(data.users.filter((u) => !existingUserIds.has(u.id)));
      }
    } catch {
      // ignore search errors
    } finally {
      setIsSearching(false);
    }
  };

  const roles = ["owner", "admin", "member"] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Members ({members.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-coral text-white text-sm rounded-lg font-medium hover:bg-coral-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Member</h3>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSearchQuery(user.name || user.email);
                        setSearchResults([]);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedUserId === user.id ? "bg-coral/10" : ""
                      }`}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name || "No name"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="addMember" />
                <input type="hidden" name="userId" value={selectedUserId} />
                <input type="hidden" name="role" value={addRole} />
                <button
                  type="submit"
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </Form>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSelectedUserId("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No members assigned to this group yet.</p>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                {member.user?.avatarUrl ? (
                  <img src={member.user.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {(member.user?.name || member.user?.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.user?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {member.user?.email || member.user?.username || ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Form method="post" className="flex items-center">
                  <input type="hidden" name="intent" value="updateMemberRole" />
                  <input type="hidden" name="memberId" value={member.id} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    onChange={(e) => {
                      const form = e.target.closest("form");
                      if (form) form.requestSubmit();
                    }}
                    className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </Form>

                {confirmRemove === member.id ? (
                  <div className="flex items-center gap-1">
                    <Form method="post">
                      <input type="hidden" name="intent" value="removeMember" />
                      <input type="hidden" name="memberId" value={member.id} />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Confirm
                      </button>
                    </Form>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(null)}
                      className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(member.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminGroupDetail({ loaderData, actionData }: Route.ComponentProps) {
  const { group, members, error } = loaderData;
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (error || !group) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Error</h2>
        <p className="text-red-600 dark:text-red-300 mt-1">{error || "Group not found"}</p>
        <Link
          to="/admin/groups"
          className="inline-block mt-4 text-coral hover:text-coral-dark font-medium"
        >
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/groups"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            {group.photoUrl ? (
              <img
                src={group.photoUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 font-bold">
                  {group.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{group.urlname}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Form method="post">
            <input type="hidden" name="intent" value="sync" />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Now
            </button>
          </Form>
          <a
            href={group.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View on {group.platform}
          </a>
        </div>
      </div>

      {/* Action feedback */}
      {actionData?.success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-green-700 dark:text-green-400">
            {actionData.syncResult
              ? "Sync completed successfully!"
              : actionData.memberAction
                ? `Member ${actionData.memberAction} successfully!`
                : "Group updated successfully!"}
          </p>
        </div>
      )}
      {actionData?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {/* Group Image */}
      <GroupImageUpload groupId={group.id} currentPhotoUrl={group.photoUrl} groupName={group.name} />

      {/* Members */}
      <GroupMembersSection groupId={group.id} members={members} />

      {/* Edit Form */}
      <Form method="post" className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Name"
              name="name"
              defaultValue={group.name}
              required
            />
            <FormField
              label="URL Slug"
              name="urlname"
              defaultValue={group.urlname}
              help="Lowercase letters, numbers, and hyphens only"
              required
            />
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                defaultValue={group.description || ""}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              />
            </div>
            <FormField
              label="Website"
              name="website"
              type="url"
              defaultValue={group.website || ""}
              placeholder="https://..."
            />
            <FormField
              label="Tags"
              name="tags"
              defaultValue={group.tags?.join(", ") || ""}
              help="Comma-separated list"
              placeholder="cloud, ai, web"
            />
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform
              </label>
              <p className="mt-1 text-gray-900 dark:text-white capitalize">{group.platform}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Platform ID
              </label>
              <p className="mt-1 text-gray-900 dark:text-white font-mono text-sm">{group.platformId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Member Count
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {group.memberCount?.toLocaleString() || "Unknown"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Events
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {group.eventCount ?? "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Status & Visibility */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Status & Visibility
          </h2>
          <div className="space-y-4">
            <Toggle
              label="Active"
              name="isActive"
              defaultChecked={group.isActive}
              help="Inactive groups won't be synced"
            />
            <Toggle
              label="Display on Site"
              name="displayOnSite"
              defaultChecked={group.displayOnSite}
              help="Show this group on the public website"
            />
            <Toggle
              label="Featured"
              name="isFeatured"
              defaultChecked={group.isFeatured || false}
              help="Featured groups appear prominently on the homepage"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Social Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Slack"
              name="socialLinks.slack"
              type="url"
              defaultValue={group.socialLinks?.slack || ""}
              placeholder="https://..."
            />
            <FormField
              label="Discord"
              name="socialLinks.discord"
              type="url"
              defaultValue={group.socialLinks?.discord || ""}
              placeholder="https://..."
            />
            <FormField
              label="LinkedIn"
              name="socialLinks.linkedin"
              type="url"
              defaultValue={group.socialLinks?.linkedin || ""}
              placeholder="https://..."
            />
            <FormField
              label="Twitter"
              name="socialLinks.twitter"
              type="url"
              defaultValue={group.socialLinks?.twitter || ""}
              placeholder="https://..."
            />
            <FormField
              label="GitHub"
              name="socialLinks.github"
              type="url"
              defaultValue={group.socialLinks?.github || ""}
              placeholder="https://..."
            />
            <FormField
              label="Meetup"
              name="socialLinks.meetup"
              type="url"
              defaultValue={group.socialLinks?.meetup || ""}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Deactivate Group
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Save Changes
          </button>
        </div>
      </Form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Deactivate Group?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              This will mark the group as inactive. It won't be synced anymore, but the data will be preserved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Deactivate
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
