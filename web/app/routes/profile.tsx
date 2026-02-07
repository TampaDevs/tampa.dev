/**
 * Profile Layout Route
 *
 * Provides the profile shell with header card and tab navigation.
 * Requires authentication - redirects to login if not authenticated.
 * Sub-routes load only their own tab-specific data.
 */

import { Outlet, NavLink, redirect, useRevalidator } from "react-router";
import { Avatar } from "~/components/Avatar";
import { useState, useRef } from "react";
import type { Route } from "./+types/profile";
import { fetchCurrentUser, fetchAuthProviders, type AuthProvider } from "~/lib/admin-api.server";
import type { ProfileBadge, ProfileUser, ProfileContext } from "~/lib/profile-types";
import { generateMetaTags } from "~/lib/seo";

export const meta: Route.MetaFunction = () => generateMetaTags({
  title: "Profile",
  description: "Manage your Tampa.dev profile, connected accounts, and authorized apps.",
  url: "/profile",
  noIndex: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const user = await fetchCurrentUser(cookieHeader);

  if (!user) {
    throw redirect("/login?returnTo=/profile");
  }

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const host = new URL(request.url).host;

  // Backward compat: redirect ?tab= params to sub-routes
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab");
  if (tab && tab !== "profile") {
    throw redirect(`/profile/${tab}`);
  }

  const headers = { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) };

  // Load extended profile data and auth providers in parallel
  const results = await Promise.allSettled([
    fetchAuthProviders(),
    fetch(`${apiUrl}/profile`, { headers }),
  ]);

  const providers: AuthProvider[] = results[0].status === "fulfilled" ? results[0].value : [];

  let badges: ProfileBadge[] = [];
  const userExtended: Record<string, unknown> = { ...user };

  if (results[1].status === "fulfilled" && results[1].value.ok) {
    const profileJson = await results[1].value.json() as {
      data: {
        badges?: ProfileBadge[];
        profileVisibility?: string;
        showAchievements?: boolean;
        heroImageUrl?: string | null;
        themeColor?: string | null;
        socialLinks?: string[] | null;
        bio?: string | null;
      };
    };
    const profileData = profileJson.data;
    badges = profileData.badges || [];
    if (profileData.profileVisibility !== undefined) userExtended.profileVisibility = profileData.profileVisibility;
    if (profileData.showAchievements !== undefined) userExtended.showAchievements = profileData.showAchievements;
    if (profileData.heroImageUrl !== undefined) userExtended.heroImageUrl = profileData.heroImageUrl;
    if (profileData.themeColor !== undefined) userExtended.themeColor = profileData.themeColor;
    if (profileData.socialLinks !== undefined) userExtended.socialLinks = profileData.socialLinks;
    if (profileData.bio !== undefined) userExtended.bio = profileData.bio;
  }

  const profileUser: ProfileUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    bio: (userExtended.bio as string | null) ?? null,
    socialLinks: (userExtended.socialLinks as string[] | null) ?? null,
    avatarUrl: user.avatarUrl,
    heroImageUrl: (userExtended.heroImageUrl as string | null) ?? null,
    themeColor: (userExtended.themeColor as string | null) ?? null,
    role: user.role,
    showAchievements: userExtended.showAchievements as boolean | undefined,
    profileVisibility: userExtended.profileVisibility as string | undefined,
    githubUsername: user.githubUsername,
    badges,
  };

  return {
    user: profileUser,
    host,
    apiBaseUrl: apiUrl,
    identities: user.identities || [],
    availableProviders: providers,
  };
}

// Avatar upload component (lives in layout since it's part of the profile card)
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

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      onUploadComplete(finalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
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

const PROFILE_TABS = [
  { to: "/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", end: true },
  { to: "/profile/accounts", label: "Accounts", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", end: false },
  { to: "/profile/portfolio", label: "Portfolio", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", end: false },
  { to: "/profile/achievements", label: "Achievements", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", end: false },
  { to: "/profile/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", end: false },
  { to: "/profile/developer", label: "Developer", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", end: false },
  { to: "/profile/feeds", label: "Feeds", icon: "M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z", end: false },
] as const;

export default function ProfileLayout({ loaderData }: Route.ComponentProps) {
  const { user, host, apiBaseUrl } = loaderData;
  const { revalidate } = useRevalidator();

  const handleAvatarUpload = async (url: string) => {
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

    revalidate();
  };

  const context: ProfileContext = { user, host, apiBaseUrl };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card - always visible */}
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
                {user.username && (
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    @{user.username}
                  </p>
                )}
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

        {/* Tab Bar */}
        <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide" aria-label="Profile sections">
            {PROFILE_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${isActive
                    ? "border-coral text-coral"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <Outlet context={context} />
      </div>
    </div>
  );
}
