/**
 * Group Members Management
 *
 * Allows group owners and managers to view members, invite new ones,
 * change roles, and remove members. Enforces role hierarchy:
 *   - owners can assign any role
 *   - managers can only assign volunteer/member
 * Includes last-owner protection and leave-group functionality.
 */

import { useFetcher, useOutletContext, redirect } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/groups.$slug.manage.members";
import {
  fetchManagedGroup,
  fetchMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  leaveGroup,
  resolveGroupIdFromSlug,
  type ManagedGroup,
  type GroupMember,
  type GroupPermissions,
} from "~/lib/group-manage-api.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const title = data?.group?.name
    ? `Members - ${data.group.name} | Tampa.dev`
    : "Group Members | Tampa.dev";
  return [{ title }];
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const slug = params.slug;

  // Resolve group ID from slug via the public groups endpoint
  const publicGroup = await resolveGroupIdFromSlug(slug);
  if (!publicGroup) {
    throw new Response("Group not found", { status: 404 });
  }

  const [group, members] = await Promise.all([
    fetchManagedGroup(publicGroup.id, cookieHeader),
    fetchMembers(publicGroup.id, cookieHeader),
  ]);

  return { group, members };
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const slug = params.slug;

  // Resolve group ID from slug
  const publicGroup = await resolveGroupIdFromSlug(slug);
  if (!publicGroup) {
    return { success: false, error: "Group not found" };
  }

  const groupId = publicGroup.id;

  try {
    if (intent === "inviteMember") {
      const userId = formData.get("userId") as string;
      if (!userId?.trim()) {
        return { success: false, error: "User ID is required" };
      }
      await inviteMember(groupId, userId.trim(), cookieHeader);
      return { success: true, action: "invited" };
    }

    if (intent === "updateRole") {
      const memberId = formData.get("memberId") as string;
      const role = formData.get("role") as string;
      if (!memberId || !role) {
        return { success: false, error: "Member ID and role are required" };
      }
      await updateMemberRole(groupId, memberId, role, cookieHeader);
      return { success: true, action: "roleUpdated" };
    }

    if (intent === "removeMember") {
      const memberId = formData.get("memberId") as string;
      if (!memberId) {
        return { success: false, error: "Member ID is required" };
      }
      await removeMember(groupId, memberId, cookieHeader);
      return { success: true, action: "removed" };
    }

    if (intent === "leaveGroup") {
      await leaveGroup(groupId, cookieHeader);
      return redirect("/groups");
    }

    return { success: false, error: "Unknown action" };
  } catch (error) {
    console.error("Member action failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Action failed",
    };
  }
}

type RoleType = "owner" | "manager" | "volunteer" | "member";

const ROLE_BADGE_STYLES: Record<RoleType, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  volunteer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  member: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
};

const ROLE_LABELS: Record<RoleType, string> = {
  owner: "Owner",
  manager: "Manager",
  volunteer: "Volunteer",
  member: "Member",
};

function getAssignableRoles(currentUserRole: RoleType): RoleType[] {
  if (currentUserRole === "owner") {
    return ["owner", "manager", "volunteer", "member"];
  }
  if (currentUserRole === "manager") {
    return ["volunteer", "member"];
  }
  return [];
}

function canModifyMember(
  currentUserRole: RoleType,
  targetMemberRole: RoleType
): boolean {
  // Owners can modify anyone except other owners (need special handling)
  if (currentUserRole === "owner") return true;
  // Managers can only modify volunteers and members
  if (currentUserRole === "manager") {
    return targetMemberRole === "volunteer" || targetMemberRole === "member";
  }
  return false;
}

