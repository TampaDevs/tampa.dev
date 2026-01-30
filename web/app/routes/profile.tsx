/**
 * User Profile Page
 *
 * Shows user's profile info, connected accounts, and authorized apps.
 * Users can manage their OAuth grants, upload a custom avatar,
 * edit their profile, and delete their account.
 */

import { redirect, useLoaderData, useFetcher, useRevalidator } from "react-router";
import { Avatar } from "@tampadevs/react";
import { useState, useRef, useCallback } from "react";
import type { Route } from "./+types/profile";
import { fetchCurrentUser, fetchAuthProviders, type AuthIdentity, type AuthProvider } from "~/lib/admin-api.server";
import { ProviderIcon } from "./login";

interface OAuthGrant {
  grantId: string;
  clientId: string;
  clientName: string;
  clientUri?: string;
  logoUri?: string;
  scopes: string[];
  grantedAt: string;
}

interface ProfileBadge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
}

interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  showAchievements?: boolean;
  githubUsername?: string;
  badges?: ProfileBadge[];
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

interface ApiTokenInfo {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface AchievementInfo {
  key: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completedAt: string | null;
  badgeSlug: string | null;
}

interface ProfileData {
  user: ProfileUser;
  grants: OAuthGrant[];
  host: string;
  identities: AuthIdentity[];
  availableProviders: AuthProvider[];
  portfolioItems: PortfolioItem[];
  apiTokens: ApiTokenInfo[];
  achievements: AchievementInfo[];
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

  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const host = new URL(request.url).host;

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

  // Fetch available auth providers, user's linked identities, and badges
  let badges: ProfileBadge[] = [];
  const [providers, identities] = await Promise.all([
    fetchAuthProviders(),
    Promise.resolve(user.identities || []),
  ]);

  let portfolioItems: PortfolioItem[] = [];
  let apiTokensList: ApiTokenInfo[] = [];
  let achievements: AchievementInfo[] = [];
  try {
    const [profileResponse, portfolioResponse, tokensResponse, achievementsResponse] = await Promise.all([
      fetch(`${apiUrl}/profile`, {
        headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      }),
      fetch(`${apiUrl}/profile/portfolio`, {
        headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      }),
      fetch(`${apiUrl}/profile/tokens`, {
        headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      }),
      fetch(`${apiUrl}/profile/achievements`, {
        headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      }),
    ]);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json() as { badges?: ProfileBadge[] };
      badges = profileData.badges || [];
    }
    if (portfolioResponse.ok) {
      const portfolioData = await portfolioResponse.json() as { items: PortfolioItem[] };
      portfolioItems = portfolioData.items || [];
    }
    if (tokensResponse.ok) {
      const tokensData = await tokensResponse.json() as { tokens: ApiTokenInfo[] };
      apiTokensList = tokensData.tokens || [];
    }
    if (achievementsResponse.ok) {
      const achievementsData = await achievementsResponse.json() as { achievements: AchievementInfo[] };
      achievements = achievementsData.achievements || [];
    }
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
  }

