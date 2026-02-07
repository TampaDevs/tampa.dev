/**
 * Profile Tab — Edit Profile
 *
 * Default tab showing profile visibility toggle, edit form, hero image,
 * theme color, and social links.
 */

import { useFetcher, useRevalidator, useOutletContext, Link } from "react-router";
import { useState, useRef, useCallback } from "react";
import type { Route } from "./+types/profile._index";
import type { ProfileUser, ProfileContext } from "~/lib/profile-types";
import { SocialLinkIcon } from "~/components/SocialLinkIcon";

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

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

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

  return { success: false };
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
      setVisibility(visibility);
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
        const json = await response.json() as { data: { available: boolean; reason?: string } };
        setUsernameStatus(json.data.available ? "available" : "taken");
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

export default function ProfileTab() {
  const { user, host } = useOutletContext<ProfileContext>();
  const { revalidate } = useRevalidator();

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

  return (
    <>
      <ProfileVisibilityToggle
        currentVisibility={user.profileVisibility || "private"}
        username={user.username}
        host={host}
      />

      <ProfileEditForm
        user={user}
        host={host}
        onHeroUpload={handleHeroUpload}
        onHeroRemove={handleHeroRemove}
        onThemeColorChange={handleThemeColorChange}
      />
    </>
  );
}
