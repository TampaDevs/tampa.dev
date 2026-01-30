/**
 * Public User Profile Page
 *
 * Displays a user's public profile at /p/:username
 */

import { Link, useLoaderData, data } from "react-router";
import { Avatar } from "@tampadevs/react";
import type { Route } from "./+types/p.$username";
import { generateMetaTags } from "~/lib/seo";

interface PublicBadge {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface PublicAchievement {
  key: string;
  name: string;
  description: string;
}

interface PublicProfile {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    discord?: string;
  } | null;
  githubUsername: string | null;
  favoriteGroups: Array<{
    slug: string;
    name: string;
    photoUrl: string | null;
  }>;
  badges?: PublicBadge[];
  achievements?: PublicAchievement[];
  portfolioItems?: Array<{
    id: string;
    title: string;
    description: string | null;
    url: string | null;
    imageUrl: string | null;
  }>;
  memberSince: string;
}

export const meta: Route.MetaFunction = ({ data: loaderData }) => {
  if (!loaderData?.profile) {
    return [{ title: "User Not Found | Tampa.dev" }];
  }

  const profile = loaderData.profile;
  return generateMetaTags({
    title: `${profile.name || profile.username} | Tampa.dev`,
    description: profile.bio || `${profile.name || profile.username}'s profile on Tampa.dev`,
    image: profile.avatarUrl || undefined,
    url: `/p/${profile.username}`,
  });
};

export async function loader({ params }: Route.LoaderArgs) {
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

  const response = await fetch(
    `${apiUrl}/users/${encodeURIComponent(params.username!)}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw data(null, { status: 404 });
  }

  const profile = (await response.json()) as PublicProfile;
  return { profile };
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-coral dark:hover:text-coral transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

export default function PublicProfilePage({ loaderData }: Route.ComponentProps) {
  const { profile } = loaderData;

  const displayName = profile.name || profile.username;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              src={profile.avatarUrl || undefined}
              name={displayName}
              size="lg"
              className="w-24 h-24"
            />
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  {profile.bio}
                </p>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap gap-4 mt-4">
                {profile.githubUsername && (
                  <SocialLink
                    href={`https://github.com/${profile.githubUsername}`}
                    label={`@${profile.githubUsername}`}
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    }
                  />
                )}
                {profile.socialLinks?.twitter && (
                  <SocialLink
                    href={profile.socialLinks.twitter}
                    label="Twitter"
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    }
                  />
                )}
                {profile.socialLinks?.linkedin && (
                  <SocialLink
                    href={profile.socialLinks.linkedin}
                    label="LinkedIn"
                    icon={
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    }
                  />
                )}
                {profile.socialLinks?.website && (
                  <SocialLink
                    href={profile.socialLinks.website}
                    label={new URL(profile.socialLinks.website).hostname}
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    }
                  />
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                Member since{" "}
                {new Date(profile.memberSince).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Badges
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <span
                  key={badge.slug}
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
        {profile.achievements && profile.achievements.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Achievements
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.achievements.map((a) => (
                <span
                  key={a.key}
                  title={a.description}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {a.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Favorite Groups */}
        {profile.favoriteGroups.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Favorite Groups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.favoriteGroups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/groups/${group.slug}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-coral/30 dark:hover:border-coral/30 transition-colors"
                >
                  {group.photoUrl ? (
                    <img
                      src={group.photoUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-400">
                        {group.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {group.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {/* Portfolio */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
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
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
