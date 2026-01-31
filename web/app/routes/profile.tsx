/**
 * User Profile Page
 *
 * Shows user's profile info, connected accounts, and authorized apps.
 * Users can manage their OAuth grants, upload a custom avatar,
 * edit their profile, and delete their account.
 */

import { redirect, useLoaderData, useFetcher, useRevalidator, useSearchParams, Link } from "react-router";
import { Avatar } from "@tampadevs/react";
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import type { Route } from "./+types/profile";
import { fetchCurrentUser, fetchAuthProviders, type AuthIdentity, type AuthProvider } from "~/lib/admin-api.server";
import { ProviderIcon } from "./login";
import { SocialLinkIcon } from "~/components/SocialLinkIcon";
import { getTrophyTier, TrophyIcon, type TrophyTier } from "~/lib/trophy-tiers";
import { getRarityTier } from "~/lib/rarity";

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
  points?: number;
  rarity?: { tier: string; percentage: number };
}

interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  socialLinks: string[] | null;
  avatarUrl: string | null;
  heroImageUrl: string | null;
  themeColor: string | null;
  role: string;
  showAchievements?: boolean;
  profileVisibility?: string;
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
  icon: string | null;
  color: string | null;
}

interface FavoriteGroup {
  groupSlug: string;
  groupName: string;
}

interface ProfileData {
  user: ProfileUser;
  grants: OAuthGrant[];
  host: string;
  apiBaseUrl: string;
  identities: AuthIdentity[];
  availableProviders: AuthProvider[];
  portfolioItems: PortfolioItem[];
  apiTokens: ApiTokenInfo[];
  achievements: AchievementInfo[];
  favoriteGroups: FavoriteGroup[];
}

export const meta: Route.MetaFunction = () => [
  { title: "Profile | Tampa.dev" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;
  let user = await fetchCurrentUser(cookieHeader);

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
  let favoriteGroups: FavoriteGroup[] = [];
  try {
    const [profileResponse, portfolioResponse, tokensResponse, achievementsResponse, favoritesResponse] = await Promise.all([
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
      fetch(`${apiUrl}/favorites`, {
        headers: { Accept: "application/json", ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      }),
    ]);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json() as { badges?: ProfileBadge[]; profileVisibility?: string; showAchievements?: boolean; heroImageUrl?: string | null; themeColor?: string | null; socialLinks?: string[] | null; bio?: string | null };
      badges = profileData.badges || [];
      if (profileData.profileVisibility) {
        user = { ...user, profileVisibility: profileData.profileVisibility } as typeof user;
      }
      if (profileData.showAchievements !== undefined) {
        user = { ...user, showAchievements: profileData.showAchievements } as typeof user;
      }
      if (profileData.heroImageUrl !== undefined) {
        user = { ...user, heroImageUrl: profileData.heroImageUrl } as typeof user;
      }
      if (profileData.themeColor !== undefined) {
        user = { ...user, themeColor: profileData.themeColor } as typeof user;
      }
      if (profileData.socialLinks !== undefined) {
        user = { ...user, socialLinks: profileData.socialLinks } as typeof user;
      }
      if (profileData.bio !== undefined) {
        user = { ...user, bio: profileData.bio } as typeof user;
      }
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
    if (favoritesResponse.ok) {
      const favoritesData = await favoritesResponse.json() as { favorites: FavoriteGroup[] };
      favoriteGroups = favoritesData.favorites || [];
    }
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
  }

  const userWithBadges = { ...user, badges };
  return { user: userWithBadges, grants, host, apiBaseUrl: apiUrl, identities, availableProviders: providers, portfolioItems, apiTokens: apiTokensList, achievements, favoriteGroups } as ProfileData;
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

  if (intent === "updateHeroImage") {
    const heroImageUrl = formData.get("heroImageUrl") as string | null;

    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ heroImageUrl: heroImageUrl || null }),
      });

      if (!response.ok) {
        throw new Error("Failed to update hero image");
      }

      return { success: true, heroUpdated: true };
    } catch (error) {
      console.error("Failed to update hero image:", error);
      return { success: false, error: "Failed to update hero image" };
    }
  }

  if (intent === "updateThemeColor") {
    const themeColor = formData.get("themeColor") as string | null;

    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ themeColor: themeColor || null }),
      });

      if (!response.ok) {
        throw new Error("Failed to update theme color");
      }

      return { success: true, themeUpdated: true };
    } catch (error) {
      console.error("Failed to update theme color:", error);
      return { success: false, error: "Failed to update theme color" };
    }
  }

  if (intent === "updateProfile") {
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const bio = formData.get("bio") as string;

    const body: Record<string, unknown> = {};
    if (name !== null) body.name = name || undefined;
    if (username) body.username = username;
    body.bio = bio || null;

    const socialLinks: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === "socialLinks[]" && typeof value === "string" && value.trim()) {
        socialLinks.push(value.trim());
      }
    }
    body.socialLinks = socialLinks.length > 0 ? socialLinks : null;

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