  const userWithBadges = { ...user, badges };
  return { user: userWithBadges, grants, host, identities, availableProviders: providers, portfolioItems, apiTokens: apiTokensList, achievements } as ProfileData;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  if (intent === "revoke") {
    const userId = formData.get("userId") as string;
    const grantId = formData.get("grantId") as string;

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

    try {
      const response = await fetch(`${apiUrl}/profile`, {
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

  if (intent === "updateProfile") {
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const bio = formData.get("bio") as string;
    const github = formData.get("socialLinks.github") as string;
    const twitter = formData.get("socialLinks.twitter") as string;
    const linkedin = formData.get("socialLinks.linkedin") as string;
    const website = formData.get("socialLinks.website") as string;

    const body: Record<string, unknown> = {};
    if (name !== null) body.name = name || undefined;
    if (username) body.username = username;
    body.bio = bio || null;

    const socialLinks: Record<string, string> = {};
    if (github) socialLinks.github = github;
    if (twitter) socialLinks.twitter = twitter;
    if (linkedin) socialLinks.linkedin = linkedin;
    if (website) socialLinks.website = website;
    body.socialLinks = Object.keys(socialLinks).length > 0 ? socialLinks : null;

    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to update profile" };
      }

      return { success: true, profileUpdated: true };
    } catch (error) {
      console.error("Failed to update profile:", error);
      return { success: false, error: "Failed to update profile" };
    }
  }

  if (intent === "setPrimaryEmail") {
    const provider = formData.get("provider") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/primary-email`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to update email" };
      }

      return { success: true, emailUpdated: true };
    } catch (error) {
      console.error("Failed to set primary email:", error);
      return { success: false, error: "Failed to update email" };
    }
  }

  if (intent === "unlinkIdentity") {
    const provider = formData.get("provider") as string;

    try {
      const response = await fetch(`${apiUrl}/auth/identities/${encodeURIComponent(provider)}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to unlink account" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to unlink identity:", error);
      return { success: false, error: "Failed to unlink account" };
    }
  }

  if (intent === "addPortfolio") {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const url = formData.get("url") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          title,
          description: description || null,
          url: url || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to add project" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to add portfolio item:", error);
      return { success: false, error: "Failed to add project" };
    }
  }

  if (intent === "deletePortfolio") {
    const itemId = formData.get("itemId") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/portfolio/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to delete project" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to delete portfolio item:", error);
      return { success: false, error: "Failed to delete project" };
    }
  }

  if (intent === "createToken") {
    const name = formData.get("tokenName") as string;
    const scopesRaw = formData.get("tokenScopes") as string;
    const scopes = scopesRaw ? scopesRaw.split(",").filter(Boolean) : [];

    try {
      const response = await fetch(`${apiUrl}/profile/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ name, scopes }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || "Failed to create token" };
      }

      const data = await response.json() as { token: string; id: string };
      return { success: true, tokenCreated: true, newToken: data.token };
    } catch (error) {
      console.error("Failed to create token:", error);
      return { success: false, error: "Failed to create token" };
    }
  }

  if (intent === "revokeToken") {
    const tokenId = formData.get("tokenId") as string;

    try {
      const response = await fetch(`${apiUrl}/profile/tokens/${encodeURIComponent(tokenId)}`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) {
        return { success: false, error: "Failed to revoke token" };
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to revoke token:", error);
      return { success: false, error: "Failed to revoke token" };
    }
  }

  if (intent === "deleteAccount") {
    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: "DELETE",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      // Clear session cookies and redirect to home
      const clearCookies = [
        "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
        "session_staging=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Domain=.tampa.dev",
      ];
      return redirect("/", {
        headers: [
          ["Set-Cookie", clearCookies[0]],
          ["Set-Cookie", clearCookies[1]],
        ],
      });
    } catch (error) {
      console.error("Failed to delete account:", error);
      return { success: false, error: "Failed to delete account" };
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
  user: "Profile (full)",
  "read:user": "Profile (read)",
  "user:email": "Email",
  "read:events": "Events",
  "read:groups": "Groups",
  "read:favorites": "Favorites (read)",
  "write:favorites": "Favorites (write)",
  "read:portfolio": "Portfolio (read)",
  "write:portfolio": "Portfolio (write)",
  admin: "Admin",
  // Legacy
  profile: "Profile",
  "events:read": "Events",
  "groups:read": "Groups",
  "rsvp:read": "RSVPs (read)",
  "rsvp:write": "RSVPs (write)",
  "favorites:read": "Favorites (read)",
  "favorites:write": "Favorites (write)",
};

// Available scopes for PAT creation
const PAT_SCOPES = [
  { value: "read:user", label: "Read profile" },
  { value: "user", label: "Read/write profile" },
  { value: "user:email", label: "Read email" },
  { value: "read:events", label: "Read events" },
  { value: "read:groups", label: "Read groups" },
  { value: "read:favorites", label: "Read favorites" },
  { value: "write:favorites", label: "Write favorites" },
  { value: "read:portfolio", label: "Read portfolio" },
  { value: "write:portfolio", label: "Write portfolio" },
];

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

// Profile edit form
function ProfileEditForm({ user, host }: { user: ProfileUser; host: string }) {
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string; profileUpdated?: boolean } | undefined;

  const [username, setUsername] = useState(user.username || "");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [bio, setBio] = useState("");
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced username availability check
  const checkUsername = useCallback((value: string) => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (!value || value.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    if (value === user.username) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/profile/check-username/${encodeURIComponent(value)}`, {
          credentials: "include",
        });
        const data = await response.json() as { available: boolean; reason?: string };
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
  }, [user.username]);

  const handleUsernameChange = (value: string) => {
    const filtered = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(filtered);
    checkUsername(filtered);
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Edit Profile
      </h2>

      {actionData?.profileUpdated && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">Profile updated.</p>
        </div>
      )}
      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-5">
        <input type="hidden" name="intent" value="updateProfile" />

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name || ""}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 select-none">@</span>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              minLength={3}
              maxLength={30}
              placeholder="your-username"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
            />
          </div>
          <div className="mt-1 h-5">
            {usernameStatus === "checking" && (
              <p className="text-xs text-gray-500">Checking availability...</p>
            )}
            {usernameStatus === "available" && username.length >= 3 && (
              <p className="text-xs text-green-600 dark:text-green-400">Username is available</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-xs text-red-600 dark:text-red-400">Username is taken or reserved</p>
            )}
          </div>
          {user.username && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your public profile:{" "}
              <a
                href={`https://${host}/p/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral hover:underline"
              >
                {host}/p/{user.username}
              </a>
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={500}
            defaultValue={""}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {bio.length}/500
          </p>
        </div>

        {/* Social Links */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Social Links</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="social-github" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">GitHub</label>
              <input
                id="social-github"
                name="socialLinks.github"
                type="url"
                defaultValue={user.githubUsername ? `https://github.com/${user.githubUsername}` : ""}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
              />
            </div>
            <div>
              <label htmlFor="social-twitter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Twitter / X</label>
              <input
                id="social-twitter"
                name="socialLinks.twitter"
                type="url"
                placeholder="https://x.com/..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
              />
            </div>
            <div>
              <label htmlFor="social-linkedin" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">LinkedIn</label>
              <input
                id="social-linkedin"
                name="socialLinks.linkedin"
                type="url"
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
              />
            </div>
            <div>
              <label htmlFor="social-website" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Website</label>
              <input
                id="social-website"
                name="socialLinks.website"
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
              />
            </div>
          </div>
        </fieldset>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving || usernameStatus === "taken"}
            className="inline-flex items-center gap-2 px-5 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </fetcher.Form>
    </section>
  );
}

