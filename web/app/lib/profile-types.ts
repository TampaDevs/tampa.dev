/**
 * Shared types and constants for the profile page and its sub-routes.
 */

export interface OAuthGrant {
  grantId: string;
  clientId: string;
  clientName: string;
  clientUri?: string;
  logoUri?: string;
  scopes: string[];
  grantedAt: string;
}

export interface ProfileBadge {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  points?: number;
  rarity?: { tier: string; percentage: number };
}

export interface ProfileUser {
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

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ApiTokenInfo {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AchievementInfo {
  key: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completedAt: string | null;
  badgeSlug: string | null;
  icon: string | null;
  color: string | null;
  hidden?: boolean;
}

export interface FavoriteGroup {
  groupSlug: string;
  groupName: string;
}

/** Scope display names (shared between accounts and developer tabs) */
export const SCOPE_LABELS: Record<string, string> = {
  openid: "OpenID Connect",
  user: "Profile (full)",
  "read:user": "Profile (read)",
  "user:email": "Email",
  "read:events": "Events",
  "read:groups": "Groups",
  "read:favorites": "Favorites (read)",
  "write:favorites": "Favorites (write)",
  "read:portfolio": "Portfolio (read)",
  "write:portfolio": "Portfolio (write)",
  "manage:groups": "Manage groups",
  "manage:events": "Manage events",
  "manage:checkins": "Manage checkins",
  "manage:badges": "Manage badges",
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

/** Context passed from the profile layout to sub-route tabs via Outlet */
export interface ProfileContext {
  user: ProfileUser;
  host: string;
  apiBaseUrl: string;
}