// Theme color palette and gradient map
const THEME_PALETTE = [
  { key: "coral", label: "Coral", hex: "#E85A4F" },
  { key: "ocean", label: "Ocean", hex: "#0891B2" },
  { key: "sunset", label: "Sunset", hex: "#F59E0B" },
  { key: "forest", label: "Forest", hex: "#059669" },
  { key: "violet", label: "Violet", hex: "#7C3AED" },
  { key: "rose", label: "Rose", hex: "#E11D48" },
  { key: "slate", label: "Slate", hex: "#475569" },
  { key: "sky", label: "Sky", hex: "#0284C7" },
] as const;

const THEME_GRADIENTS: Record<string, string> = {
  coral: "linear-gradient(135deg, #C44D44 0%, #E85A4F 40%, #F07167 100%)",
  ocean: "linear-gradient(135deg, #0E7490 0%, #0891B2 40%, #06B6D4 100%)",
  sunset: "linear-gradient(135deg, #D97706 0%, #F59E0B 40%, #FBBF24 100%)",
  forest: "linear-gradient(135deg, #047857 0%, #059669 40%, #10B981 100%)",
  violet: "linear-gradient(135deg, #6D28D9 0%, #7C3AED 40%, #A78BFA 100%)",
  rose: "linear-gradient(135deg, #BE123C 0%, #E11D48 40%, #FB7185 100%)",
  slate: "linear-gradient(135deg, #334155 0%, #475569 40%, #94A3B8 100%)",
  sky: "linear-gradient(135deg, #0369A1 0%, #0284C7 40%, #38BDF8 100%)",
};

function getThemeGradient(themeColor: string | null): string {
  return THEME_GRADIENTS[themeColor || "coral"] || THEME_GRADIENTS.coral;
}

