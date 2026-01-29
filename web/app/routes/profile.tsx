/**
 * User Profile Page
 *
 * Shows user's profile info, connected accounts, and authorized apps.
 * Users can manage their OAuth grants and upload a custom avatar.
 */

import { redirect, useLoaderData, useFetcher, useRevalidator } from "react-router";
import { Avatar } from "@tampadevs/react";
import { useState, useRef } from "react";
import type { Route } from "./+types/profile";
import { fetchCurrentUser } from "~/lib/admin-api.server";

interface OAuthGrant {
  grantId: string;
  clientId: string;
  clientName: string;
  clientUri?: string;
  logoUri?: string;
  scopes: string[];
  grantedAt: string;
}

interface ProfileData {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    githubUsername?: string;
  };
  grants: OAuthGrant[];
}

export const meta: Route.MetaFunction = () => [
  { title: "Profile | Tampa.dev" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    throw redirect("/login?returnTo=/profile");
  }

  // Fetch user's OAuth grants
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";

  let grants: OAuthGrant[] = [];
  try {
    const grantsResponse = await fetch(`${apiUrl}/oauth/internal/grants/${user.id}`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (grantsResponse.ok) {
      const data = await grantsResponse.json() as { grants: OAuthGrant[] };
      grants = data.grants || [];
    }
  } catch (error) {
    console.error("Failed to fetch grants:", error);
  }

  return { user, grants } as ProfileData;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "revoke") {
    const userId = formData.get("userId") as string;
    const grantId = formData.get("grantId") as string;

    const apiUrl = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";

    try {
      const response = await fetch(`${apiUrl}/oauth/internal/grants/${userId}/${grantId}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke grant");
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to revoke grant:", error);
      return { success: false, error: "Failed to revoke access" };
    }
  }

  if (intent === "updateAvatar") {
    const avatarUrl = formData.get("avatarUrl") as string;
    const apiUrl = import.meta.env.EVENTS_API_URL || "https://events.api.tampa.dev";

    try {
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ avatarUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to update avatar");
      }

      return { success: true, avatarUpdated: true };
    } catch (error) {
      console.error("Failed to update avatar:", error);
      return { success: false, error: "Failed to update avatar" };
    }
  }

  return { success: false };
}

// Avatar upload component
function AvatarUpload({
  currentAvatar,
  userName,
  onUploadComplete,
}: {
  currentAvatar: string | null;
  userName: string;
  onUploadComplete: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, GIF, or WebP image");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Step 1: Request presigned upload URL
      const requestResponse = await fetch("/api/uploads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "avatar",
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

      // Step 2: Upload directly to R2 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      // Call the completion handler with the final public URL
      onUploadComplete(finalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative group">
      <Avatar
        src={previewUrl || currentAvatar || undefined}
        name={userName}
        size="lg"
        className="w-24 h-24"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
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
      {error && (
        <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-500 text-center">
          {error}
        </p>
      )}
    </div>
  );
}

// Scope display names
const SCOPE_LABELS: Record<string, string> = {
  profile: "Profile",
  "events:read": "Events",
  "groups:read": "Groups",
  "rsvp:read": "RSVPs (read)",
  "rsvp:write": "RSVPs (write)",
  "favorites:read": "Favorites (read)",
  "favorites:write": "Favorites (write)",
};

function GrantCard({ grant, userId }: { grant: OAuthGrant; userId: string }) {
  const fetcher = useFetcher();
  const isRevoking = fetcher.state !== "idle";

  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        {grant.logoUri ? (
          <img
            src={grant.logoUri}
            alt={grant.clientName}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {grant.clientName}
            </h3>
            {grant.clientUri && (
              <a
                href={grant.clientUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-coral hover:underline"
              >
                {new URL(grant.clientUri).hostname}
              </a>
            )}
          </div>

          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (!confirm(`Revoke access for ${grant.clientName}? This app will no longer be able to access your Tampa.dev account.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="revoke" />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="grantId" value={grant.grantId} />
            <button
              type="submit"
              disabled={isRevoking}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </button>
          </fetcher.Form>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {grant.scopes.map((scope) => (
            <span
              key={scope}
              className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
            >
              {SCOPE_LABELS[scope] || scope}
            </span>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Authorized {new Date(grant.grantedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, grants } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const handleAvatarUpload = async (url: string) => {
    // Update avatar via direct API call (bypasses React Router CSRF check)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: url }),
      });

      if (!response.ok) {
        console.error("Failed to update avatar");
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
    }

    // Revalidate to refresh the page data
    revalidate();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <AvatarUpload
                currentAvatar={user.avatarUrl}
                userName={user.name || user.email}
                onUploadComplete={handleAvatarUpload}
              />
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.name || "User"}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {user.email}
                </p>
                {user.githubUsername && (
                  <a
                    href={`https://github.com/${user.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-coral hover:underline"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    @{user.githubUsername}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connected Accounts
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center">
                  <svg className="w-6 h-6 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">GitHub</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.githubUsername ? `@${user.githubUsername}` : "Connected"}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                Connected
              </span>
            </div>
          </div>
        </section>

        {/* Authorized Apps */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Authorized Apps
          </h2>

          {grants.length > 0 ? (
            <div className="space-y-3">
              {grants.map((grant) => (
                <GrantCard key={grant.grantId} grant={grant} userId={user.id} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                No authorized apps
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                When you authorize third-party apps to access your Tampa.dev account, they'll appear here.
              </p>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <button
                disabled
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