function MemberRow({
  member,
  currentUserRole,
  isOnlyOwner,
  isCurrentUser,
}: {
  member: GroupMember;
  currentUserRole: RoleType;
  isOnlyOwner: boolean;
  isCurrentUser: boolean;
}) {
  const roleFetcher = useFetcher<{ success: boolean; error?: string }>();
  const removeFetcher = useFetcher<{ success: boolean; error?: string }>();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const assignableRoles = getAssignableRoles(currentUserRole);
  const canModify = canModifyMember(currentUserRole, member.role);

  // Disable role changes and removal for the sole owner
  const isSoleOwner = member.role === "owner" && isOnlyOwner;

  const userName = member.user?.name || "Unknown User";
  const userUsername = member.user?.username;
  const userAvatar = member.user?.avatarUrl;
  const userInitial = (userName || "?").charAt(0).toUpperCase();

  const isRoleUpdating = roleFetcher.state !== "idle";
  const isRemoving = removeFetcher.state !== "idle";

  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      {/* Member Info */}
      <div className="flex items-center gap-3 min-w-0">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
              {userInitial}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {userName}
            </p>
            {isCurrentUser && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-navy/10 text-navy dark:bg-navy-light/20 dark:text-navy-light">
                You
              </span>
            )}
          </div>
          {userUsername && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{userUsername}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Role Badge / Dropdown */}
        {canModify && assignableRoles.length > 0 && !isSoleOwner ? (
          <roleFetcher.Form method="post" className="flex items-center">
            <input type="hidden" name="intent" value="updateRole" />
            <input type="hidden" name="memberId" value={member.id} />
            <select
              name="role"
              defaultValue={member.role}
              disabled={isRoleUpdating}
              onChange={(e) => {
                const form = e.target.closest("form");
                if (form) form.requestSubmit();
              }}
              className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent disabled:opacity-50"
            >
              {/* Always include the member's current role even if not in assignable list */}
              {!assignableRoles.includes(member.role) && (
                <option value={member.role}>{ROLE_LABELS[member.role]}</option>
              )}
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </roleFetcher.Form>
        ) : (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              ROLE_BADGE_STYLES[member.role as RoleType] || ROLE_BADGE_STYLES.member
            }`}
          >
            {ROLE_LABELS[member.role as RoleType] || member.role}
          </span>
        )}

        {/* Remove Button */}
        {canModify && !isCurrentUser && !isSoleOwner && (
          <>
            {confirmRemove ? (
              <div className="flex items-center gap-1">
                <removeFetcher.Form method="post">
                  <input type="hidden" name="intent" value="removeMember" />
                  <input type="hidden" name="memberId" value={member.id} />
                  <button
                    type="submit"
                    disabled={isRemoving}
                    className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRemoving ? "..." : "Confirm"}
                  </button>
                </removeFetcher.Form>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                title="Remove member"
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </>
        )}

        {/* Sole owner indicator */}
        {isSoleOwner && isCurrentUser && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Only owner</span>
        )}
      </div>
    </div>
  );
}

export default function GroupManageMembers({ loaderData }: Route.ComponentProps) {
  const { group: loaderGroup, members: loaderMembers } = loaderData;
  const { group: contextGroup, userRole, permissions } = useOutletContext<{
    group: ManagedGroup;
    userRole: string;
    permissions: GroupPermissions;
  }>();

  const group = contextGroup || loaderGroup;
  const members = loaderMembers;
  const currentUserRole = (userRole || group.userRole) as RoleType;

  const inviteFetcher = useFetcher<{ success: boolean; error?: string; action?: string }>();
  const leaveFetcher = useFetcher<{ success: boolean; error?: string }>();

  const [inviteUserId, setInviteUserId] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Count owners to enforce last-owner protection
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const isOnlyOwner = ownerCount <= 1;

  // Determine if current user is the sole owner
  const currentUserMember = members.find(
    (m) => m.role === currentUserRole && m.userId === group.id
  );
  const isCurrentUserSoleOwner = currentUserRole === "owner" && isOnlyOwner;

  // Handle invite success
  useEffect(() => {
    if (inviteFetcher.data?.success && inviteFetcher.data.action === "invited") {
      setInviteUserId("");
      setSuccessMessage("Member invited successfully.");
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [inviteFetcher.data]);

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {showSuccess && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {inviteFetcher.data?.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {inviteFetcher.data.error}
            </p>
          </div>
        </div>
      )}

      {/* Members Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {members.length} {members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Invite Section (only for managers+) */}
        {permissions?.canManageMembers && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Invite Member
            </h3>
            <inviteFetcher.Form method="post" className="flex items-center gap-3">
              <input type="hidden" name="intent" value="inviteMember" />
              <input
                type="text"
                name="userId"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="Enter user ID..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!inviteUserId.trim() || inviteFetcher.state !== "idle"}
                className="inline-flex items-center gap-2 px-4 py-2 bg-coral hover:bg-coral-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteFetcher.state !== "idle" ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Member
                  </>
                )}
              </button>
            </inviteFetcher.Form>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the user ID of the person you want to invite to this group.
            </p>
          </div>
        )}

        {/* Member List */}
        {members.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No members in this group yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Sort: owners first, then managers, volunteers, members */}
            {[...members]
              .sort((a, b) => {
                const order: Record<string, number> = {
                  owner: 0,
                  manager: 1,
                  volunteer: 2,
                  member: 3,
                };
                return (order[a.role] ?? 4) - (order[b.role] ?? 4);
              })
              .map((member) => {
                // Determine if this member is the current logged-in user
                // by comparing with the group's userRole context
                const isCurrentUser = member.userId === group.id ? false : false;

                return (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUserRole={currentUserRole}
                    isOnlyOwner={isOnlyOwner}
                    isCurrentUser={
                      member.role === currentUserRole &&
                      members.filter((m) => m.role === currentUserRole).length === 1
                        ? true
                        : false
                    }
                  />
                );
              })}
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ROLE_BADGE_STYLES.owner}`}
            >
              Owner
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Full control over the group, settings, members, events, and badges.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ROLE_BADGE_STYLES.manager}`}
            >
              Manager
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Can manage events, members (volunteer/member roles), and check-ins.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ROLE_BADGE_STYLES.volunteer}`}
            >
              Volunteer
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Can check in attendees at events and view the dashboard.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ROLE_BADGE_STYLES.member}`}
            >
              Member
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Basic group membership with view access to the dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Leave Group */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Leaving the group will remove your membership and all associated permissions. This action
          cannot be undone.
        </p>

        {confirmLeave ? (
          <div className="flex items-center gap-3">
            <leaveFetcher.Form method="post">
              <input type="hidden" name="intent" value="leaveGroup" />
              <button
                type="submit"
                disabled={isCurrentUserSoleOwner || leaveFetcher.state !== "idle"}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {leaveFetcher.state !== "idle" ? "Leaving..." : "Yes, Leave Group"}
              </button>
            </leaveFetcher.Form>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            disabled={isCurrentUserSoleOwner}
            title={
              isCurrentUserSoleOwner
                ? "You are the only owner. Transfer ownership before leaving."
                : "Leave this group"
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Leave Group
          </button>
        )}

        {isCurrentUserSoleOwner && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            You are the only owner of this group. Assign another owner before leaving.
          </p>
        )}

        {leaveFetcher.data?.error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{leaveFetcher.data.error}</p>
        )}
      </div>
    </div>
  );
}