// Delete account button with confirmation
function DeleteAccountButton() {
  const fetcher = useFetcher();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const isDeleting = fetcher.state !== "idle";

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      <p className="text-sm text-red-600 dark:text-red-400">
        Type <strong>DELETE</strong> to confirm:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      />
      <div className="flex gap-2">
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="deleteAccount" />
          <button
            type="submit"
            disabled={confirmText !== "DELETE" || isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </button>
        </fetcher.Form>
        <button
          onClick={() => { setShowConfirm(false); setConfirmText(""); }}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  linkedin: "LinkedIn",
  slack: "Slack",
  meetup: "Meetup",
  eventbrite: "Eventbrite",
  apple: "Apple",
};

function ConnectedAccounts({
  identities,
  availableProviders,
  userId,
  currentEmail,
}: {
  identities: AuthIdentity[];
  availableProviders: AuthProvider[];
  userId: string;
  currentEmail: string;
}) {
  const fetcher = useFetcher();
  const emailFetcher = useFetcher();
  const isUnlinking = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;
  const emailActionData = emailFetcher.data as { success?: boolean; error?: string; emailUpdated?: boolean } | undefined;

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const unlinkableProviders = availableProviders.filter(
    (p) => !linkedProviders.has(p.provider)
  );

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Connected Accounts
      </h2>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Linked identities */}
        {identities.map((identity) => (
          <div
            key={identity.provider}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <ProviderIcon provider={identity.provider} />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {PROVIDER_NAMES[identity.provider] || identity.provider}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {identity.username
                      ? `@${identity.username}`
                      : identity.email || "Connected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Connected
                </span>
                {identities.length > 1 && (
                  <fetcher.Form
                    method="post"
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Unlink your ${PROVIDER_NAMES[identity.provider] || identity.provider} account?`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="intent" value="unlinkIdentity" />
                    <input type="hidden" name="provider" value={identity.provider} />
                    <button
                      type="submit"
                      disabled={isUnlinking}
                      className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Unlink
                    </button>
                  </fetcher.Form>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Primary email selector */}
        {(() => {
          const emailIdentities = identities.filter((i) => i.email);
          if (emailIdentities.length <= 1) return null;
          return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Email
              </p>
              {emailActionData?.emailUpdated && (
                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-400">Primary email updated.</p>
                </div>
              )}
              <div className="space-y-2">
                {emailIdentities.map((identity) => {
                  const isCurrent = identity.email === currentEmail;
                  return (
                    <div key={identity.provider} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {identity.email}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({PROVIDER_NAMES[identity.provider] || identity.provider})
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-coral/10 text-coral rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      {!isCurrent && (
                        <emailFetcher.Form method="post">
                          <input type="hidden" name="intent" value="setPrimaryEmail" />
                          <input type="hidden" name="provider" value={identity.provider} />
                          <button
                            type="submit"
                            disabled={emailFetcher.state !== "idle"}
                            className="text-xs font-medium text-coral hover:underline disabled:opacity-50"
                          >
                            Set as primary
                          </button>
                        </emailFetcher.Form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Available providers to link */}
        {unlinkableProviders.map((provider) => (
          <div
            key={provider.provider}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-dashed p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center opacity-50">
                  <ProviderIcon provider={provider.provider} />
                </div>
                <div>
                  <p className="font-medium text-gray-500 dark:text-gray-400">
                    {provider.name}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Not connected
                  </p>
                </div>
              </div>
              <a
                href={`${provider.authUrl}?linkUserId=${userId}&returnTo=/profile`}
                className="px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
              >
                Link
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const fetcher = useFetcher();
  const isAdding = fetcher.state !== "idle";

  // Close form on successful add
  const actionData = fetcher.data as { success?: boolean } | undefined;
  if (actionData?.success && showForm && !isAdding) {
    setShowForm(false);
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <fetcher.Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="addPortfolio" />
            <div>
              <label htmlFor="portfolio-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                id="portfolio-title"
                name="title"
                type="text"
                required
                maxLength={200}
                placeholder="My Project"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div>
              <label htmlFor="portfolio-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="portfolio-desc"
                name="description"
                rows={2}
                maxLength={500}
                placeholder="Brief description..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral resize-none"
              />
            </div>
            <div>
              <label htmlFor="portfolio-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                id="portfolio-url"
                name="url"
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
              >
                {isAdding ? "Adding..." : "Add Project"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showcase your projects. Add your first project to get started.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-coral hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {new URL(item.url).hostname}
            </a>
          )}
        </div>
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(`Remove "${item.title}" from your portfolio?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="deletePortfolio" />
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

function ApiTokensSection({ tokens }: { tokens: ApiTokenInfo[] }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:user", "read:events", "read:groups"]);
  const fetcher = useFetcher();
  const isCreating = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; tokenCreated?: boolean; newToken?: string; error?: string } | undefined;

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          API Tokens
        </h2>
        {!showForm && !actionData?.newToken && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Token
          </button>
        )}
      </div>

      {/* Newly created token display */}
      {actionData?.newToken && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
            Token created. Copy it now — you won't see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg text-sm font-mono text-gray-900 dark:text-white break-all">
              {actionData.newToken}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(actionData.newToken!)}
              className="shrink-0 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="createToken" />
            <input type="hidden" name="tokenScopes" value={selectedScopes.join(",")} />
            <div>
              <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token Name
              </label>
              <input
                id="token-name"
                name="tokenName"
                type="text"
                required
                maxLength={100}
                placeholder="e.g. CI/CD Pipeline"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Scopes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAT_SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      selectedScopes.includes(scope.value)
                        ? "border-coral bg-coral/10 text-coral"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="sr-only"
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isCreating || selectedScopes.length === 0}
                className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Token"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}

      {tokens.length > 0 ? (
        <div className="space-y-3">
          {tokens.map((token) => (
            <ApiTokenCard key={token.id} token={token} />
          ))}
        </div>
      ) : !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personal access tokens let you authenticate with the API. Create one to get started.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function ApiTokenCard({ token }: { token: ApiTokenInfo }) {
  const fetcher = useFetcher();
  const isRevoking = fetcher.state !== "idle";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {token.name}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 font-mono">
            {token.tokenPrefix}...
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {token.scopes.map((scope) => (
              <span
                key={scope}
                className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {SCOPE_LABELS[scope] || scope}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Created {new Date(token.createdAt).toLocaleDateString()}</span>
            {token.lastUsedAt && (
              <span>Last used {new Date(token.lastUsedAt).toLocaleDateString()}</span>
            )}
            {token.expiresAt && (
              <span>
                {new Date(token.expiresAt) < new Date()
                  ? "Expired"
                  : `Expires ${new Date(token.expiresAt).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>
        <fetcher.Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(`Revoke token "${token.name}"? Any applications using this token will lose access.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="revokeToken" />
          <input type="hidden" name="tokenId" value={token.id} />
          <button
            type="submit"
            disabled={isRevoking}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isRevoking ? "Revoking..." : "Revoke"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}

function AchievementsSection({
  achievements,
  showAchievements,
}: {
  achievements: AchievementInfo[];
  showAchievements: boolean;
}) {
  const [visible, setVisible] = useState(showAchievements);
  const [saving, setSaving] = useState(false);

  const toggleVisibility = async () => {
    const newValue = !visible;
    setVisible(newValue);
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ showAchievements: newValue }),
      });
    } catch {
      setVisible(!newValue); // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Achievements
        </h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {saving ? "Saving..." : visible ? "Visible on profile" : "Hidden from profile"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            onClick={toggleVisibility}
            disabled={saving}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${
              visible ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                visible ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map((a) => {
          const pct = Math.min(100, Math.round((a.currentValue / a.targetValue) * 100));
          const isComplete = a.completedAt !== null;
          return (
            <div
              key={a.key}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${
                isComplete
                  ? "border-green-200 dark:border-green-800"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {a.name}
                </span>
                {isComplete && (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {a.description}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isComplete ? "bg-green-500" : "bg-coral"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {a.currentValue} / {a.targetValue}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { user, grants, host, identities, availableProviders, portfolioItems, apiTokens: tokens, achievements } = useLoaderData<typeof loader>();
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

        {/* Badges */}
        {user.badges && user.badges.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((badge) => (
                <span
                  key={badge.id}
                  title={badge.description || badge.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: badge.color }}
                >
                  {badge.icon} {badge.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <AchievementsSection
            achievements={achievements}
            showAchievements={user.showAchievements !== false}
          />
        )}

        {/* Edit Profile Form */}
        <ProfileEditForm user={user} host={host} />

        {/* Connected Accounts */}
        <ConnectedAccounts
          identities={identities}
          availableProviders={availableProviders}
          userId={user.id}
          currentEmail={user.email}
        />

        {/* Portfolio */}
        <PortfolioSection items={portfolioItems} />

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

        {/* API Tokens */}
        <ApiTokensSection tokens={tokens} />

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
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <DeleteAccountButton />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