// Hero image upload component
function HeroImageUpload({
  currentHero,
  themeColor,
  onUploadComplete,
  onRemove,
}: {
  currentHero: string | null;
  themeColor: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
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

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
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
          category: "hero",
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

  const displayUrl = previewUrl || currentHero;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Cover Image
      </label>
      <div className="relative group rounded-xl overflow-hidden h-36 sm:h-44 cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
        {displayUrl ? (
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: getThemeGradient(themeColor) }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <div className="text-center text-white">
              <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Change Cover</span>
            </div>
          )}
        </div>
        {currentHero && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Recommended: 1500 x 500 pixels. Max 5MB.
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

// Theme color picker component
function ThemeColorPicker({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Theme Color
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Sets the accent color for your profile and gradient background.
      </p>
      <div className="flex flex-wrap gap-3">
        {THEME_PALETTE.map((color) => (
          <button
            key={color.key}
            type="button"
            onClick={() => onChange(color.key)}
            title={color.label}
            className={`w-8 h-8 rounded-full transition-all ${(selected || "coral") === color.key
                ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-800 scale-110"
                : "hover:scale-105"
              }`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
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
function ProfileEditForm({
  user,
  host,
  onHeroUpload,
  onHeroRemove,
  onThemeColorChange,
}: {
  user: ProfileUser;
  host: string;
  onHeroUpload: (url: string) => void;
  onHeroRemove: () => void;
  onThemeColorChange: (color: string) => void;
}) {
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string; profileUpdated?: boolean } | undefined;

  const [username, setUsername] = useState(user.username || "");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [bio, setBio] = useState(user.bio || "");
  const [socialLinks, setSocialLinks] = useState<string[]>(user.socialLinks || []);
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
            defaultValue={user.bio || ""}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
            {bio.length}/500
          </p>
        </div>

        {/* Cover Image */}
        <HeroImageUpload
          currentHero={user.heroImageUrl}
          themeColor={user.themeColor}
          onUploadComplete={onHeroUpload}
          onRemove={onHeroRemove}
        />

        {/* Theme Color */}
        <ThemeColorPicker
          selected={user.themeColor}
          onChange={onThemeColorChange}
        />

        {/* Social Links */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Social Links</legend>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Add up to 5 links. Icons are inferred automatically from the URL.
          </p>
          <div className="space-y-2">
            {socialLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="shrink-0 w-5 h-5 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                  <SocialLinkIcon url={link} />
                </span>
                <input
                  name="socialLinks[]"
                  type="url"
                  value={link}
                  onChange={(e) => {
                    const updated = [...socialLinks];
                    updated[index] = e.target.value;
                    setSocialLinks(updated);
                  }}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  aria-label="Remove link"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {socialLinks.length < 5 && (
              <button
                type="button"
                onClick={() => setSocialLinks([...socialLinks, ""])}
                className="inline-flex items-center gap-1.5 text-sm text-coral hover:text-coral-dark transition-colors mt-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add link
              </button>
            )}
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

function ApiTokensSection({ tokens, userRole }: { tokens: ApiTokenInfo[]; userRole: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:user", "read:events", "read:groups"]);
  const fetcher = useFetcher();
  const isCreating = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; tokenCreated?: boolean; newToken?: string; error?: string } | undefined;

  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const availableScopes = isAdmin
    ? [...PAT_SCOPES, { value: "admin", label: "Admin access" }]
    : PAT_SCOPES;

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
            Token created. Copy it now - you won't see it again.
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
                {availableScopes.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${selectedScopes.includes(scope.value)
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

function BadgePillWithPopover({ badge }: { badge: ProfileBadge }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverAlign, setPopoverAlign] = useState<"center" | "left" | "right">("center");

  useEffect(() => {
    if (!pinned) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [pinned]);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    if (rect.left < 0) {
      setPopoverAlign("left");
    } else if (rect.right > window.innerWidth) {
      setPopoverAlign("right");
    } else {
      setPopoverAlign("center");
    }
  }, [open]);

  const hasPopoverContent = badge.description || (badge.points != null && badge.points > 0) || badge.rarity;

  const popoverPositionClass =
    popoverAlign === "left"
      ? "left-0"
      : popoverAlign === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  const arrowPositionClass =
    popoverAlign === "left"
      ? "left-4"
      : popoverAlign === "right"
        ? "right-4"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => hasPopoverContent && setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => {
          if (!hasPopoverContent) return;
          setPinned(!pinned);
          setOpen(!pinned);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
        style={{
          backgroundColor: badge.color,
          cursor: hasPopoverContent ? "pointer" : "default",
        }}
      >
        {badge.icon} {badge.name}
      </button>
      {open && hasPopoverContent && (
        <div ref={popoverRef} className={`absolute ${popoverPositionClass} top-full mt-2 z-20 w-52 p-3 rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs shadow-xl backdrop-blur-sm border border-white/10`}>
          <div className={`absolute ${arrowPositionClass} -top-1 w-2 h-2 rotate-45 bg-gray-900/95 dark:bg-gray-800/95 border-l border-t border-white/10`} />
          {badge.description && <p className="relative leading-relaxed">{badge.description}</p>}
          {badge.points != null && badge.points > 0 && (
            <p className="relative mt-1.5 text-xs font-semibold text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" /></svg>
              {badge.points} XP
            </p>
          )}
          {badge.rarity && (
            <p className="relative mt-1.5 text-xs font-medium flex items-center gap-1" style={{ color: getRarityTier(badge.rarity.percentage).color }}>
              {getRarityTier(badge.rarity.percentage).label} — {badge.rarity.percentage.toFixed(1)}% of members
            </p>
          )}
        </div>
      )}
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
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${visible ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${visible ? "translate-x-4" : "translate-x-0"
                }`}
            />
          </button>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {achievements.map((a) => {
          const pct = Math.min(100, Math.round((a.currentValue / a.targetValue) * 100));
          const isComplete = a.completedAt !== null;
          const barColor = a.color || (isComplete ? "#22c55e" : undefined);
          return (
            <div
              key={a.key}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${isComplete
                ? "border-green-200 dark:border-green-800"
                : "border-gray-200 dark:border-gray-700"
                }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {a.icon && <span className="mr-1.5">{a.icon}</span>}
                  {a.name}
                </span>
                {isComplete && (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                    style={{ backgroundColor: a.color || "#22c55e" }}
                  >
                    Done
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {a.description}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor || "var(--color-coral, #f97066)",
                  }}
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

function ProfileVisibilityToggle({
  currentVisibility,
  username,
  host,
}: {
  currentVisibility: string;
  username: string | null;
  host: string;
}) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [saving, setSaving] = useState(false);

  const isPublic = visibility === "public";

  const toggleVisibility = async () => {
    const newValue = isPublic ? "private" : "public";
    setVisibility(newValue);
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileVisibility: newValue }),
      });
    } catch {
      setVisibility(visibility); // revert on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Profile Visibility
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isPublic ? (
              <>
                Your profile is visible in the{" "}
                <Link to="/members" className="text-coral hover:underline">member directory</Link>
                {username && (
                  <>
                    {" "}and at your{" "}
                    <a href={`https://${host}/p/${username}`} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline">public URL</a>
                  </>
                )}
                .
              </>
            ) : (
              "Your profile is hidden from the member directory."
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            {saving ? "Saving..." : isPublic ? "Public" : "Private"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={toggleVisibility}
            disabled={saving}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 disabled:opacity-50 ${isPublic ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublic ? "translate-x-4" : "translate-x-0"
                }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-coral hover:text-coral-dark transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400 font-mono truncate"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>
    </div>
  );
}

function FeedsSection({ favoriteGroups, apiBaseUrl }: { favoriteGroups: FavoriteGroup[]; apiBaseUrl: string }) {
  const apiBase = apiBaseUrl;
  const groupSlugs = favoriteGroups.map((g) => g.groupSlug).join(",");
  const hasGroups = favoriteGroups.length > 0;

  const allEventsRss = `${apiBase}/rss`;
  const allEventsIcal = `${apiBase}/ics`;
  const favoritesRss = hasGroups ? `${apiBase}/rss?groups=${groupSlugs}` : null;
  const favoritesIcal = hasGroups ? `${apiBase}/ics?groups=${groupSlugs}` : null;

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Event Feeds</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscribe to event feeds in your calendar app or RSS reader.
        </p>
      </div>

      {hasGroups && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Your Favorites ({favoriteGroups.length} group{favoriteGroups.length !== 1 ? "s" : ""})
          </h4>
          <div className="space-y-3">
            <CopyableUrl label="RSS Feed (favorites only)" url={favoritesRss!} />
            <CopyableUrl label="iCalendar Feed (favorites only)" url={favoritesIcal!} />
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
          All Events
        </h4>
        <div className="space-y-3">
          <CopyableUrl label="RSS Feed (all events)" url={allEventsRss} />
          <CopyableUrl label="iCalendar Feed (all events)" url={allEventsIcal} />
        </div>
      </div>

      {!hasGroups && (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          Favorite some groups to get a personalized feed with only events from groups you follow.
        </p>
      )}
    </div>
  );
}

const PROFILE_TABS = [
  { id: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "accounts", label: "Accounts", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
  { id: "portfolio", label: "Portfolio", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "achievements", label: "Achievements", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  { id: "developer", label: "Developer", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  { id: "feeds", label: "Feeds", icon: "M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" },
] as const;

export default function ProfilePage() {
  const { user, grants, host, apiBaseUrl, identities, availableProviders, portfolioItems, apiTokens: tokens, achievements, favoriteGroups } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";

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

  const handleHeroUpload = async (url: string) => {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ heroImageUrl: url }),
      });

      if (!response.ok) {
        console.error("Failed to update hero image");
      }
    } catch (error) {
      console.error("Failed to update hero image:", error);
    }

    revalidate();
  };

  const handleHeroRemove = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ heroImageUrl: null }),
      });

      if (!response.ok) {
        console.error("Failed to remove hero image");
      }
    } catch (error) {
      console.error("Failed to remove hero image:", error);
    }

    revalidate();
  };

  const handleThemeColorChange = async (color: string) => {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ themeColor: color }),
      });

      if (!response.ok) {
        console.error("Failed to update theme color");
      }
    } catch (error) {
      console.error("Failed to update theme color:", error);
    }

    revalidate();
  };

  const switchTab = (tabId: string) => {
    if (tabId === "profile") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  };

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
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${currentTab === tab.id
                  ? "border-coral text-coral"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {currentTab === "profile" && (
          <>
            <ProfileVisibilityToggle currentVisibility={user.profileVisibility || "private"} username={user.username} host={host} />

            <ProfileEditForm
              user={user}
              host={host}
              onHeroUpload={handleHeroUpload}
              onHeroRemove={handleHeroRemove}
              onThemeColorChange={handleThemeColorChange}
            />
          </>
        )}

        {currentTab === "accounts" && (
          <>
            <ConnectedAccounts
              identities={identities}
              availableProviders={availableProviders}
              userId={user.id}
              currentEmail={user.email}
            />

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
          </>
        )}

        {currentTab === "portfolio" && (
          <div className="mt-2">
            <PortfolioSection items={portfolioItems} />
          </div>
        )}

        {currentTab === "achievements" && (
          <>
            {achievements.length > 0 && (
              <AchievementsSection
                achievements={achievements}
                showAchievements={user.showAchievements !== false}
              />
            )}
            {user.badges && user.badges.length > 0 && (() => {
              const tierOrder: TrophyTier[] = ['diamond', 'platinum', 'gold', 'silver'];
              const badgeTiers: { tier: TrophyTier; label: string; badges: ProfileBadge[] }[] = [];

              for (const t of tierOrder) {
                const tierBadges = user.badges!.filter((b) => {
                  const bt = getTrophyTier(b.points || 0);
                  return bt?.tier === t;
                });
                tierBadges.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));
                if (tierBadges.length > 0) {
                  const info = getTrophyTier(t === 'diamond' ? 100 : t === 'platinum' ? 50 : t === 'gold' ? 25 : 1);
                  badgeTiers.push({ tier: t, label: info!.label, badges: tierBadges });
                }
              }

              const noTier = user.badges!.filter((b) => !getTrophyTier(b.points || 0));
              noTier.sort((a, b) => (a.rarity?.percentage ?? 100) - (b.rarity?.percentage ?? 100));

              return (
                <section className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Badges
                  </h2>
                  <div className="space-y-4">
                    {badgeTiers.map(({ tier, label, badges }) => (
                      <div key={tier}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrophyIcon tier={tier} size={14} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {badges.map((badge) => (
                            <BadgePillWithPopover key={badge.id} badge={badge} />
                          ))}
                        </div>
                      </div>
                    ))}
                    {noTier.length > 0 && (
                      <div>
                        {badgeTiers.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Other
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {noTier.map((badge) => (
                            <BadgePillWithPopover key={badge.id} badge={badge} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}
            {achievements.length === 0 && (!user.badges || user.badges.length === 0) && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete activities to earn achievements and badges.
                </p>
              </div>
            )}
          </>
        )}

        {currentTab === "settings" && (
          <section className="mt-6">
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
        )}

        {currentTab === "developer" && (
          <div className="mt-2">
            <ApiTokensSection tokens={tokens} userRole={user.role} />
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/developer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-coral hover:text-coral transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Developer Portal
              </Link>
              <Link
                to="/developer/docs"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-coral hover:text-coral transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                API Documentation
              </Link>
            </div>
          </div>
        )}

        {currentTab === "feeds" && (
          <FeedsSection favoriteGroups={favoriteGroups} apiBaseUrl={apiBaseUrl} />
        )}
      </div>
    </div>
  );
}
